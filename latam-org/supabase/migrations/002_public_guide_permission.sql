-- Permiso global para publicar guías con section_id NULL.
-- Solo el admin principal lo puede conceder desde la API.
alter table public.users
  add column if not exists can_publish_public_guides boolean not null default false;
