-- Hace atómico el control de capacidad y la escritura del RSVP.
-- Ejecutar esta migración una vez en el proyecto Supabase antes de habilitar los RSVP.
create or replace function public.set_event_rsvp_atomic(
  p_event_id uuid,
  p_user_id text,
  p_status text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  selected_event public.events%rowtype;
  occupied_seats integer;
begin
  if p_status not in ('going', 'maybe', 'declined') then
    return 'invalid_status';
  end if;

  select *
    into selected_event
    from public.events
   where id = p_event_id
   for update;

  if not found then
    return 'not_found';
  end if;

  if selected_event.cancelled or selected_event.starts_at <= now() then
    return 'closed';
  end if;

  if selected_event.capacity is not null and p_status = 'going' then
    select count(*)::integer
      into occupied_seats
      from public.event_rsvps
     where event_id = p_event_id
       and status = 'going'
       and user_id <> p_user_id;

    if occupied_seats >= selected_event.capacity then
      return 'full';
    end if;
  end if;

  insert into public.event_rsvps (event_id, user_id, status, responded_at)
  values (p_event_id, p_user_id, p_status, now())
  on conflict (event_id, user_id)
  do update set status = excluded.status, responded_at = excluded.responded_at;

  return 'ok';
end;
$$;

revoke all on function public.set_event_rsvp_atomic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_event_rsvp_atomic(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
