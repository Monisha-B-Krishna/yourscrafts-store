-- =============================================================================
-- Example data for Yours Crafts Woman. GENERATED FILE — do not edit by hand.
-- Source: src/lib/seed/data.ts  →  npm run seed:generate
-- Prices are in paise (₹1 = 100 paise).
-- =============================================================================

begin;

-- Store settings (owner edits these in /admin/settings)
insert into public.store_settings (key, value) values ('whatsapp_number', '"919999999999"'::jsonb)
  on conflict (key) do nothing;
insert into public.store_settings (key, value) values ('flat_shipping_rate', '8000'::jsonb)
  on conflict (key) do nothing;
insert into public.store_settings (key, value) values ('free_shipping_threshold', '99900'::jsonb)
  on conflict (key) do nothing;
insert into public.store_settings (key, value) values ('announcement_text', '"Free shipping across India on orders above ₹999 ✿ Handmade with love"'::jsonb)
  on conflict (key) do nothing;
insert into public.store_settings (key, value) values ('instagram_url', '"https://www.instagram.com/yours.craftswoman/"'::jsonb)
  on conflict (key) do nothing;
insert into public.store_settings (key, value) values ('cancellation_window_hours', '12'::jsonb)
  on conflict (key) do nothing;

-- Categories
insert into public.categories (id, name, slug, sort_order) values ('10000000-0000-4000-8000-000000000001', 'Chocolate Bouquets', 'chocolate-bouquets', 1)
  on conflict (id) do nothing;
insert into public.categories (id, name, slug, sort_order) values ('10000000-0000-4000-8000-000000000002', 'Gift Hampers', 'gift-hampers', 2)
  on conflict (id) do nothing;
insert into public.categories (id, name, slug, sort_order) values ('10000000-0000-4000-8000-000000000003', 'Handmade Decor', 'handmade-decor', 3)
  on conflict (id) do nothing;
insert into public.categories (id, name, slug, sort_order) values ('10000000-0000-4000-8000-000000000004', 'Personalised Gifts', 'personalised-gifts', 4)
  on conflict (id) do nothing;
insert into public.categories (id, name, slug, sort_order) values ('10000000-0000-4000-8000-000000000005', 'Paintings & Prints', 'paintings-and-prints', 5)
  on conflict (id) do nothing;

-- Products, images and variants
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000001', 'Blush Rose Chocolate Bouquet', 'blush-rose-chocolate-bouquet', 'Twelve chocolates nestled among blush paper roses, wrapped in peach tissue and tied with a satin ribbon. A sweet way to say “I love you”.', '10000000-0000-4000-8000-000000000001',
  'product', 129900, 109900, 8, 'YCW-001',
  array['chocolate', 'bouquet', 'roses', 'anniversary', 'valentine']::text[], true, true, 650, null, 64,
  now() - interval '40 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', '/placeholders/blush-rose-chocolate-bouquet.svg', 'Blush Rose Chocolate Bouquet', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', '/placeholders/blush-rose-chocolate-bouquet-2.svg', 'Blush Rose Chocolate Bouquet, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000001', '/placeholders/blush-rose-chocolate-bouquet-3.svg', 'Blush Rose Chocolate Bouquet, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000002', 'Ferrero Gold Bouquet', 'ferrero-gold-bouquet', 'Sixteen Ferrero Rocher arranged in a golden bouquet with dried flowers and a handwritten note card.', '10000000-0000-4000-8000-000000000001',
  'product', 189900, null, 5, 'YCW-002',
  array['chocolate', 'bouquet', 'ferrero', 'luxury', 'wedding']::text[], false, true, 700, null, 41,
  now() - interval '25 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000002', '/placeholders/ferrero-gold-bouquet.svg', 'Ferrero Gold Bouquet', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000002', '/placeholders/ferrero-gold-bouquet-2.svg', 'Ferrero Gold Bouquet, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000002', '/placeholders/ferrero-gold-bouquet-3.svg', 'Ferrero Gold Bouquet, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000003', 'Mini Dairy Milk Bouquet', 'mini-dairy-milk-bouquet', 'A petite bouquet of Dairy Milk bars and pastel flowers. Perfect for birthdays and small thank-yous.', '10000000-0000-4000-8000-000000000001',
  'product', 64900, null, 15, 'YCW-003',
  array['chocolate', 'bouquet', 'birthday', 'budget']::text[], false, true, 350, null, 88,
  now() - interval '60 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000030', '20000000-0000-4000-8000-000000000003', '/placeholders/mini-dairy-milk-bouquet.svg', 'Mini Dairy Milk Bouquet', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000003', '/placeholders/mini-dairy-milk-bouquet-2.svg', 'Mini Dairy Milk Bouquet, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000003', '/placeholders/mini-dairy-milk-bouquet-3.svg', 'Mini Dairy Milk Bouquet, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000004', 'KitKat Sunflower Bouquet', 'kitkat-sunflower-bouquet', 'Bright handmade paper sunflowers paired with KitKat bars. Sunshine you can eat.', '10000000-0000-4000-8000-000000000001',
  'product', 89900, null, 10, 'YCW-004',
  array['chocolate', 'bouquet', 'sunflower', 'friendship']::text[], false, true, 450, null, 37,
  now() - interval '6 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000040', '20000000-0000-4000-8000-000000000004', '/placeholders/kitkat-sunflower-bouquet.svg', 'KitKat Sunflower Bouquet', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000041', '20000000-0000-4000-8000-000000000004', '/placeholders/kitkat-sunflower-bouquet-2.svg', 'KitKat Sunflower Bouquet, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000042', '20000000-0000-4000-8000-000000000004', '/placeholders/kitkat-sunflower-bouquet-3.svg', 'KitKat Sunflower Bouquet, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000005', 'Personalised Name Chocolate Bouquet', 'personalised-name-chocolate-bouquet', 'Chocolates arranged around hand-cut letters spelling a name of your choice (up to 6 letters).', '10000000-0000-4000-8000-000000000001',
  'product', 149900, null, 0, 'YCW-005',
  array['chocolate', 'bouquet', 'personalised', 'name']::text[], false, true, 600, null, 29,
  now() - interval '15 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000050', '20000000-0000-4000-8000-000000000005', '/placeholders/personalised-name-chocolate-bouquet.svg', 'Personalised Name Chocolate Bouquet', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000051', '20000000-0000-4000-8000-000000000005', '/placeholders/personalised-name-chocolate-bouquet-2.svg', 'Personalised Name Chocolate Bouquet, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000052', '20000000-0000-4000-8000-000000000005', '/placeholders/personalised-name-chocolate-bouquet-3.svg', 'Personalised Name Chocolate Bouquet, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000006', 'Diwali Diya & Sweets Hamper', 'diwali-diya-sweets-hamper', 'Hand-painted diyas, a scented candle, dry-fruit sweets and a festive card in a reusable woven basket.', '10000000-0000-4000-8000-000000000002',
  'product', 179900, 149900, 12, 'YCW-006',
  array['diwali', 'hamper', 'diyas', 'festive', 'sweets']::text[], true, true, 1400, null, 52,
  now() - interval '3 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000060', '20000000-0000-4000-8000-000000000006', '/placeholders/diwali-diya-sweets-hamper.svg', 'Diwali Diya & Sweets Hamper', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000061', '20000000-0000-4000-8000-000000000006', '/placeholders/diwali-diya-sweets-hamper-2.svg', 'Diwali Diya & Sweets Hamper, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000062', '20000000-0000-4000-8000-000000000006', '/placeholders/diwali-diya-sweets-hamper-3.svg', 'Diwali Diya & Sweets Hamper, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000007', 'Self-Care Spa Hamper', 'self-care-spa-hamper', 'Bath salts, a handmade soap bar, a soy candle and a tiny painted affirmation card.', '10000000-0000-4000-8000-000000000002',
  'product', 139900, null, 9, 'YCW-007',
  array['hamper', 'self-care', 'spa', 'for-her']::text[], false, true, 1100, null, 33,
  now() - interval '20 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000070', '20000000-0000-4000-8000-000000000007', '/placeholders/self-care-spa-hamper.svg', 'Self-Care Spa Hamper', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000071', '20000000-0000-4000-8000-000000000007', '/placeholders/self-care-spa-hamper-2.svg', 'Self-Care Spa Hamper, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000072', '20000000-0000-4000-8000-000000000007', '/placeholders/self-care-spa-hamper-3.svg', 'Self-Care Spa Hamper, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000008', 'Birthday Surprise Box', 'birthday-surprise-box', 'An explosion box that opens to reveal photos, chocolates and handwritten notes.', '10000000-0000-4000-8000-000000000002',
  'product', 119900, null, 14, 'YCW-008',
  array['birthday', 'hamper', 'surprise', 'box']::text[], false, true, 900, null, 47,
  now() - interval '35 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000080', '20000000-0000-4000-8000-000000000008', '/placeholders/birthday-surprise-box.svg', 'Birthday Surprise Box', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000081', '20000000-0000-4000-8000-000000000008', '/placeholders/birthday-surprise-box-2.svg', 'Birthday Surprise Box, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000082', '20000000-0000-4000-8000-000000000008', '/placeholders/birthday-surprise-box-3.svg', 'Birthday Surprise Box, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000009', 'Mini Thank-You Hamper', 'mini-thank-you-hamper', 'A small kraft box with cookies, a chocolate bar and a hand-lettered thank-you tag.', '10000000-0000-4000-8000-000000000002',
  'product', 54900, null, 25, 'YCW-009',
  array['hamper', 'thank-you', 'teacher', 'budget']::text[], false, true, 400, null, 71,
  now() - interval '50 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000090', '20000000-0000-4000-8000-000000000009', '/placeholders/mini-thank-you-hamper.svg', 'Mini Thank-You Hamper', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000091', '20000000-0000-4000-8000-000000000009', '/placeholders/mini-thank-you-hamper-2.svg', 'Mini Thank-You Hamper, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000092', '20000000-0000-4000-8000-000000000009', '/placeholders/mini-thank-you-hamper-3.svg', 'Mini Thank-You Hamper, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000010', 'Couple Anniversary Hamper', 'couple-anniversary-hamper', 'Two painted mugs, a polaroid frame, chocolates and a handwritten love letter template.', '10000000-0000-4000-8000-000000000002',
  'product', 249900, null, 6, 'YCW-010',
  array['anniversary', 'hamper', 'couple', 'wedding']::text[], false, true, 1600, null, 22,
  now() - interval '9 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000100', '20000000-0000-4000-8000-000000000010', '/placeholders/couple-anniversary-hamper.svg', 'Couple Anniversary Hamper', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000010', '/placeholders/couple-anniversary-hamper-2.svg', 'Couple Anniversary Hamper, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000010', '/placeholders/couple-anniversary-hamper-3.svg', 'Couple Anniversary Hamper, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000011', 'Hand-painted Terracotta Diyas (Set of 4)', 'hand-painted-terracotta-diyas', 'Four terracotta diyas painted by hand in peach, gold and white. Each one is slightly different.', '10000000-0000-4000-8000-000000000003',
  'product', 39900, 34900, 40, 'YCW-011',
  array['diwali', 'diyas', 'terracotta', 'decor']::text[], false, true, 500, null, 95,
  now() - interval '2 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000110', '20000000-0000-4000-8000-000000000011', '/placeholders/hand-painted-terracotta-diyas.svg', 'Hand-painted Terracotta Diyas (Set of 4)', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000111', '20000000-0000-4000-8000-000000000011', '/placeholders/hand-painted-terracotta-diyas-2.svg', 'Hand-painted Terracotta Diyas (Set of 4), close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000112', '20000000-0000-4000-8000-000000000011', '/placeholders/hand-painted-terracotta-diyas-3.svg', 'Hand-painted Terracotta Diyas (Set of 4), styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000012', 'Resin Floral Coaster Set', 'resin-floral-coaster-set', 'Set of four resin coasters with real pressed flowers and gold flakes.', '10000000-0000-4000-8000-000000000003',
  'product', 79900, null, 11, 'YCW-012',
  array['resin', 'coasters', 'flowers', 'decor']::text[], false, true, 450, null, 26,
  now() - interval '30 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000120', '20000000-0000-4000-8000-000000000012', '/placeholders/resin-floral-coaster-set.svg', 'Resin Floral Coaster Set', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000121', '20000000-0000-4000-8000-000000000012', '/placeholders/resin-floral-coaster-set-2.svg', 'Resin Floral Coaster Set, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000122', '20000000-0000-4000-8000-000000000012', '/placeholders/resin-floral-coaster-set-3.svg', 'Resin Floral Coaster Set, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000013', 'Macramé Wall Hanging', 'macrame-wall-hanging', 'A cotton macramé hanging on a driftwood rod, about 45 cm long.', '10000000-0000-4000-8000-000000000003',
  'product', 109900, null, 4, 'YCW-013',
  array['macrame', 'wall', 'boho', 'decor']::text[], false, true, 300, null, 18,
  now() - interval '12 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000130', '20000000-0000-4000-8000-000000000013', '/placeholders/macrame-wall-hanging.svg', 'Macramé Wall Hanging', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000131', '20000000-0000-4000-8000-000000000013', '/placeholders/macrame-wall-hanging-2.svg', 'Macramé Wall Hanging, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000132', '20000000-0000-4000-8000-000000000013', '/placeholders/macrame-wall-hanging-3.svg', 'Macramé Wall Hanging, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000014', 'Painted Glass Bottle Lamp', 'painted-glass-bottle-lamp', 'An upcycled glass bottle painted with florals and filled with warm fairy lights.', '10000000-0000-4000-8000-000000000003',
  'product', 69900, null, 7, 'YCW-014',
  array['lamp', 'bottle-art', 'fairy-lights', 'decor']::text[], false, true, 550, null, 31,
  now() - interval '45 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000140', '20000000-0000-4000-8000-000000000014', '/placeholders/painted-glass-bottle-lamp.svg', 'Painted Glass Bottle Lamp', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000141', '20000000-0000-4000-8000-000000000014', '/placeholders/painted-glass-bottle-lamp-2.svg', 'Painted Glass Bottle Lamp, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000142', '20000000-0000-4000-8000-000000000014', '/placeholders/painted-glass-bottle-lamp-3.svg', 'Painted Glass Bottle Lamp, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000015', 'Lippan Art Mirror', 'lippan-art-mirror', 'Traditional Kutch-style mud and mirror work on a 30 cm round MDF base.', '10000000-0000-4000-8000-000000000003',
  'product', 159900, null, 3, 'YCW-015',
  array['lippan', 'mirror', 'kutch', 'wall', 'decor']::text[], true, true, 800, null, 24,
  now() - interval '18 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000150', '20000000-0000-4000-8000-000000000015', '/placeholders/lippan-art-mirror.svg', 'Lippan Art Mirror', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000151', '20000000-0000-4000-8000-000000000015', '/placeholders/lippan-art-mirror-2.svg', 'Lippan Art Mirror, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000152', '20000000-0000-4000-8000-000000000015', '/placeholders/lippan-art-mirror-3.svg', 'Lippan Art Mirror, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000016', 'Custom Name Keychain', 'custom-name-keychain', 'A resin keychain with your name and a pressed flower inside.', '10000000-0000-4000-8000-000000000004',
  'product', 29900, null, 50, 'YCW-016',
  array['keychain', 'personalised', 'name', 'budget']::text[], false, true, 50, null, 120,
  now() - interval '55 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000160', '20000000-0000-4000-8000-000000000016', '/placeholders/custom-name-keychain.svg', 'Custom Name Keychain', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000161', '20000000-0000-4000-8000-000000000016', '/placeholders/custom-name-keychain-2.svg', 'Custom Name Keychain, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000162', '20000000-0000-4000-8000-000000000016', '/placeholders/custom-name-keychain-3.svg', 'Custom Name Keychain, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000017', 'Hand-lettered Couple Frame', 'hand-lettered-couple-frame', 'An A4 frame with your names and a special date in hand-lettered calligraphy.', '10000000-0000-4000-8000-000000000004',
  'product', 89900, 74900, 10, 'YCW-017',
  array['frame', 'couple', 'calligraphy', 'wedding', 'personalised']::text[], false, true, 600, null, 39,
  now() - interval '8 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000170', '20000000-0000-4000-8000-000000000017', '/placeholders/hand-lettered-couple-frame.svg', 'Hand-lettered Couple Frame', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000171', '20000000-0000-4000-8000-000000000017', '/placeholders/hand-lettered-couple-frame-2.svg', 'Hand-lettered Couple Frame, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000172', '20000000-0000-4000-8000-000000000017', '/placeholders/hand-lettered-couple-frame-3.svg', 'Hand-lettered Couple Frame, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000018', 'Polaroid Memory Box', 'polaroid-memory-box', 'Twelve of your photos printed polaroid-style in a decorated keepsake box.', '10000000-0000-4000-8000-000000000004',
  'product', 124900, null, 8, 'YCW-018',
  array['polaroid', 'photos', 'memory', 'personalised']::text[], false, true, 700, null, 27,
  now() - interval '22 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000180', '20000000-0000-4000-8000-000000000018', '/placeholders/polaroid-memory-box.svg', 'Polaroid Memory Box', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000181', '20000000-0000-4000-8000-000000000018', '/placeholders/polaroid-memory-box-2.svg', 'Polaroid Memory Box, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000182', '20000000-0000-4000-8000-000000000018', '/placeholders/polaroid-memory-box-3.svg', 'Polaroid Memory Box, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000019', 'Hand-painted Name Mug', 'hand-painted-name-mug', 'A ceramic mug painted by hand with a name and little florals. Dishwasher-safe glaze.', '10000000-0000-4000-8000-000000000004',
  'product', 54900, null, 18, 'YCW-019',
  array['mug', 'personalised', 'name', 'painted']::text[], false, true, 400, null, 58,
  now() - interval '4 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000190', '20000000-0000-4000-8000-000000000019', '/placeholders/hand-painted-name-mug.svg', 'Hand-painted Name Mug', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000191', '20000000-0000-4000-8000-000000000019', '/placeholders/hand-painted-name-mug-2.svg', 'Hand-painted Name Mug, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000192', '20000000-0000-4000-8000-000000000019', '/placeholders/hand-painted-name-mug-3.svg', 'Hand-painted Name Mug, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000020', 'Customised Jewellery Box', 'customised-jewellery-box', 'A wooden jewellery box with a hand-painted lid and your initials.', '10000000-0000-4000-8000-000000000004',
  'product', 99900, null, 6, 'YCW-020',
  array['jewellery', 'box', 'personalised', 'for-her']::text[], false, true, 650, null, 19,
  now() - interval '28 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000200', '20000000-0000-4000-8000-000000000020', '/placeholders/customised-jewellery-box.svg', 'Customised Jewellery Box', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000201', '20000000-0000-4000-8000-000000000020', '/placeholders/customised-jewellery-box-2.svg', 'Customised Jewellery Box, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000202', '20000000-0000-4000-8000-000000000020', '/placeholders/customised-jewellery-box-3.svg', 'Customised Jewellery Box, styled as a gift', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000021', 'Monsoon Over Marine Drive', 'monsoon-over-marine-drive', 'Grey-blue rain clouds rolling over the Queen’s Necklace at dusk. Signed on the back.', '10000000-0000-4000-8000-000000000005',
  'original_art', 850000, null, 1, 'YCW-021',
  array['painting', 'original', 'mumbai', 'monsoon', 'acrylic']::text[], true, true, 1800, '40 × 50 cm, acrylic on canvas', 0,
  now() - interval '14 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000210', '20000000-0000-4000-8000-000000000021', '/placeholders/monsoon-over-marine-drive.svg', 'Monsoon Over Marine Drive', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000211', '20000000-0000-4000-8000-000000000021', '/placeholders/monsoon-over-marine-drive-2.svg', 'Monsoon Over Marine Drive, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000212', '20000000-0000-4000-8000-000000000021', '/placeholders/monsoon-over-marine-drive-3.svg', 'Monsoon Over Marine Drive, framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000022', 'Marigold Morning', 'marigold-morning', 'Strings of marigolds in morning light, painted with thick, joyful brushstrokes.', '10000000-0000-4000-8000-000000000005',
  'original_art', 650000, null, 1, 'YCW-022',
  array['painting', 'original', 'flowers', 'marigold', 'acrylic']::text[], false, true, 1400, '30 × 40 cm, acrylic on canvas', 0,
  now() - interval '33 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000220', '20000000-0000-4000-8000-000000000022', '/placeholders/marigold-morning.svg', 'Marigold Morning', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000221', '20000000-0000-4000-8000-000000000022', '/placeholders/marigold-morning-2.svg', 'Marigold Morning, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000222', '20000000-0000-4000-8000-000000000022', '/placeholders/marigold-morning-3.svg', 'Marigold Morning, framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000023', 'Quiet Courtyard', 'quiet-courtyard', 'A sunlit courtyard with a tulsi plant and terracotta pots, inspired by the artist’s grandmother’s home.', '10000000-0000-4000-8000-000000000005',
  'original_art', 1200000, null, 1, 'YCW-023',
  array['painting', 'original', 'courtyard', 'oil', 'home']::text[], true, true, 2500, '60 × 75 cm, oil on canvas', 0,
  now() - interval '70 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000230', '20000000-0000-4000-8000-000000000023', '/placeholders/quiet-courtyard.svg', 'Quiet Courtyard', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000231', '20000000-0000-4000-8000-000000000023', '/placeholders/quiet-courtyard-2.svg', 'Quiet Courtyard, close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000232', '20000000-0000-4000-8000-000000000023', '/placeholders/quiet-courtyard-3.svg', 'Quiet Courtyard, framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000024', 'Peach Bloom (Art Print)', 'peach-bloom-print', 'A museum-quality print of the original Peach Bloom painting. Ships rolled in a tube.', '10000000-0000-4000-8000-000000000005',
  'print', 79900, null, 35, 'YCW-024',
  array['print', 'flowers', 'peach', 'wall-art']::text[], false, true, 200, 'Giclée print on 300gsm matte paper', 44,
  now() - interval '10 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000240', '20000000-0000-4000-8000-000000000024', '/placeholders/peach-bloom-print.svg', 'Peach Bloom (Art Print)', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000241', '20000000-0000-4000-8000-000000000024', '/placeholders/peach-bloom-print-2.svg', 'Peach Bloom (Art Print), close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000242', '20000000-0000-4000-8000-000000000024', '/placeholders/peach-bloom-print-3.svg', 'Peach Bloom (Art Print), framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000024', 'A4 (21 × 29.7 cm)', 0, 20, 'YCW-024-1')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000024', 'A3 (29.7 × 42 cm)', 50000, 10, 'YCW-024-2')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000024', 'A2 (42 × 59.4 cm)', 120000, 5, 'YCW-024-3')
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000025', 'Chai at Dusk (Art Print)', 'chai-at-dusk-print', 'Two cups of chai on a balcony ledge as the sky turns orange. Ships rolled in a tube.', '10000000-0000-4000-8000-000000000005',
  'print', 79900, null, 35, 'YCW-025',
  array['print', 'chai', 'evening', 'wall-art']::text[], false, true, 200, 'Giclée print on 300gsm matte paper', 36,
  now() - interval '26 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000250', '20000000-0000-4000-8000-000000000025', '/placeholders/chai-at-dusk-print.svg', 'Chai at Dusk (Art Print)', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000251', '20000000-0000-4000-8000-000000000025', '/placeholders/chai-at-dusk-print-2.svg', 'Chai at Dusk (Art Print), close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000252', '20000000-0000-4000-8000-000000000025', '/placeholders/chai-at-dusk-print-3.svg', 'Chai at Dusk (Art Print), framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000025', 'A4 (21 × 29.7 cm)', 0, 20, 'YCW-025-1')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000025', 'A3 (29.7 × 42 cm)', 50000, 10, 'YCW-025-2')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000025', 'A2 (42 × 59.4 cm)', 120000, 5, 'YCW-025-3')
  on conflict (id) do nothing;
insert into public.products (id, name, slug, description, category_id, type, price, sale_price, stock, sku, tags, is_featured, is_active, weight_g, dimensions, sales_count, created_at) values (
  '20000000-0000-4000-8000-000000000026', 'Lotus Pond (Art Print)', 'lotus-pond-print', 'Soft pink lotuses floating on a jade-green pond. Ships rolled in a tube.', '10000000-0000-4000-8000-000000000005',
  'print', 89900, null, 35, 'YCW-026',
  array['print', 'lotus', 'pond', 'wall-art']::text[], true, true, 200, 'Giclée print on 300gsm matte paper', 30,
  now() - interval '5 days'
) on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000260', '20000000-0000-4000-8000-000000000026', '/placeholders/lotus-pond-print.svg', 'Lotus Pond (Art Print)', 0)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000261', '20000000-0000-4000-8000-000000000026', '/placeholders/lotus-pond-print-2.svg', 'Lotus Pond (Art Print), close-up', 1)
  on conflict (id) do nothing;
insert into public.product_images (id, product_id, url, alt, sort_order) values ('30000000-0000-4000-8000-000000000262', '20000000-0000-4000-8000-000000000026', '/placeholders/lotus-pond-print-3.svg', 'Lotus Pond (Art Print), framed on a wall', 2)
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000026', 'A4 (21 × 29.7 cm)', 0, 20, 'YCW-026-1')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000026', 'A3 (29.7 × 42 cm)', 50000, 10, 'YCW-026-2')
  on conflict (id) do nothing;
insert into public.product_variants (id, product_id, name, price_delta, stock, sku) values ('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000026', 'A2 (42 × 59.4 cm)', 120000, 5, 'YCW-026-3')
  on conflict (id) do nothing;

-- Collections (editions)
insert into public.collections (id, name, slug, description, starts_at, ends_at, is_active) values ('50000000-0000-4000-8000-000000000001', 'Diwali Edition 2026', 'diwali-edition-2026', 'Hand-painted diyas, festive hampers and sweet bouquets for the festival of lights.', '2026-10-01T00:00:00+05:30', '2026-11-15T23:59:59+05:30', true)
  on conflict (id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000011')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000015')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002')
  on conflict (collection_id, product_id) do nothing;
insert into public.collections (id, name, slug, description, starts_at, ends_at, is_active) values ('50000000-0000-4000-8000-000000000002', 'Wedding Season Gifting', 'wedding-season-gifting', 'Thoughtful, personal gifts for the couple and the whole shaadi crew.', '2026-10-01T00:00:00+05:30', '2027-02-28T23:59:59+05:30', true)
  on conflict (id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000010')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000017')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000020')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002')
  on conflict (collection_id, product_id) do nothing;
insert into public.collection_products (collection_id, product_id) values ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000013')
  on conflict (collection_id, product_id) do nothing;

-- Coupon
insert into public.coupons (id, code, type, value, min_order) values ('60000000-0000-4000-8000-000000000001', 'WELCOME10', 'percentage', 10, 49900)
  on conflict (id) do nothing;

commit;
