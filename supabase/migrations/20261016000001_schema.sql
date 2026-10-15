-- =============================================================================
-- Yours Crafts Woman — core schema
-- Money is stored as INTEGER PAISE everywhere (₹1 = 100 paise).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- array_to_string is not IMMUTABLE, so it cannot be used in a generated column
-- directly. This wrapper is safe because we only ever pass text[].
create or replace function public.immutable_array_to_string(text[])
returns text
language sql
immutable
parallel safe
as $$ select coalesce(array_to_string($1, ' '), '') $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('customer', 'admin');
create type public.product_type as enum ('product', 'original_art', 'print');
create type public.order_status as enum ('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.discount_type as enum ('percentage', 'flat');

-- ---------------------------------------------------------------------------
-- Profiles & addresses
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  banner_image text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  type public.product_type not null default 'product',
  price integer not null check (price >= 0),
  sale_price integer check (sale_price is null or (sale_price >= 0 and sale_price < price)),
  stock integer not null default 0 check (stock >= 0),
  sku text unique,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  weight_g integer check (weight_g is null or weight_g >= 0),
  dimensions text,
  -- Units sold across paid orders; drives the "popular" sort. Updated on payment (Phase 4).
  sales_count integer not null default 0 check (sales_count >= 0),
  -- What the customer pays per unit before coupons; used for price filters/sorting.
  effective_price integer generated always as (coalesce(sale_price, price)) stored,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', public.immutable_array_to_string(tags)), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);
create index products_type_idx on public.products (type);
create index products_active_created_idx on public.products (is_active, created_at desc);
create index products_effective_price_idx on public.products (effective_price);
create index products_search_idx on public.products using gin (search_vector);
create index products_tags_idx on public.products using gin (tags);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_images_product_id_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  price_delta integer not null default 0,
  stock integer not null default 0 check (stock >= 0),
  sku text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_id_idx on public.product_variants (product_id);

create table public.collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, product_id)
);
create index collection_products_product_id_idx on public.collection_products (product_id);

-- Time-boxed discounts on a product OR a category (admin "Deals", CLAUDE.md §6).
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.discount_type not null,
  value integer not null check (value > 0), -- percentage points, or paise when flat
  product_id uuid references public.products (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(product_id, category_id) = 1),
  check (type <> 'percentage' or value <= 90)
);

-- ---------------------------------------------------------------------------
-- Cart & saved items
-- ---------------------------------------------------------------------------

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  qty integer not null check (qty between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index cart_items_unique_line
  on public.cart_items (cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  type public.discount_type not null,
  value integer not null check (value > 0),
  min_order integer not null default 0 check (min_order >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percentage' or value <= 90)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

-- YCW-2026-00001 style, using the year the order was placed.
create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
  select 'YCW-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
         lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.next_order_number(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  phone text not null,
  shipping_address jsonb not null,
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  total integer not null check (total >= 0),
  coupon_code text,
  status public.order_status not null default 'placed',
  payment_status public.payment_status not null default 'pending',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  courier text,
  tracking_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = subtotal - discount + shipping_fee)
);
create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_email_idx on public.orders (lower(email));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  name_snapshot text not null,
  price_snapshot integer not null check (price_snapshot >= 0),
  qty integer not null check (qty > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_status_history_order_id_idx on public.order_status_history (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Settings & analytics
-- ---------------------------------------------------------------------------

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null check (length(session_id) between 8 and 64),
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null check (event_name in (
    'page_view', 'product_view', 'search', 'add_to_cart', 'remove_from_cart',
    'save_for_later', 'begin_checkout', 'payment_success', 'payment_failed'
  )),
  product_id uuid references public.products (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_name_created_idx on public.events (event_name, created_at);
create index events_session_idx on public.events (session_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers on every table
-- ---------------------------------------------------------------------------

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
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- New sign-ups get a profile automatically
-- ---------------------------------------------------------------------------

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
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
