-- =============================================================================
-- Phase 4: checkout & payments
-- Orders are created by the server (service role) with prices it worked out
-- itself, paid through Razorpay, then marked paid by mark_order_paid(), which
-- also reduces stock — all in one transaction.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Orders get their customer-facing number only once paid, so abandoned
--    checkouts never leave gaps in YCW-2026-00001, 00002, …
-- ---------------------------------------------------------------------------

alter table public.orders
  alter column order_number drop default,
  alter column order_number drop not null,
  add constraint orders_paid_has_number check (payment_status <> 'paid' or order_number is not null),
  -- Secret part of the confirmation link (/checkout/success?order=…&key=…), so
  -- guests can see their own order without an account.
  add column access_key uuid not null default gen_random_uuid(),
  -- The shopper's analytics session, so payment events join up with the rest
  -- of their visit. Not personal data (a random id).
  add column checkout_session_id text check (checkout_session_id is null or checkout_session_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  add column paid_at timestamptz,
  -- Set when the last unit sold out between "Pay" and payment (rare). The
  -- owner then refunds or offers an alternative.
  add column stock_short boolean not null default false;

create index orders_payment_status_idx on public.orders (payment_status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Create a pending (unpaid) order with its items, atomically.
--    The server has already priced everything; this only stores it.
-- ---------------------------------------------------------------------------

create or replace function public.create_pending_order(order_row jsonb, items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  oid uuid;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'An order needs at least one item';
  end if;

  insert into public.orders (
    user_id, email, phone, shipping_address, subtotal, discount, shipping_fee, total,
    coupon_code, checkout_session_id
  ) values (
    nullif(order_row ->> 'user_id', '')::uuid,
    order_row ->> 'email',
    order_row ->> 'phone',
    order_row -> 'shipping_address',
    (order_row ->> 'subtotal')::integer,
    (order_row ->> 'discount')::integer,
    (order_row ->> 'shipping_fee')::integer,
    (order_row ->> 'total')::integer,
    nullif(order_row ->> 'coupon_code', ''),
    nullif(order_row ->> 'checkout_session_id', '')
  )
  returning id into oid;

  insert into public.order_items (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty)
  select oid,
         (i ->> 'product_id')::uuid,
         nullif(i ->> 'variant_id', '')::uuid,
         i ->> 'name',
         (i ->> 'price')::integer,
         (i ->> 'qty')::integer
  from jsonb_array_elements(items) as t(i);

  return oid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mark an order paid. Safe to call many times (the browser's confirmation
--    and Razorpay's webhook both call it); only the first call does anything.
--    In one transaction it:
--      - checks the amount paid matches the order total
--      - gives the order its number and records the payment
--      - reduces stock (never below zero; flags the order if it ran short)
--      - counts the coupon use and units sold
--      - adds "Placed" to the order's history and logs payment_success
-- ---------------------------------------------------------------------------

create or replace function public.mark_order_paid(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount integer default null
)
returns table (order_id uuid, order_number text, access_key uuid, newly_paid boolean, stock_short boolean)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  o public.orders;
  item record;
  short boolean := false;
  available integer;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found then
    raise exception 'No order for Razorpay order %', p_razorpay_order_id using errcode = 'no_data_found';
  end if;

  -- Already handled (a refunded order was paid once, too): never count it twice.
  if o.payment_status in ('paid', 'refunded') then
    return query select o.id, o.order_number, o.access_key, false, o.stock_short;
    return;
  end if;

  if p_amount is not null and p_amount <> o.total then
    raise exception 'Amount paid (%) does not match order total (%)', p_amount, o.total;
  end if;

  -- Lock the stock rows in a fixed order so two payments can't deadlock.
  perform 1 from public.products p
   where p.id in (select oi.product_id from public.order_items oi where oi.order_id = o.id)
   order by p.id for update;
  perform 1 from public.product_variants v
   where v.id in (select oi.variant_id from public.order_items oi where oi.order_id = o.id)
   order by v.id for update;

  for item in
    select oi.product_id, oi.variant_id, sum(oi.qty)::integer as qty
      from public.order_items oi
     where oi.order_id = o.id and oi.product_id is not null
     group by oi.product_id, oi.variant_id
  loop
    if item.variant_id is not null then
      select v.stock into available from public.product_variants v where v.id = item.variant_id;
      -- Variant stock; a trigger keeps products.stock equal to the variants' total.
      update public.product_variants set stock = greatest(0, stock - item.qty) where id = item.variant_id;
    else
      select p.stock into available from public.products p where p.id = item.product_id;
      update public.products set stock = greatest(0, stock - item.qty) where id = item.product_id;
    end if;
    if coalesce(available, 0) < item.qty then
      short := true;
    end if;
    update public.products set sales_count = sales_count + item.qty where id = item.product_id;
  end loop;

  update public.orders
     set payment_status = 'paid',
         order_number = public.next_order_number(),
         razorpay_payment_id = p_razorpay_payment_id,
         paid_at = now(),
         stock_short = short,
         notes = case when short
                      then concat_ws(E'\n', notes, 'Stock ran out before payment: refund or offer an alternative.')
                      else notes end
   where id = o.id
  returning * into o;

  if o.coupon_code is not null then
    update public.coupons set used_count = used_count + 1 where code = o.coupon_code;
  end if;

  insert into public.order_status_history (order_id, status, note)
  values (o.id, 'placed', 'Payment received');

  -- Bought items leave the customer's saved cart (on every device).
  if o.user_id is not null then
    delete from public.cart_items ci
     using public.order_items oi
     where oi.order_id = o.id
       and ci.user_id = o.user_id
       and ci.product_id = oi.product_id
       and coalesce(ci.variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = coalesce(oi.variant_id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;

  if o.checkout_session_id is not null then
    insert into public.events (session_id, user_id, event_name, metadata)
    values (
      o.checkout_session_id, o.user_id, 'payment_success',
      jsonb_build_object(
        'order_id', o.id,
        'total', o.total,
        'subtotal', o.subtotal,
        'discount', o.discount,
        'shipping_fee', o.shipping_fee,
        'items', (select coalesce(sum(qty), 0) from public.order_items where order_id = o.id),
        'coupon_used', o.coupon_code is not null
      )
    );
  end if;

  return query select o.id, o.order_number, o.access_key, true, o.stock_short;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Record a failed payment attempt. The order stays open, so the customer
--    can try again. Each Razorpay payment is logged once, however many times
--    it is reported (browser + webhook).
-- ---------------------------------------------------------------------------

create or replace function public.record_payment_failure(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_reason text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where razorpay_order_id = p_razorpay_order_id for update;
  if not found or o.payment_status in ('paid', 'refunded') then
    return;
  end if;

  update public.orders set payment_status = 'failed' where id = o.id and payment_status = 'pending';

  if o.checkout_session_id is not null
     and p_razorpay_payment_id is not null
     and not exists (
       select 1 from public.events e
        where e.event_name = 'payment_failed' and e.metadata ->> 'payment_ref' = p_razorpay_payment_id
     ) then
    insert into public.events (session_id, user_id, event_name, metadata)
    values (
      o.checkout_session_id, o.user_id, 'payment_failed',
      jsonb_build_object(
        'order_id', o.id,
        'total', o.total,
        'payment_ref', p_razorpay_payment_id,
        'reason', left(regexp_replace(coalesce(p_reason, 'unknown'), '[^A-Za-z0-9_]', '', 'g'), 60)
      )
    );
  end if;
end;
$$;

-- A failed attempt can be followed by a successful one on the same order:
-- mark_order_paid accepts 'failed' as well as 'pending'.

-- ---------------------------------------------------------------------------
-- 5. Only the server may call these.
-- ---------------------------------------------------------------------------

revoke all on function public.create_pending_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, text, integer) from public, anon, authenticated;
revoke all on function public.record_payment_failure(text, text, text) from public, anon, authenticated;
grant execute on function public.create_pending_order(jsonb, jsonb) to service_role;
grant execute on function public.mark_order_paid(text, text, integer) to service_role;
grant execute on function public.record_payment_failure(text, text, text) to service_role;
grant execute on function public.next_order_number() to service_role;
