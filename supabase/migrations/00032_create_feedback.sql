create table if not exists beta_feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references users(id),
  category   text        not null check (category in ('bug', 'ux', 'missing-feature', 'positive')),
  body       text        not null,
  page_url   text,
  severity   text        check (severity in ('p0', 'p1', 'p2', 'p3')),
  created_at timestamptz not null default now()
);

alter table beta_feedback enable row level security;

-- Users can insert their own feedback
create policy "users_insert_own_feedback" on beta_feedback
  for insert
  with check (user_id = auth.uid());

-- Admins can read all feedback
create policy "admins_read_all_feedback" on beta_feedback
  for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.notification_prefs->>'is_admin')::boolean = true
    )
  );
