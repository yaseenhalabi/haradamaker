create extension if not exists pgcrypto with schema extensions;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled board',
  cells jsonb not null default '{}'::jsonb,
  done jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boards_title_length check (char_length(title) <= 120),
  constraint boards_cells_is_object check (jsonb_typeof(cells) = 'object'),
  constraint boards_done_is_object check (jsonb_typeof(done) = 'object')
);

create table if not exists public.board_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint board_shares_token_length check (char_length(token) between 32 and 96)
);

create index if not exists boards_owner_updated_idx on public.boards (owner_id, updated_at desc);
create index if not exists board_shares_board_idx on public.board_shares (board_id);
create unique index if not exists board_shares_one_active_per_board_idx
  on public.board_shares (board_id)
  where revoked_at is null;
create unique index if not exists board_shares_active_token_idx
  on public.board_shares (token)
  where revoked_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boards_set_updated_at
before update on public.boards
for each row
execute function public.set_updated_at();

alter table public.boards enable row level security;
alter table public.board_shares enable row level security;

create policy "Users can select owned boards"
  on public.boards for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can insert owned boards"
  on public.boards for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Users can update owned boards"
  on public.boards for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete owned boards"
  on public.boards for delete
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can manage shares for owned boards"
  on public.board_shares for all
  to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_shares.board_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.boards b
      where b.id = board_shares.board_id
        and b.owner_id = auth.uid()
    )
  );

revoke execute on function public.set_updated_at() from public, anon, authenticated;
