-- =============================================================================
-- Phase 2: product search, variant stock sync, tighter write paths
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Search
-- The english vector (Phase 1) stems words, so "hampers" finds "hamper". But
-- stems break prefix matching while someone is still typing ("chocolat" is not
-- a prefix of the stem "chocol"), so we also keep an unstemmed 'simple' vector
-- and match either one.
-- ---------------------------------------------------------------------------

alter table public.products
  add column search_vector_simple tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', public.immutable_array_to_string(tags)), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored;

create index products_search_simple_idx on public.products using gin (search_vector_simple);

-- One product as JSON, in the same shape the storefront reads elsewhere.
-- SECURITY INVOKER: Row Level Security still decides what the caller can see.
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

-- Full-text search with "as you type" prefix matching, best matches first.
-- Searches name, description and tags, plus the category name ("gift" finds
-- Gift Hampers). Products matching EVERY word win; if none do, products
-- matching ANY word are returned instead. Input is split on anything that
-- isn't a letter or digit, so it can never inject tsquery syntax.
create or replace function public.search_products(search_query text, max_results integer default 24)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with words as (
    select w
    from unnest(regexp_split_to_array(lower(left(coalesce(search_query, ''), 100)), '[^[:alnum:]]+')) as w
    where w <> ''
    limit 8
  ),
  q as (
    select to_tsquery('english', string_agg(w || ':*', ' & ')) as en_all,
           to_tsquery('simple',  string_agg(w || ':*', ' & ')) as si_all,
           to_tsquery('english', string_agg(w || ':*', ' | ')) as en_any,
           to_tsquery('simple',  string_agg(w || ':*', ' | ')) as si_any
    from words
    having count(*) > 0
  ),
  candidates as (
    select p.id,
           p.search_vector || setweight(to_tsvector('english', coalesce(c.name, '')), 'B') as en,
           p.search_vector_simple || setweight(to_tsvector('simple', coalesce(c.name, '')), 'B') as si
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.is_active
  ),
  all_hits as (
    select k.id, greatest(ts_rank(k.en, q.en_all), ts_rank(k.si, q.si_all)) as rank
    from candidates k cross join q
    where k.en @@ q.en_all or k.si @@ q.si_all
  ),
  any_hits as (
    select k.id, greatest(ts_rank(k.en, q.en_any), ts_rank(k.si, q.si_any)) as rank
    from candidates k cross join q
    where not exists (select 1 from all_hits)
      and (k.en @@ q.en_any or k.si @@ q.si_any)
  ),
  hits as (
    select * from all_hits
    union all
    select * from any_hits
  ),
  best as (
    select h.id, h.rank
    from hits h
    join public.products p on p.id = h.id
    order by h.rank desc, p.sales_count desc, p.name
    limit least(greatest(coalesce(max_results, 24), 1), 50)
  )
  select coalesce(
    jsonb_agg(public.product_json(p) order by t.rank desc, p.sales_count desc, p.name),
    '[]'::jsonb
  )
  from best t
  join public.products p on p.id = t.id;
$$;

grant execute on function public.search_products(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Stock for products with variants (e.g. print sizes)
-- When a product has variants, each variant's stock is the source of truth and
-- products.stock is kept equal to their total, so "in stock" filters stay right.
-- ---------------------------------------------------------------------------

create or replace function public.product_variants_sync_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected uuid[];
  pid uuid;
begin
  affected := case tg_op
    when 'INSERT' then array[new.product_id]
    when 'DELETE' then array[old.product_id]
    else array[old.product_id, new.product_id]
  end;

  foreach pid in array affected loop
    update public.products p
       set stock = totals.total
      from (
        select coalesce(sum(v.stock), 0)::integer as total, count(*) as variant_count
        from public.product_variants v
        where v.product_id = pid
      ) totals
     where p.id = pid
       and totals.variant_count > 0
       and p.stock is distinct from totals.total;
  end loop;

  return null;
end;
$$;

create trigger product_variants_sync_stock
  after insert or delete or update of stock, product_id on public.product_variants
  for each row execute function public.product_variants_sync_stock();

-- ---------------------------------------------------------------------------
-- 3. Tighter write paths
-- ---------------------------------------------------------------------------

-- Analytics events now arrive only through the server route /api/events, which
-- validates every event and strips personal data before writing it with the
-- service role. Direct inserts with the public key are no longer allowed.
drop policy if exists "insert_events" on public.events;

-- Only the server (service role) creates orders, so nobody else should be able
-- to call this and burn order numbers.
revoke execute on function public.next_order_number() from public, anon, authenticated;
