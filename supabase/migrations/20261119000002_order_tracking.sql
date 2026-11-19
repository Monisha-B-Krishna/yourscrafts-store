-- =============================================================================
-- Phase 5: order tracking & emails
-- =============================================================================

-- When the "thank you for your order" email went out (null = not sent, e.g.
-- emails aren't set up yet). Stops it ever being sent twice.
alter table public.orders
  add column confirmation_email_sent_at timestamptz;

-- Guests track an order with its number + email; emails are stored lower-case.
create index orders_number_email_idx on public.orders (order_number, email) where order_number is not null;

-- Only the server may claim an email "slot", so two callers (browser + webhook)
-- can't both send. Returns true for exactly one caller.
create or replace function public.claim_confirmation_email(p_order_id uuid)
returns boolean
language sql
volatile
set search_path = ''
as $$
  with claimed as (
    update public.orders
       set confirmation_email_sent_at = now()
     where id = p_order_id
       and payment_status = 'paid'
       and confirmation_email_sent_at is null
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- If sending fails, give the slot back so it can be retried.
create or replace function public.release_confirmation_email(p_order_id uuid)
returns void
language sql
volatile
set search_path = ''
as $$
  update public.orders set confirmation_email_sent_at = null where id = p_order_id;
$$;

revoke all on function public.claim_confirmation_email(uuid) from public, anon, authenticated;
revoke all on function public.release_confirmation_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_confirmation_email(uuid) to service_role;
grant execute on function public.release_confirmation_email(uuid) to service_role;
