-- MEDBOOK EXCHANGE / SUPABASE SETUP
-- Run this entire script in Supabase SQL Editor.
-- Replace YOUR_ADMIN_EMAIL with your owner/admin email before running.

create extension if not exists pgcrypto;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  year smallint not null check (year between 1 and 4),
  book_name text not null,
  author text not null,
  condition text not null check (condition in ('Like New','Very Good','Good','Fair')),
  seller_price integer not null check (seller_price > 0),
  buyer_price integer generated always as (seller_price + 50) stored,
  photo_urls text[] not null,
  status text not null default 'pending' check (status in ('pending','approved','sold','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.seller_contacts (
  book_id uuid primary key references public.books(id) on delete cascade,
  seller_whatsapp text not null
);

alter table public.books enable row level security;
alter table public.seller_contacts enable row level security;

-- If the earlier version was already run, move the private number into the
-- private table and then remove it from the public books table.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='books' and column_name='seller_whatsapp'
  ) then
    insert into public.seller_contacts(book_id, seller_whatsapp)
    select id, seller_whatsapp from public.books
    where seller_whatsapp is not null
    on conflict (book_id) do update set seller_whatsapp = excluded.seller_whatsapp;
    alter table public.books drop column seller_whatsapp;
  end if;
end $$;

-- Least-privilege grants.
revoke all on public.books from anon, authenticated;
grant select (id, year, book_name, author, condition, seller_price, buyer_price, photo_urls, created_at)
  on public.books to anon, authenticated;
grant insert (year, book_name, author, condition, seller_price, photo_urls, status)
  on public.books to anon, authenticated;
grant update, delete on public.books to authenticated;

revoke all on public.seller_contacts from anon, authenticated;
grant insert on public.seller_contacts to anon, authenticated;
grant select on public.seller_contacts to authenticated;

-- Public buyers can only read approved books, and seller WhatsApp is not a
-- column in the public table anymore.
drop policy if exists "public can read approved books" on public.books;
create policy "public can read approved books"
on public.books for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "public can submit books" on public.books;
create policy "public can submit books"
on public.books for insert
to anon, authenticated
with check (
  status = 'pending'
  and seller_price > 0
  and year between 1 and 4
);

-- Owner-only access to private seller contacts.
drop policy if exists "admin can read seller contacts" on public.seller_contacts;
create policy "admin can read seller contacts"
on public.seller_contacts for select
to authenticated
using ((select auth.jwt()->>'email') = 'YOUR_ADMIN_EMAIL');

drop policy if exists "public can submit seller contacts" on public.seller_contacts;
create policy "public can submit seller contacts"
on public.seller_contacts for insert
to anon, authenticated
with check (true);

-- Owner-only book management.
drop policy if exists "admin can update books" on public.books;
create policy "admin can update books"
on public.books for update
to authenticated
using ((select auth.jwt()->>'email') = 'YOUR_ADMIN_EMAIL')
with check ((select auth.jwt()->>'email') = 'YOUR_ADMIN_EMAIL');

drop policy if exists "admin can delete books" on public.books;
create policy "admin can delete books"
on public.books for delete
to authenticated
using ((select auth.jwt()->>'email') = 'YOUR_ADMIN_EMAIL');

-- Storage bucket for book photos.
insert into storage.buckets (id, name, public)
values ('book-images','book-images',true)
on conflict (id) do update set public = true;

drop policy if exists "public can upload book images" on storage.objects;
create policy "public can upload book images"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'book-images');

drop policy if exists "public can read book images" on storage.objects;
create policy "public can read book images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'book-images');

-- Note: seller_contacts intentionally has no public SELECT policy.
-- Only the owner/admin email can read seller WhatsApp numbers.
