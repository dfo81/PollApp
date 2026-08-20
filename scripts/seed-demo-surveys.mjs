// Seeds the demo surveys from demo-surveys.mjs into Supabase, each with its questions,
// answers and a vote distribution. Runs against the anon key from
// src/environments/environment.ts, so it only uses the permissions the app itself has.
// Surveys that already exist are skipped, so the script can be re-run safely.
//
//   npm run seed

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DEMO_SURVEYS } from './demo-surveys.mjs';

function readEnvironment() {
  const source = readFileSync(
    new URL('../src/environments/environment.ts', import.meta.url),
    'utf8',
  );
  const url = /supabaseUrl: '([^']+)'/.exec(source)?.[1];
  const key = /supabaseAnonKey: '([^']+)'/.exec(source)?.[1];

  if (!url || !key) {
    throw new Error('supabaseUrl / supabaseAnonKey not found in src/environments/environment.ts');
  }

  return { url, key };
}

function check({ data, error }, what) {
  if (error) {
    throw new Error(`${what} failed: ${error.message}`);
  }
  return data;
}

async function seedSurvey(supabase, demo) {
  const survey = check(
    await supabase
      .from('surveys')
      .insert({
        title: demo.title,
        description: demo.description,
        category: demo.category,
        ends_at: new Date(Date.now() + demo.endsInDays * 86_400_000).toISOString(),
      })
      .select('id')
      .single(),
    `Creating "${demo.title}"`,
  );

  const questions = check(
    await supabase
      .from('questions')
      .insert(
        demo.questions.map((question, index) => ({
          survey_id: survey.id,
          text: question.text,
          position: index + 1,
          allow_multiple: question.allowMultiple,
        })),
      )
      .select('id, position'),
    'Creating the questions',
  );

  const questionIdByPosition = new Map(questions.map((row) => [row.position, row.id]));

  const options = check(
    await supabase
      .from('options')
      .insert(
        demo.questions.flatMap((question, questionIndex) =>
          question.options.map((option, optionIndex) => ({
            question_id: questionIdByPosition.get(questionIndex + 1),
            text: option.text,
            position: optionIndex + 1,
          })),
        ),
      )
      .select('id, question_id, text'),
    'Creating the answer options',
  );

  // Option texts repeat across questions, so the lookup is keyed by question and text.
  const optionIdByKey = new Map(options.map((row) => [`${row.question_id}|${row.text}`, row.id]));

  // One row per vote — the app counts them, there is no aggregate column.
  const votes = demo.questions.flatMap((question, questionIndex) =>
    question.options.flatMap((option) => {
      const optionId = optionIdByKey.get(
        `${questionIdByPosition.get(questionIndex + 1)}|${option.text}`,
      );
      return Array.from({ length: option.votes }, () => ({ option_id: optionId }));
    }),
  );

  check(await supabase.from('votes').insert(votes), 'Creating the votes');

  return {
    id: survey.id,
    questions: demo.questions.length,
    options: options.length,
    votes: votes.length,
  };
}

const { url, key } = readEnvironment();
const supabase = createClient(url, key, { auth: { persistSession: false } });

const existing = check(
  await supabase
    .from('surveys')
    .select('title')
    .in(
      'title',
      DEMO_SURVEYS.map((demo) => demo.title),
    ),
  'Looking up the demo surveys',
);

const seeded = new Set(existing.map((row) => row.title));

for (const demo of DEMO_SURVEYS) {
  if (seeded.has(demo.title)) {
    console.log(`skipped  ${demo.title} — already seeded`);
    continue;
  }

  const result = await seedSurvey(supabase, demo);
  console.log(
    `seeded   ${demo.title}\n` +
      `         ${result.questions} questions, ${result.options} answers, ${result.votes} votes` +
      ` — /survey/${result.id}`,
  );
}
