-- Datos propios de la división Void Enforcers.
-- Ejecutar una vez en el proyecto Supabase antes de habilitar su dashboard.

create table if not exists public.void_enforcers_settings (
  id integer primary key check (id = 1),
  admiral_user_id text references public.users(id) on delete set null,
  updated_by text references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.void_enforcers_ranks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 100),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.void_enforcers_certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.void_enforcers_member_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  rank_id uuid references public.void_enforcers_ranks(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.void_enforcers_member_certifications (
  user_id text not null references public.void_enforcers_member_profiles(user_id) on delete cascade,
  certification_id uuid not null references public.void_enforcers_certifications(id) on delete cascade,
  assigned_by text references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (user_id, certification_id)
);

create table if not exists public.void_enforcers_operation_attendance (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  attended boolean not null default false,
  marked_by text references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.void_enforcers_settings enable row level security;
alter table public.void_enforcers_ranks enable row level security;
alter table public.void_enforcers_certifications enable row level security;
alter table public.void_enforcers_member_profiles enable row level security;
alter table public.void_enforcers_member_certifications enable row level security;
alter table public.void_enforcers_operation_attendance enable row level security;

create or replace function public.set_void_enforcers_certifications(
  p_user_id text,
  p_certification_ids uuid[],
  p_assigned_by text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.void_enforcers_member_profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  delete from public.void_enforcers_member_certifications
   where user_id = p_user_id;

  insert into public.void_enforcers_member_certifications (user_id, certification_id, assigned_by)
  select p_user_id, certification_id, p_assigned_by
    from unnest(coalesce(p_certification_ids, '{}'::uuid[])) as item(certification_id)
  on conflict (user_id, certification_id) do nothing;
end;
$$;

revoke all on function public.set_void_enforcers_certifications(text, uuid[], text) from public, anon, authenticated;
grant execute on function public.set_void_enforcers_certifications(text, uuid[], text) to service_role;

notify pgrst, 'reload schema';
