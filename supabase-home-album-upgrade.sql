-- KAZI IT: editable homepage text + About Us photo album + pinned homepage photos
create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
drop policy if exists "public reads site content" on public.site_content;
create policy "public reads site content" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "admins manage site content" on public.site_content;
create policy "admins manage site content" on public.site_content for all to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

insert into public.site_content(key,value) values
('hero_title','দক্ষতা শিখুন। সম্ভাবনা বাড়ান।'),
('hero_tagline','আপনার ডিজিটাল ভবিষ্যতের শুরু'),
('hero_description','KAZI IT AND INSTITUTE-এ কম্পিউটার ও ডিজিটাল দক্ষতার ভিত্তি গড়ে তুলুন। সহজ ব্যাখ্যা, হাতে-কলমে অনুশীলন এবং আপনার লক্ষ্যের সঙ্গে মানানসই শেখার পথে এগিয়ে চলুন।'),
('courses_heading','আপনার লক্ষ্য অনুযায়ী কোর্স বেছে নিন'),
('courses_description','মোবাইলে পাশাপাশি দুটি কোর্স দেখানো হয়। প্রতিটি কোর্সের আলাদা পেজ রয়েছে।')
on conflict(key) do nothing;

create table if not exists public.photo_album (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null,
  target_url text not null default 'about.html',
  active boolean not null default true,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.photo_album enable row level security;
drop policy if exists "public reads active photo album" on public.photo_album;
create policy "public reads active photo album" on public.photo_album for select to anon, authenticated using (active=true or public.is_kazi_admin());
drop policy if exists "admins manage photo album" on public.photo_album;
create policy "admins manage photo album" on public.photo_album for all to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());
grant select on public.photo_album to anon, authenticated;
grant insert, update, delete on public.photo_album to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-album','site-album',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public can view site album" on storage.objects;
create policy "public can view site album" on storage.objects for select using(bucket_id='site-album');
drop policy if exists "admins upload site album" on storage.objects;
create policy "admins upload site album" on storage.objects for insert to authenticated with check(bucket_id='site-album' and public.is_kazi_admin());
drop policy if exists "admins update site album" on storage.objects;
create policy "admins update site album" on storage.objects for update to authenticated using(bucket_id='site-album' and public.is_kazi_admin()) with check(bucket_id='site-album' and public.is_kazi_admin());
drop policy if exists "admins delete site album" on storage.objects;
create policy "admins delete site album" on storage.objects for delete to authenticated using(bucket_id='site-album' and public.is_kazi_admin());

-- Backfill one profile photo per matching profile if prior application rows were linked.
