-- =============================================================================
-- Phase 6: admin panel
-- Every admin function checks is_admin() first, on top of Row Level Security.
-- =============================================================================

create or replace function public.assert_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the store owner can do this' using errcode = 'insufficient_privilege';
  end if;
end;
$$;
revoke all on function public.assert_admin() from public, anon;
grant execute on function public.assert_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Deals change prices
-- The best live deal for a product (on the product itself, its category or
-- the category's parent), applied to the full price. The storefront shows the
-- lower of this and the sale price. Exposed to the API as products.deal_price.
-- ---------------------------------------------------------------------------

create or replace function public.deal_price(p public.products)
returns integer
language sql
stable
set search_path = ''
as $$
  select min(
    case d.type
      when 'percentage' then p.price - floor(p.price * d.value / 100.0)::integer
      else greatest(0, p.price - d.value)
    end
  )
  from public.deals d
  where d.is_active
    and d.starts_at <= now()
    and (d.ends_at is null or d.ends_at > now())
    and (
      d.product_id = p.id
      or d.category_id = p.category_id
      or d.category_id = (select c.parent_id from public.categories c where c.id = p.category_id)
    );
$$;
grant execute on function public.deal_price(public.products) to anon, authenticated, service_role;

-- Search results use product_json; include the deal price there too.
create or replace function public.product_json(p public.products)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'slug', p.slug,
    'description', p.description,
    'category_id', p.category_id,
    'type', p.type,
    'price', p.price,
    'sale_price', p.sale_price,
    'deal_price', public.deal_price(p),
    'stock', p.stock,
    'tags', to_jsonb(p.tags),
    'is_featured', p.is_featured,
    'sales_count', p.sales_count,
    'dimensions', p.dimensions,
    'created_at', p.created_at,
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('url', i.url, 'alt', i.alt, 'sort_order', i.sort_order) order by i.sort_order)
      from public.product_images i where i.product_id = p.id
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'price_delta', v.price_delta, 'stock', v.stock) order by v.price_delta, v.name)
      from public.product_variants v where v.product_id = p.id
    ), '[]'::jsonb),
    'category', (
      select jsonb_build_object('name', c.name, 'slug', c.slug)
      from public.categories c where c.id = p.category_id
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Dashboard numbers (all in Indian time)
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  today_start timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  result jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'today', (
      select jsonb_build_object('revenue', coalesce(sum(total), 0), 'orders', count(*))
      from public.orders where payment_status = 'paid' and status <> 'cancelled' and paid_at >= today_start
    ),
    'month', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0),
        'orders', count(*),
        'average', coalesce(round(avg(total))::integer, 0)
      )
      from public.orders where payment_status = 'paid' and status <> 'cancelled' and paid_at >= month_start
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'revenue', d.revenue, 'orders', d.orders) order by d.day), '[]'::jsonb)
      from (
        select g.day::date as day,
               coalesce(sum(o.total), 0)::integer as revenue,
               count(o.id)::integer as orders
        from generate_series(
               (now() at time zone 'Asia/Kolkata')::date - 13,
               (now() at time zone 'Asia/Kolkata')::date,
               interval '1 day'
             ) as g(day)
        left join public.orders o
               on o.payment_status = 'paid' and o.status <> 'cancelled'
              and (o.paid_at at time zone 'Asia/Kolkata')::date = g.day::date
        group by g.day
      ) d
    ),
    'to_pack', (
      select coalesce(jsonb_agg(t order by t.paid_at), '[]'::jsonb)
      from (
        select id, order_number, status, total, paid_at, shipping_address ->> 'name' as name, stock_short
        from public.orders
        where payment_status = 'paid' and status in ('placed', 'confirmed')
        order by paid_at
        limit 20
      ) t
    ),
    'to_pack_count', (
      select count(*) from public.orders where payment_status = 'paid' and status in ('placed', 'confirmed')
    ),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.qty desc, t.revenue desc), '[]'::jsonb)
      from (
        select oi.product_id, min(oi.name_snapshot) as name, sum(oi.qty)::integer as qty,
               sum(oi.qty * oi.price_snapshot)::integer as revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        where o.payment_status = 'paid' and o.status <> 'cancelled' and o.paid_at >= month_start
        group by oi.product_id
        order by sum(oi.qty) desc
        limit 5
      ) t
    ),
    'low_stock', (
      select coalesce(jsonb_agg(t order by t.stock, t.name), '[]'::jsonb)
      from (
        select p.id, p.name, p.type, p.stock, null::text as variant
        from public.products p
        where p.is_active and p.stock <= 3
          and not exists (select 1 from public.product_variants v where v.product_id = p.id)
        union all
        select p.id, p.name, p.type, v.stock, v.name
        from public.product_variants v
        join public.products p on p.id = v.product_id
        where p.is_active and v.stock <= 3
        order by 4, 2
        limit 15
      ) t
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Customers: registered accounts plus guests who paid, one row per email
-- SECURITY DEFINER to read sign-up emails (auth.users); the admin check comes first.
-- ---------------------------------------------------------------------------

create or replace function public.admin_customers(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  email text,
  full_name text,
  phone text,
  user_id uuid,
  registered boolean,
  joined_at timestamptz,
  orders integer,
  lifetime_value integer,
  last_order_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  with people as (
    select lower(u.email) as email, p.full_name, p.phone, u.id as user_id, true as registered, u.created_at as joined_at
    from auth.users u
    join public.profiles p on p.user_id = u.id
    where p.role = 'customer'
    union all
    -- Guests: one row per email, using the details from their latest order.
    select g.* from (
      select distinct on (lower(o.email))
             lower(o.email) as email, o.shipping_address ->> 'name' as full_name, o.phone, null::uuid as user_id,
             false as registered, min(o.created_at) over (partition by lower(o.email)) as joined_at
      from public.orders o
      where o.user_id is null and o.payment_status = 'paid'
        and not exists (select 1 from auth.users u where lower(u.email) = lower(o.email))
      order by lower(o.email), o.created_at desc
    ) g
  ),
  stats as (
    select lower(o.email) as email, count(*)::integer as orders, coalesce(sum(o.total), 0)::integer as ltv, max(o.paid_at) as last_at
    from public.orders o
    where o.payment_status = 'paid' and o.status <> 'cancelled'
    group by lower(o.email)
  ),
  filtered as (
    select pe.*, coalesce(s.orders, 0) as orders, coalesce(s.ltv, 0) as ltv, s.last_at
    from people pe
    left join stats s on s.email = pe.email
    where p_search is null or p_search = ''
       or pe.email ilike '%' || p_search || '%'
       or coalesce(pe.full_name, '') ilike '%' || p_search || '%'
       or coalesce(pe.phone, '') like '%' || regexp_replace(p_search, '\D', '', 'g') || '%' and regexp_replace(p_search, '\D', '', 'g') <> ''
  )
  select f.email, f.full_name, f.phone, f.user_id, f.registered, f.joined_at, f.orders, f.ltv, f.last_at,
         count(*) over ()
  from filtered f
  order by f.ltv desc, f.last_at desc nulls last, f.joined_at desc
  limit least(greatest(p_limit, 1), 1000) offset greatest(p_offset, 0);
end;
$$;
revoke all on function public.admin_customers(text, integer, integer) from public, anon;
grant execute on function public.admin_customers(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Move an order on. Records who changed it and when (order_status_history).
--    Cancelling can put the items back in stock.
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null,
  p_restock boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  o public.orders;
  item record;
begin
  perform public.assert_admin();
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.payment_status not in ('paid', 'refunded') then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;
  if o.status = p_status then
    return;
  end if;

  update public.orders set status = p_status where id = o.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (o.id, p_status, nullif(left(btrim(coalesce(p_note, '')), 500), ''), auth.uid());

  if p_status = 'cancelled' and p_restock then
    for item in
      select oi.product_id, oi.variant_id, sum(oi.qty)::integer as qty
        from public.order_items oi where oi.order_id = o.id and oi.product_id is not null
       group by oi.product_id, oi.variant_id
    loop
      if item.variant_id is not null then
        update public.product_variants set stock = stock + item.qty where id = item.variant_id;
      else
        update public.products set stock = stock + item.qty
         where id = item.product_id
           and not exists (select 1 from public.product_variants v where v.product_id = item.product_id);
      end if;
      update public.products set sales_count = greatest(0, sales_count - item.qty) where id = item.product_id;
    end loop;
  end if;
end;
$$;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text, boolean) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Save a product with its options (sizes) and photos in one go, so a
--    half-saved product can't happen.
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_product(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  pid uuid := nullif(p ->> 'id', '')::uuid;
  keep uuid[];
  v jsonb;
  img jsonb;
  n integer := 0;
begin
  perform public.assert_admin();

  if pid is null then
    insert into public.products (name, slug, description, category_id, type, price, sale_price, stock, sku, tags,
                                 is_featured, is_active, weight_g, dimensions)
    values (
      p ->> 'name', p ->> 'slug', coalesce(p ->> 'description', ''), nullif(p ->> 'category_id', '')::uuid,
      (p ->> 'type')::public.product_type, (p ->> 'price')::integer, nullif(p ->> 'sale_price', '')::integer,
      coalesce(nullif(p ->> 'stock', '')::integer, 0), nullif(p ->> 'sku', ''),
      coalesce(array(select jsonb_array_elements_text(p -> 'tags')), '{}'),
      coalesce((p ->> 'is_featured')::boolean, false), coalesce((p ->> 'is_active')::boolean, true),
      nullif(p ->> 'weight_g', '')::integer, nullif(p ->> 'dimensions', '')
    )
    returning id into pid;
  else
    update public.products set
      name = p ->> 'name',
      slug = p ->> 'slug',
      description = coalesce(p ->> 'description', ''),
      category_id = nullif(p ->> 'category_id', '')::uuid,
      type = (p ->> 'type')::public.product_type,
      price = (p ->> 'price')::integer,
      sale_price = nullif(p ->> 'sale_price', '')::integer,
      stock = coalesce(nullif(p ->> 'stock', '')::integer, 0),
      sku = nullif(p ->> 'sku', ''),
      tags = coalesce(array(select jsonb_array_elements_text(p -> 'tags')), '{}'),
      is_featured = coalesce((p ->> 'is_featured')::boolean, false),
      is_active = coalesce((p ->> 'is_active')::boolean, true),
      weight_g = nullif(p ->> 'weight_g', '')::integer,
      dimensions = nullif(p ->> 'dimensions', '')
    where id = pid;
    if not found then
      raise exception 'Product not found' using errcode = 'no_data_found';
    end if;
  end if;

  -- Options: keep the ones still listed (by id), add new ones, remove the rest.
  keep := array(
    select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'variants', '[]')) e
    where nullif(e ->> 'id', '') is not null
  );
  delete from public.product_variants where product_id = pid and not (id = any (keep));
  for v in select * from jsonb_array_elements(coalesce(p -> 'variants', '[]')) loop
    if nullif(v ->> 'id', '') is not null then
      update public.product_variants
         set name = v ->> 'name', price_delta = (v ->> 'price_delta')::integer,
             stock = (v ->> 'stock')::integer, sku = nullif(v ->> 'sku', '')
       where id = (v ->> 'id')::uuid and product_id = pid;
    else
      insert into public.product_variants (product_id, name, price_delta, stock, sku)
      values (pid, v ->> 'name', (v ->> 'price_delta')::integer, (v ->> 'stock')::integer, nullif(v ->> 'sku', ''));
    end if;
  end loop;

  -- Photos: saved in the order given (the first is the main photo).
  delete from public.product_images where product_id = pid;
  for img in select * from jsonb_array_elements(coalesce(p -> 'images', '[]')) loop
    insert into public.product_images (product_id, url, alt, sort_order)
    values (pid, img ->> 'url', coalesce(img ->> 'alt', ''), n);
    n := n + 1;
  end loop;

  return pid;
end;
$$;
revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;

-- A copy to start a similar product from: hidden until edited and shown.
create or replace function public.admin_duplicate_product(p_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  src public.products;
  nid uuid;
  new_slug text;
  i integer := 1;
begin
  perform public.assert_admin();
  select * into src from public.products where id = p_id;
  if not found then
    raise exception 'Product not found' using errcode = 'no_data_found';
  end if;
  loop
    new_slug := left(src.slug, 110) || '-copy' || case when i > 1 then '-' || i else '' end;
    exit when not exists (select 1 from public.products where slug = new_slug);
    i := i + 1;
  end loop;

  insert into public.products (name, slug, description, category_id, type, price, sale_price, stock, sku, tags,
                               is_featured, is_active, weight_g, dimensions)
  values (src.name || ' (copy)', new_slug, src.description, src.category_id, src.type, src.price, src.sale_price,
          case when exists (select 1 from public.product_variants where product_id = src.id) then 0 else src.stock end,
          null, src.tags, false, false, src.weight_g, src.dimensions)
  returning id into nid;

  insert into public.product_variants (product_id, name, price_delta, stock, sku)
  select nid, name, price_delta, stock, null from public.product_variants where product_id = src.id;
  insert into public.product_images (product_id, url, alt, sort_order)
  select nid, url, alt, sort_order from public.product_images where product_id = src.id;
  return nid;
end;
$$;
revoke all on function public.admin_duplicate_product(uuid) from public, anon;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Save an edition (collection) with its products in one go
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_collection(c jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  cid uuid := nullif(c ->> 'id', '')::uuid;
begin
  perform public.assert_admin();
  if cid is null then
    insert into public.collections (name, slug, description, banner_image, starts_at, ends_at, is_active)
    values (c ->> 'name', c ->> 'slug', coalesce(c ->> 'description', ''), nullif(c ->> 'banner_image', ''),
            nullif(c ->> 'starts_at', '')::timestamptz, nullif(c ->> 'ends_at', '')::timestamptz,
            coalesce((c ->> 'is_active')::boolean, true))
    returning id into cid;
  else
    update public.collections set
      name = c ->> 'name', slug = c ->> 'slug', description = coalesce(c ->> 'description', ''),
      banner_image = nullif(c ->> 'banner_image', ''),
      starts_at = nullif(c ->> 'starts_at', '')::timestamptz, ends_at = nullif(c ->> 'ends_at', '')::timestamptz,
      is_active = coalesce((c ->> 'is_active')::boolean, true)
    where id = cid;
    if not found then
      raise exception 'Edition not found' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.collection_products where collection_id = cid
    and not (product_id = any (array(select (jsonb_array_elements_text(coalesce(c -> 'product_ids', '[]')))::uuid)));
  insert into public.collection_products (collection_id, product_id)
  select cid, x::uuid from jsonb_array_elements_text(coalesce(c -> 'product_ids', '[]')) x
  on conflict (collection_id, product_id) do nothing;
  return cid;
end;
$$;
revoke all on function public.admin_save_collection(jsonb) from public, anon;
grant execute on function public.admin_save_collection(jsonb) to authenticated;

