-- =============================================================================
-- Row Level Security: customers see only their own data, admin sees everything.
-- Orders, order items, status history and stock changes are written by the
-- server with the service-role key (which bypasses RLS) after verifying payment.
-- =============================================================================

-- True when the signed-in user has profiles.role = 'admin'.
-- SECURITY DEFINER so it can read profiles without recursing through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Customers may edit their own profile, but never their role.
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();

-- Enable RLS on every table -------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.addresses            enable row level security;
alter table public.categories           enable row level security;
alter table public.collections          enable row level security;
alter table public.products             enable row level security;
alter table public.product_images       enable row level security;
alter table public.product_variants     enable row level security;
alter table public.collection_products  enable row level security;
alter table public.deals                enable row level security;
alter table public.carts                enable row level security;
alter table public.cart_items           enable row level security;
alter table public.saved_items          enable row level security;
alter table public.coupons              enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.store_settings       enable row level security;
alter table public.events               enable row level security;

-- Admin can do everything on every table ------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'collections', 'products', 'product_images',
    'product_variants', 'collection_products', 'deals', 'carts', 'cart_items', 'saved_items',
    'coupons', 'orders', 'order_items', 'order_status_history', 'store_settings', 'events'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      'admin_all_' || t, t
    );
  end loop;
end;
$$;

-- Public catalogue (anyone, including guests) -------------------------------

create policy "public_read_categories" on public.categories
  for select to anon, authenticated using (true);

create policy "public_read_active_collections" on public.collections
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

create policy "public_read_active_products" on public.products
  for select to anon, authenticated using (is_active);

create policy "public_read_product_images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

create policy "public_read_product_variants" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));

create policy "public_read_collection_products" on public.collection_products
  for select to anon, authenticated using (true);

create policy "public_read_active_deals" on public.deals
  for select to anon, authenticated
  using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));

-- Settings hold nothing secret (WhatsApp number, shipping rates, banner text).
create policy "public_read_store_settings" on public.store_settings
  for select to anon, authenticated using (true);

-- Coupons: no public read, so codes cannot be listed. Validated on the server.

-- Own data -------------------------------------------------------------------

create policy "own_profile_select" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own_profile_update" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own_addresses" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own_cart" on public.carts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own_cart_items" on public.cart_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid()))
  );

create policy "own_saved_items" on public.saved_items
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Orders are read-only for customers. Guest tracking (order number + email)
-- goes through a server route, not direct table access.
create policy "own_orders_select" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own_order_items_select" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

create policy "own_order_history_select" on public.order_status_history
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- Analytics: anyone may write events (never read them); a signed-in user can
-- only attach their own user_id.
create policy "insert_events" on public.events
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
