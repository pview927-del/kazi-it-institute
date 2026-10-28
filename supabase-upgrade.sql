-- KAZI IT upgrade: automatic student IDs, student profiles, guardian data, banners and personal notices.
-- Run once in Supabase SQL Editor after the original supabase-setup.sql.
create sequence if not exists public.kazi_student_id_seq start 1;

alter table public.profiles
  add column if not exists student_id text unique,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists course text,
  add column if not exists branch text,
  add column if not exists profile_photo_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists joined_at timestamptz not null default now();

alter table public.applications
  add column if not exists father_name text not null default '',
  add column if not exists mother_name text not null default '',
  add column if not exists profile_id uuid references auth.users(id) on delete set null;

alter table public.notices add column if not exists student_id text;

create or replace function public.kazi_new_student_id()
returns text language plpgsql security definer set search_path=public as $$
begin
  return 'KII-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.kazi_student_id_seq')::text, 6, '0');
end; $$;

-- Assign IDs to old applications that do not have one yet.
do $$
declare r record;
begin
  for r in select id from public.applications where student_id is null loop
    update public.applications set student_id=public.kazi_new_student_id(), status='approved' where id=r.id;
  end loop;
end $$;

create or replace function public.kazi_assign_application_id()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.student_id is null or trim(new.student_id)='' then
    if coalesce(auth.uid(), new.profile_id) is not null then
      select p.student_id into new.student_id from public.profiles p where p.id=coalesce(auth.uid(), new.profile_id);
    end if;
    if new.student_id is null or trim(new.student_id)='' then
      new.student_id := public.kazi_new_student_id();
    end if;
  end if;
  if auth.uid() is not null then new.profile_id := auth.uid(); end if;
  if new.status='pending' then new.status := 'approved'; end if;
  return new;
end; $$;
drop trigger if exists kazi_assign_application_id on public.applications;
create trigger kazi_assign_application_id before insert on public.applications
for each row execute function public.kazi_assign_application_id();

create or replace function public.kazi_create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, role, full_name, phone, father_name, mother_name, course, branch, student_id, joined_at)
  values (
    new.id,
    'student',
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.raw_user_meta_data->>'father_name',''),
    coalesce(new.raw_user_meta_data->>'mother_name',''),
    coalesce(new.raw_user_meta_data->>'course',''),
    coalesce(new.raw_user_meta_data->>'branch',''),
    public.kazi_new_student_id(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists kazi_auth_user_profile on auth.users;
create trigger kazi_auth_user_profile after insert on auth.users
for each row execute function public.kazi_create_profile_for_auth_user();

drop policy if exists "students update own profile" on public.profiles;
create policy "students update own profile" on public.profiles
for update to authenticated using (id=auth.uid() and role='student')
with check (id=auth.uid() and role='student');

drop policy if exists "students read own applications" on public.applications;
create policy "students read own applications" on public.applications
for select to authenticated using (profile_id=auth.uid() or public.is_kazi_admin());

drop policy if exists "students update own application" on public.applications;
create policy "students update own application" on public.applications
for update to authenticated using (profile_id=auth.uid()) with check (profile_id=auth.uid());

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  image_url text not null,
  target_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;
drop policy if exists "public reads active banners" on public.banners;
create policy "public reads active banners" on public.banners
for select to anon, authenticated using (active=true or public.is_kazi_admin());
drop policy if exists "admins manage banners" on public.banners;
create policy "admins manage banners" on public.banners
for all to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());
grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;

-- Per-student private notices are visible only to the matching student and admins.
drop policy if exists "students read own notices" on public.notices;
create policy "students read own notices" on public.notices
for select to authenticated using (active=true and (student_id is null or student_id=(select p.student_id from public.profiles p where p.id=auth.uid())) or public.is_kazi_admin());

-- Banner image storage bucket. The bucket is public for display; only admins can upload/change files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-banners','site-banners',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public can view site banners" on storage.objects;
create policy "public can view site banners" on storage.objects for select using (bucket_id='site-banners');
drop policy if exists "admins upload site banners" on storage.objects;
create policy "admins upload site banners" on storage.objects for insert to authenticated with check (bucket_id='site-banners' and public.is_kazi_admin());
drop policy if exists "admins update site banners" on storage.objects;
create policy "admins update site banners" on storage.objects for update to authenticated using (bucket_id='site-banners' and public.is_kazi_admin()) with check (bucket_id='site-banners' and public.is_kazi_admin());
drop policy if exists "admins delete site banners" on storage.objects;
create policy "admins delete site banners" on storage.objects for delete to authenticated using (bucket_id='site-banners' and public.is_kazi_admin());

-- Allow public application submissions and admin edits already governed by the original policies.

-- Student profile photo storage. Bucket is public for profile image display; only the owner can upload/update/delete their own files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-photos','student-photos',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=3145728, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public can view student photos" on storage.objects;
create policy "public can view student photos" on storage.objects for select using (bucket_id='student-photos');
drop policy if exists "students upload own profile photo" on storage.objects;
create policy "students upload own profile photo" on storage.objects for insert to authenticated with check (bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "students update own profile photo" on storage.objects;
create policy "students update own profile photo" on storage.objects for update to authenticated using (bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "students delete own profile photo" on storage.objects;
create policy "students delete own profile photo" on storage.objects for delete to authenticated using (bucket_id='student-photos' and (storage.foldername(name))[1]=auth.uid()::text);

grant select on public.banners to anon, authenticated;
grant insert, update, delete on public.banners to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.notices, public.courses to authenticated;
