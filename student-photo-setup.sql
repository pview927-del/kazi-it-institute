-- KAZI IT AND INSTITUTE: Student profile photo upload
-- Run this file in Supabase Dashboard -> SQL Editor.
-- This keeps the existing Student ID + phone login. Photos are stored as small data URLs
-- in the matching application row, avoiding a public Storage upload bucket.
-- Limitation: ID + phone is not strong authentication; use OTP before storing highly sensitive data.

alter table public.applications
  add column if not exists profile_photo_data text;

drop function if exists public.student_portal_lookup(text, text);

create function public.student_portal_lookup(p_student_id text, p_phone text)
returns table(
  full_name text,
  course text,
  branch text,
  status text,
  student_id text,
  profile_photo_data text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.full_name, a.course, a.branch, a.status, a.student_id, a.profile_photo_data
  from public.applications a
  where a.student_id = trim(p_student_id)
    and regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
    and a.status = 'approved'
  limit 1;
$$;

create or replace function public.student_portal_save_photo(
  p_student_id text,
  p_phone text,
  p_photo_data text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_student_id is null or length(trim(p_student_id)) < 3
     or p_phone is null or length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 10
     or p_photo_data is null
     or length(p_photo_data) > 1400000
     or p_photo_data !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then
    return false;
  end if;

  update public.applications a
     set profile_photo_data = p_photo_data
   where a.student_id = trim(p_student_id)
     and regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
     and a.status = 'approved';

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.student_portal_lookup(text, text) from public;
revoke all on function public.student_portal_save_photo(text, text, text) from public;
grant execute on function public.student_portal_lookup(text, text) to anon, authenticated;
grant execute on function public.student_portal_save_photo(text, text, text) to anon, authenticated;
