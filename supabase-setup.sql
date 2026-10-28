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

-- Student Portal full profile lookup.
-- Run this block in Supabase Dashboard -> SQL Editor.
-- Login requires Student ID + the phone number supplied with the admission application.
create or replace function public.student_portal_lookup(p_student_id text, p_phone text)
returns table(
  full_name text,
  phone text,
  occupation text,
  age integer,
  gender text,
  address text,
  course text,
  branch text,
  status text,
  student_id text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $
  select a.full_name, a.phone, a.occupation, a.age, a.gender, a.address,
         a.course, a.branch, a.status, a.student_id, a.created_at
  from public.applications a
  where a.student_id = trim(p_student_id)
    and regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
    and a.status = 'approved'
  limit 1;
$;
revoke all on function public.student_portal_lookup(text,text) from public;
grant execute on function public.student_portal_lookup(text,text) to anon, authenticated;

-- SET UP FIRST ADMIN:
-- 1) Supabase Dashboard -> Authentication -> Users -> Add user (email + strong password).
-- 2) Copy that user's UUID.
-- 3) Run this SQL with the real UUID:
-- insert into public.profiles (id, role) values ('PASTE_AUTH_USER_UUID_HERE', 'admin')
-- on conflict (id) do update set role = 'admin';


-- ADMIN SECOND-FACTOR CODE (run this after the schema above)
-- The code hash is stored server-side and is not readable by website visitors.
create table if not exists public.admin_security_settings (
  id integer primary key check (id = 1),
  code_hash text not null
);
alter table public.admin_security_settings enable row level security;
revoke all on public.admin_security_settings from anon, authenticated;
grant select, insert, update, delete on public.admin_security_settings to service_role;

create or replace function public.verify_kazi_admin_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare saved_hash text;
begin
  if auth.uid() is null then return false; end if;
  if not public.is_kazi_admin() then return false; end if;
  select code_hash into saved_hash from public.admin_security_settings where id = 1;
  if saved_hash is null or p_code is null then return false; end if;
  return crypt(p_code, saved_hash) = saved_hash;
end;
$$;
revoke all on function public.verify_kazi_admin_code(text) from public, anon;
grant execute on function public.verify_kazi_admin_code(text) to authenticated;

-- IMPORTANT: Set your new private code directly in Supabase SQL Editor.
-- Do NOT commit your real code to GitHub. Replace NEW_PRIVATE_CODE with a NEW code
-- (not a code you have posted in a chat or public place), run this privately:
-- insert into public.admin_security_settings (id, code_hash)
-- values (1, crypt('NEW_PRIVATE_CODE', gen_salt('bf')))
-- on conflict (id) do update set code_hash = excluded.code_hash;
