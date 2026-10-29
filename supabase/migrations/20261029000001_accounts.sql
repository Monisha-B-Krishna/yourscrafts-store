-- =============================================================================
-- Phase 3: accounts — profile rules, saved addresses, and the database cart
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles: phone is a 10-digit Indian mobile number (no +91), name is short
-- ---------------------------------------------------------------------------

update public.profiles set phone = null where phone is not null and phone !~ '^[6-9][0-9]{9}$';
update public.profiles set full_name = left(btrim(full_name), 100) where full_name is not null;

alter table public.profiles
  add constraint profiles_phone_format check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  add constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 100);

-- "+91 98765 43210", "098765 43210" and "9876543210" all become "9876543210".
-- Anything that still isn't a valid mobile number becomes null.
create or replace function public.normalise_in_phone(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when d ~ '^[6-9][0-9]{9}$' then d end
  from (
    select regexp_replace(regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g'), '^(91|0)(?=[6-9][0-9]{9}$)', '') as d
  ) s;
$$;

-- Sign-up details arrive as user metadata, which anyone can set, so clean them
-- here instead of trusting them. Bad values are dropped, never a failed sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, phone)
  values (
    new.id,
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 100), ''),
    public.normalise_in_phone(new.raw_user_meta_data ->> 'phone')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Addresses: sensible lengths, at most 20 each, exactly one default
-- ---------------------------------------------------------------------------

alter table public.addresses
  add constraint addresses_name_length  check (char_length(name)  between 1 and 100),
  add constraint addresses_line1_length check (char_length(line1) between 1 and 200),
  add constraint addresses_line2_length check (line2 is null or char_length(line2) <= 200),
  add constraint addresses_city_length  check (char_length(city)  between 1 and 80),
  add constraint addresses_state_length check (char_length(state) between 1 and 60);

create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;

-- Keeps the "one default address" rule however an address is added or changed:
-- the first address becomes the default, and choosing a new default clears the old one.
-- SECURITY INVOKER: Row Level Security still limits it to the customer's own rows.
create or replace function public.addresses_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.addresses where user_id = new.user_id) >= 20 then
      raise exception 'You can save up to 20 addresses' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.addresses where user_id = new.user_id) then
      new.is_default := true;
    end if;
  end if;

  if new.is_default and (tg_op = 'INSERT' or not old.is_default) then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and is_default and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger addresses_before_write
  before insert or update of is_default on public.addresses
  for each row execute function public.addresses_before_write();

-- Deleting the default address makes the most recently added one the default.
create or replace function public.addresses_after_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    update public.addresses
       set is_default = true
     where id = (
       select id from public.addresses
        where user_id = old.user_id
        order by created_at desc
        limit 1
     );
  end if;
  return old;
end;
$$;

create trigger addresses_after_delete
  after delete on public.addresses
  for each row execute function public.addresses_after_delete();

-- ---------------------------------------------------------------------------
-- 3. The database cart (signed-in customers)
-- The browser keeps a copy of the cart; these keep the database in step.
--   mode 'merge'   — add the given lines to the saved cart (used once, at login,
--                    to bring a guest cart across). Quantities add up.
--   mode 'replace' — make the saved cart exactly the given lines.
-- Lines for unknown or archived products are skipped. Returns the saved cart.
-- SECURITY INVOKER, so Row Level Security applies as for any customer write.
-- ---------------------------------------------------------------------------

create or replace function public.sync_cart(items jsonb, mode text default 'merge')
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  cid uuid;
  nil constant uuid := '00000000-0000-0000-0000-000000000000';
begin
  if uid is null then
    raise exception 'Sign in to save a cart' using errcode = 'insufficient_privilege';
  end if;
  if mode not in ('merge', 'replace') then
    raise exception 'Unknown cart sync mode %', mode;
  end if;
  if items is null or jsonb_typeof(items) <> 'array' then
    items := '[]'::jsonb;
  end if;

  insert into public.carts (user_id) values (uid) on conflict (user_id) do nothing;
  select id into cid from public.carts where user_id = uid;

  create temporary table if not exists pg_temp.incoming (
    product_id uuid not null, variant_id uuid, qty integer not null, pos integer not null
  ) on commit drop;
  truncate pg_temp.incoming;

  -- Keep valid lines only (well-formed ids, live product, matching option),
  -- combining duplicates, up to 50 lines.
  insert into pg_temp.incoming (product_id, variant_id, qty, pos)
  select l.product_id, l.variant_id, least(99, sum(l.qty))::integer, min(l.n)::integer
  from (
    select n,
           (e ->> 'productId')::uuid as product_id,
           nullif(e ->> 'variantId', '')::uuid as variant_id,
           greatest(1, least(99, floor((e ->> 'qty')::numeric)))::integer as qty
    from jsonb_array_elements(items) with ordinality as t(e, n)
    where jsonb_typeof(e) = 'object'
      and (e ->> 'productId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and coalesce(e ->> 'variantId', '') ~* '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$'
      and (e ->> 'qty') ~ '^[0-9]{1,6}(\.[0-9]+)?$'
      and n <= 50
  ) l
  join public.products p on p.id = l.product_id and p.is_active
  where l.variant_id is null
     or exists (select 1 from public.product_variants v where v.id = l.variant_id and v.product_id = l.product_id)
  group by l.product_id, l.variant_id;

  if mode = 'replace' then
    delete from public.cart_items ci
     where ci.cart_id = cid
       and not exists (
         select 1 from pg_temp.incoming i
          where i.product_id = ci.product_id and coalesce(i.variant_id, nil) = coalesce(ci.variant_id, nil)
       );
  end if;

  -- New lines keep the customer's order (created_at steps by a microsecond each).
  insert into public.cart_items (cart_id, user_id, product_id, variant_id, qty, created_at)
  select cid, uid, i.product_id, i.variant_id, i.qty, now() + make_interval(secs => i.pos / 1000000.0)
  from pg_temp.incoming i
  on conflict (cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set qty = case when mode = 'replace' then excluded.qty
                           else least(99, public.cart_items.qty + excluded.qty) end;

  -- A cart holds at most 50 lines; the oldest ones are kept.
  delete from public.cart_items
   where cart_id = cid
     and id not in (select id from public.cart_items where cart_id = cid order by created_at, id limit 50);

  return coalesce((
    select jsonb_agg(jsonb_build_object('productId', ci.product_id, 'variantId', ci.variant_id, 'qty', ci.qty)
                     order by ci.created_at, ci.id)
      from public.cart_items ci
      join public.products p on p.id = ci.product_id and p.is_active
     where ci.cart_id = cid
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.sync_cart(jsonb, text) from public, anon;
grant execute on function public.sync_cart(jsonb, text) to authenticated;
