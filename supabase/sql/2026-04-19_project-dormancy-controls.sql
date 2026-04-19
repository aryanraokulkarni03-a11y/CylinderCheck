create table if not exists public.project_runtime_state (
  state_key text primary key,
  lifecycle_state text not null default 'dormant',
  block_all_requests boolean not null default true,
  public_notice_title text not null default 'CylinderCheck has been discontinued',
  public_notice_body text not null default 'This project has been shut down by Team Xisch and is no longer operating.',
  public_notice_signature text not null default 'Team Xisch',
  robots_directive text not null default 'noindex, nofollow, noarchive',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_runtime_state_lifecycle_check
    check (lifecycle_state in ('active', 'dormant')),
  constraint project_runtime_state_robots_check
    check (char_length(trim(robots_directive)) > 0)
);

create or replace function public.set_project_runtime_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists project_runtime_state_set_updated_at on public.project_runtime_state;
create trigger project_runtime_state_set_updated_at
before update on public.project_runtime_state
for each row
execute function public.set_project_runtime_state_updated_at();

insert into public.project_runtime_state (
  state_key,
  lifecycle_state,
  block_all_requests,
  public_notice_title,
  public_notice_body,
  public_notice_signature,
  robots_directive
)
values (
  'primary',
  'dormant',
  true,
  'CylinderCheck has been discontinued',
  'This project has been shut down by Team Xisch and is no longer operating.',
  'Team Xisch',
  'noindex, nofollow, noarchive'
)
on conflict (state_key) do update
set
  lifecycle_state = excluded.lifecycle_state,
  block_all_requests = excluded.block_all_requests,
  public_notice_title = excluded.public_notice_title,
  public_notice_body = excluded.public_notice_body,
  public_notice_signature = excluded.public_notice_signature,
  robots_directive = excluded.robots_directive;

alter table public.project_runtime_state enable row level security;

drop policy if exists "project_runtime_state_no_anon" on public.project_runtime_state;
drop policy if exists "project_runtime_state_no_authenticated" on public.project_runtime_state;

revoke all on public.project_runtime_state from public, anon, authenticated;
