-- Guarda rango y certificaciones de un miembro de forma atómica.
-- Ejecutar después de 003_void_enforcers_dashboard.sql.

create or replace function public.set_void_enforcers_member_assignment(
  p_user_id text,
  p_rank_id uuid,
  p_certification_ids uuid[],
  p_assigned_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.void_enforcers_member_profiles (user_id, rank_id, updated_at)
  values (p_user_id, p_rank_id, now())
  on conflict (user_id)
  do update set rank_id = excluded.rank_id, updated_at = excluded.updated_at;

  delete from public.void_enforcers_member_certifications
   where user_id = p_user_id;

  insert into public.void_enforcers_member_certifications (user_id, certification_id, assigned_by)
  select p_user_id, certification_id, p_assigned_by
    from unnest(coalesce(p_certification_ids, '{}'::uuid[])) as item(certification_id)
  on conflict (user_id, certification_id) do nothing;
end;
$$;

revoke all on function public.set_void_enforcers_member_assignment(text, uuid, uuid[], text) from public, anon, authenticated;
grant execute on function public.set_void_enforcers_member_assignment(text, uuid, uuid[], text) to service_role;

notify pgrst, 'reload schema';
