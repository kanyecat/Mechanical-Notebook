-- Mechanical Notebook requests board: tables, security rules and spam limits for Supabase.
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- Change the e-mail address below to the one you sign in with (it is the only account that can moderate).

create extension if not exists pgcrypto;

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null default 'idea' check (kind in ('idea', 'mistake', 'question')),
  title text not null check (char_length(title) between 3 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  name text check (name is null or char_length(name) <= 40),
  status text not null default 'new' check (status in ('new', 'read', 'planned', 'fixed', 'resolved')),
  reply text check (reply is null or char_length(reply) <= 2000),
  hidden boolean not null default false
);

create table if not exists public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  body text not null check (char_length(body) between 1 and 1000),
  name text check (name is null or char_length(name) <= 40),
  is_owner boolean not null default false,
  hidden boolean not null default false
);
create index if not exists board_comments_post on public.board_comments (post_id);

-- the owner: the one signed-in account allowed to change status, reply, hide and delete
create or replace function public.board_is_owner() returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'jooheeki@alumni.cmu.edu'
$$;

alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;

drop policy if exists "read posts" on public.board_posts;
drop policy if exists "add posts" on public.board_posts;
drop policy if exists "owner edits posts" on public.board_posts;
drop policy if exists "owner deletes posts" on public.board_posts;
create policy "read posts" on public.board_posts for select using (not hidden or public.board_is_owner());
create policy "add posts" on public.board_posts for insert with check (status = 'new' and reply is null and hidden = false);
create policy "owner edits posts" on public.board_posts for update using (public.board_is_owner()) with check (public.board_is_owner());
create policy "owner deletes posts" on public.board_posts for delete using (public.board_is_owner());

drop policy if exists "read comments" on public.board_comments;
drop policy if exists "add comments" on public.board_comments;
drop policy if exists "owner edits comments" on public.board_comments;
drop policy if exists "owner deletes comments" on public.board_comments;
create policy "read comments" on public.board_comments for select using (not hidden or public.board_is_owner());
create policy "add comments" on public.board_comments for insert with check (
  hidden = false and (is_owner = false or public.board_is_owner())
  and exists (select 1 from public.board_posts p where p.id = post_id and not p.hidden));
create policy "owner edits comments" on public.board_comments for update using (public.board_is_owner()) with check (public.board_is_owner());
create policy "owner deletes comments" on public.board_comments for delete using (public.board_is_owner());

grant select, insert on public.board_posts, public.board_comments to anon, authenticated;
grant update, delete on public.board_posts, public.board_comments to authenticated;

-- spam limits: a cap on how many posts and comments the whole board accepts in 10 minutes (the owner is never limited),
-- and the server, not the visitor, sets the time
create or replace function public.board_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if public.board_is_owner() then return new; end if;
  if tg_table_name = 'board_posts' and (select count(*) from public.board_posts where created_at > now() - interval '10 minutes') >= 15 then
    raise exception 'Lots of posts just now. Please try again in a few minutes.';
  end if;
  if tg_table_name = 'board_comments' and (select count(*) from public.board_comments where created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Lots of comments just now. Please try again in a few minutes.';
  end if;
  return new;
end $$;
drop trigger if exists board_posts_guard on public.board_posts;
drop trigger if exists board_comments_guard on public.board_comments;
create trigger board_posts_guard before insert on public.board_posts for each row execute function public.board_guard();
create trigger board_comments_guard before insert on public.board_comments for each row execute function public.board_guard();

create or replace function public.board_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists board_posts_touch on public.board_posts;
create trigger board_posts_touch before update on public.board_posts for each row execute function public.board_touch();
