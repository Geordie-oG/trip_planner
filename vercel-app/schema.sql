-- Run in the Supabase SQL editor. Add the two verified account addresses separately.
create schema if not exists trip_private;
create table if not exists trip_private.members(email text primary key check(email = lower(trim(email))));
revoke all on schema trip_private from public, anon, authenticated;
create or replace function public.is_trip_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users u join trip_private.members m on m.email=lower(u.email)
    where u.id=auth.uid() and u.email_confirmed_at is not null)
$$;
revoke all on function public.is_trip_member() from public,anon;
grant execute on function public.is_trip_member() to authenticated;
create table if not exists public.vietnam_trip (
  id integer primary key check(id=1), plan jsonb not null check(jsonb_typeof(plan)='object'),
  revision uuid not null default gen_random_uuid()
);
alter table public.vietnam_trip enable row level security;
revoke all on public.vietnam_trip from public,anon,authenticated;
grant select,insert,update on public.vietnam_trip to authenticated;
drop policy if exists trip_access on public.vietnam_trip;
create policy trip_access on public.vietnam_trip for all to authenticated using (public.is_trip_member()) with check(public.is_trip_member());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('booking-images','booking-images',false,10485760,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists booking_read on storage.objects;
create policy booking_read on storage.objects for select to authenticated using(bucket_id='booking-images' and public.is_trip_member());
drop policy if exists booking_upload on storage.objects;
create policy booking_upload on storage.objects for insert to authenticated with check(bucket_id='booking-images' and public.is_trip_member() and name ~ '^[a-f0-9-]{36}$' and storage.foldername(name)='{}');
