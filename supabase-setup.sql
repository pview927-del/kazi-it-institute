-- KAZI IT AND INSTITUTE: Supabase database setup
-- Run this in Supabase Dashboard -> SQL Editor.
-- Configure config.js with Project URL and anon/public key. Never use service_role key in browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','staff','student')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  occupation text not null,
  age integer not null check (age between 5 and 100),
  gender text not null,
  address text not null,
  course text not null,
  branch text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  student_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_bn text not null,
  description text not null default '',
  fee text not null default 'অফিস থেকে নিশ্চিত করুন',
  duration text not null default 'ব্যাচ অনুযায়ী নিশ্চিত করুন',
  conditions text not null default 'ভর্তির আগে অফিস থেকে নিশ্চিত করুন',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.notices enable row level security;
alter table public.courses enable row level security;

create or replace function public.is_kazi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create policy "profile self read" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_kazi_admin());
create policy "admin manages profiles" on public.profiles
  for all to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());

create policy "public can submit applications" on public.applications
  for insert to anon, authenticated with check (
    length(trim(full_name)) > 1 and length(trim(phone)) >= 10
    and age between 5 and 100
  );
create policy "admins read applications" on public.applications
  for select to authenticated using (public.is_kazi_admin());
create policy "admins update applications" on public.applications
  for update to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());
create policy "admins delete applications" on public.applications
  for delete to authenticated using (public.is_kazi_admin());

create policy "public reads active notices" on public.notices
  for select to anon, authenticated using (active = true or public.is_kazi_admin());
create policy "admins create notices" on public.notices
  for insert to authenticated with check (public.is_kazi_admin());
create policy "admins update notices" on public.notices
  for update to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());
create policy "admins delete notices" on public.notices
  for delete to authenticated using (public.is_kazi_admin());

create policy "public reads active courses" on public.courses
  for select to anon, authenticated using (active = true or public.is_kazi_admin());
create policy "admins manage courses" on public.courses
  for all to authenticated using (public.is_kazi_admin()) with check (public.is_kazi_admin());

-- Student login only reveals the matched student's own portal summary after both ID and phone match.
create or replace function public.student_portal_lookup(p_student_id text, p_phone text)
returns table(full_name text, course text, branch text, status text, student_id text)
language sql
stable
security definer
set search_path = public
as $$
  select a.full_name, a.course, a.branch, a.status, a.student_id
  from public.applications a
  where a.student_id = trim(p_student_id)
    and regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
    and a.status = 'approved'
  limit 1;
$$;

grant execute on function public.student_portal_lookup(text,text) to anon, authenticated;
grant execute on function public.is_kazi_admin() to authenticated;
grant select on public.notices, public.courses to anon, authenticated;
grant insert on public.applications to anon, authenticated;
grant select, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.notices, public.courses to authenticated;
grant select on public.profiles to authenticated;

-- SET UP FIRST ADMIN:
-- 1) Supabase Dashboard -> Authentication -> Users -> Add user (email + strong password).
-- 2) Copy that user's UUID.
-- 3) Run this SQL with the real UUID:
-- insert into public.profiles (id, role) values ('PASTE_AUTH_USER_UUID_HERE', 'admin')
-- on conflict (id) do update set role = 'admin';
