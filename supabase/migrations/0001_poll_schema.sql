-- Poll app: schema, RLS policies, realtime and seed data.
-- Run this in the Supabase SQL editor.

create table if not exists surveys (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  category    text        not null,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists questions (
  id             uuid primary key default gen_random_uuid(),
  survey_id      uuid    not null references surveys(id) on delete cascade,
  text           text    not null,
  position       int     not null,
  allow_multiple boolean not null default false
);

create table if not exists options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  text        text not null,
  position    int  not null
);

create table if not exists votes (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid        not null references options(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_survey on questions (survey_id);
create index if not exists idx_options_question on options (question_id);
create index if not exists idx_votes_option     on votes (option_id);
create index if not exists idx_surveys_ends_at  on surveys (ends_at);

alter table surveys   enable row level security;
alter table questions enable row level security;
alter table options   enable row level security;
alter table votes     enable row level security;

-- Read: open to everyone, the app has no login.
create policy "read surveys"   on surveys   for select to anon using (true);
create policy "read questions" on questions for select to anon using (true);
create policy "read options"   on options   for select to anon using (true);
create policy "read votes"     on votes     for select to anon using (true);

-- Create: anyone may create surveys.
create policy "create surveys"   on surveys   for insert to anon with check (true);
create policy "create questions" on questions for insert to anon with check (true);
create policy "create options"   on options   for insert to anon with check (true);

-- Vote: only while the survey is still running.
create policy "vote on running surveys" on votes for insert to anon with check (
  exists (
    select 1
    from options o
    join questions q on q.id = o.question_id
    join surveys  s on s.id = q.survey_id
    where o.id = votes.option_id
      and (s.ends_at is null or s.ends_at > now())
  )
);

-- No update/delete for anon: without a policy both are denied.

alter publication supabase_realtime add table votes;

insert into surveys (title, description, category, ends_at) values
  ('Let´s Plan the Next Team Event Together',
   'We want to create team activities that everyone will enjoy.',
   'Teamactivities', now() + interval '2 days'),
  ('Fit & Wellness survey!',            null, 'Health',         now() + interval '9 days'),
  ('Which tools should we adopt?',      null, 'Tools',          now() + interval '30 days'),
  ('Summer party location 2026',        null, 'Teamactivities', now() - interval '5 days'),
  ('Office snack preferences',          null, 'Health',         now() - interval '40 days');

with q as (
  insert into questions (survey_id, text, position, allow_multiple)
  select id, 'Which date would work best for you?', 1, true from surveys
  returning id
)
insert into options (question_id, text, position)
select q.id, v.text, v.position
from q
cross join (values
  ('19.09.2026, Friday',   1),
  ('10.10.2026, Friday',   2),
  ('11.10.2026, Saturday', 3),
  ('31.10.2026, Friday',   4)
) as v(text, position);
