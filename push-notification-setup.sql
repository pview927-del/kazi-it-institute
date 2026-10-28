-- KAZI IT AND INSTITUTE: Push notification subscriptions
-- Run in Supabase Dashboard -> SQL Editor.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated, public;

create or replace function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text
) returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if p_endpoint is null or p_endpoint !~ '^https://'
     or length(p_endpoint)>2048
     or p_p256dh is null or length(p_p256dh)<20 or length(p_p256dh)>256
     or p_auth is null or length(p_auth)<10 or length(p_auth)>256 then
    return false;
  end if;
  insert into public.push_subscriptions(endpoint,p256dh,auth)
  values(p_endpoint,p_p256dh,p_auth)
  on conflict(endpoint) do update
    set p256dh=excluded.p256dh, auth=excluded.auth, updated_at=now();
  return true;
end;
$$;
revoke all on function public.save_push_subscription(text,text,text) from public;
grant execute on function public.save_push_subscription(text,text,text) to anon, authenticated;
