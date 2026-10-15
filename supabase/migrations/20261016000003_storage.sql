-- =============================================================================
-- Image storage buckets. Images are publicly readable (they appear on the
-- storefront); only the admin can upload, replace or delete them.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('artworks',       'artworks',       true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "public_read_store_images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('product-images', 'artworks'));

create policy "admin_insert_store_images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'artworks') and (select public.is_admin()));

create policy "admin_update_store_images" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'artworks') and (select public.is_admin()));

create policy "admin_delete_store_images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'artworks') and (select public.is_admin()));
