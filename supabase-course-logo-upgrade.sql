-- KAZI IT improvements: course images, custom logo, and logo/course upload storage.
alter table public.courses add column if not exists image_url text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-assets','site-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "public can view site assets" on storage.objects;
create policy "public can view site assets" on storage.objects for select using(bucket_id='site-assets');
drop policy if exists "admins upload site assets" on storage.objects;
create policy "admins upload site assets" on storage.objects for insert to authenticated with check(bucket_id='site-assets' and public.is_kazi_admin());
drop policy if exists "admins update site assets" on storage.objects;
create policy "admins update site assets" on storage.objects for update to authenticated using(bucket_id='site-assets' and public.is_kazi_admin()) with check(bucket_id='site-assets' and public.is_kazi_admin());
drop policy if exists "admins delete site assets" on storage.objects;
create policy "admins delete site assets" on storage.objects for delete to authenticated using(bucket_id='site-assets' and public.is_kazi_admin());
