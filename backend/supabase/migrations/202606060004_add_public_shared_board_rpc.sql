create or replace function public.get_shared_board(share_token text)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  cells jsonb,
  done jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.owner_id, b.title, b.cells, b.done, b.created_at, b.updated_at
  from public.board_shares s
  join public.boards b on b.id = s.board_id
  where s.token = share_token
    and s.revoked_at is null
  limit 1;
$$;

revoke all on function public.get_shared_board(text) from public;
grant execute on function public.get_shared_board(text) to anon, authenticated;
