-- Gibt den bereits abgelaufenen Surveys nachträglich Stimmen.
--
-- Warum SQL: die Policy "vote on running surveys" (0001_poll_schema.sql:56) lässt für
-- anon nur Stimmen zu, solange ends_at in der Zukunft liegt. Der Seed-Skript-Weg kann
-- diese Surveys deshalb nicht befüllen. Im Dashboard-Editor läuft das als service_role
-- und umgeht RLS.
--
-- Supabase Dashboard → SQL Editor → einfügen → Run.
-- Projekt: cwhgedopgdfwygatvktt
-- Mehrfach ausführen verdoppelt die Stimmen — nur einmal laufen lassen.

with target as (
  select
    o.id as option_id,
    -- Deterministisch aus der Options-Id abgeleitet: gleiche Option, gleiche Zahl.
    -- Ergibt 8 bis 29 Stimmen und damit ein ungleichmäßiges, plausibles Bild.
    8 + (('x' || substr(md5(o.id::text), 1, 4))::bit(16)::int % 22) as vote_count
  from options o
  join questions q on q.id = o.question_id
  join surveys   s on s.id = q.survey_id
  where s.ends_at is not null
    and s.ends_at < now()
)
insert into votes (option_id)
select option_id
from target, generate_series(1, target.vote_count);

-- Kontrolle: die abgelaufenen Surveys sollten jetzt Stimmen haben.
select
  s.title,
  s.ends_at::date as ends_on,
  count(v.id)     as votes
from surveys s
join questions q on q.survey_id = s.id
join options   o on o.question_id = q.id
left join votes v on v.option_id = o.id
where s.ends_at is not null
  and s.ends_at < now()
group by s.id, s.title, s.ends_at
order by s.ends_at;
