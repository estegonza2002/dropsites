create table if not exists beta_invites (
  id           uuid        primary key default gen_random_uuid(),
  email        text        not null unique,
  invite_code  text        not null unique default substr(md5(random()::text), 1, 12),
  status       text        not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  notes        text,
  invited_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  created_by   uuid        references users(id)
);

alter table beta_invites enable row level security;

-- Only admins (users with notification_prefs->is_admin = true) can read/write
create policy "admins_all_beta_invites" on beta_invites
  for all
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.notification_prefs->>'is_admin')::boolean = true
    )
  );
