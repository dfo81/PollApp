/**
 * Seeds the demo surveys from demo-surveys.mjs into Supabase, each with its questions,
 * answers and votes. Runs against the anon key from src/environments/environment.ts, so
 * it only uses the permissions the app itself has. Surveys whose title already exists are
 * skipped, which makes the script safe to re-run.
 *
 *   npm run seed
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DEMO_SURVEYS } from './demo-surveys.mjs';

/**
 * Reads the Supabase credentials out of the environment file.
 *
 * @returns The project url and the anon key.
 * @throws Error when the file holds neither.
 */
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

/**
 * Unwraps a Supabase response and turns a failure into an exception.
 *
 * @param response Result of a Supabase query.
 * @param what Step name for the error message.
 * @returns The data of the response.
 * @throws Error when the response carries one.
 */
function check({ data, error }, what) {
  if (error) {
    throw new Error(`${what} failed: ${error.message}`);
  }
  return data;
}

/**
 * Builds the row for the surveys table.
 *
 * @param demo One entry of DEMO_SURVEYS.
 * @returns The row to insert.
 */
function surveyRow(demo) {
  return {
    title: demo.title,
    description: demo.description,
    category: demo.category,
    ends_at: new Date(Date.now() + demo.endsInDays * 86_400_000).toISOString(),
  };
}

/**
 * Writes the survey row itself.
 *
 * @param supabase The Supabase client.
 * @param demo One entry of DEMO_SURVEYS.
 * @returns The id of the new survey.
 */
async function insertSurvey(supabase, demo) {
  const survey = check(
    await supabase.from('surveys').insert(surveyRow(demo)).select('id').single(),
    `Creating "${demo.title}"`,
  );

  return survey.id;
}

/**
 * Builds the rows for the questions table.
 *
 * @param demo One entry of DEMO_SURVEYS.
 * @param surveyId Id of the survey they belong to.
 * @returns The rows to insert.
 */
function questionRows(demo, surveyId) {
  return demo.questions.map((question, index) => ({
    survey_id: surveyId,
    text: question.text,
    position: index + 1,
    allow_multiple: question.allowMultiple,
  }));
}

/**
 * Writes the questions of a survey.
 *
 * @param supabase The Supabase client.
 * @param demo One entry of DEMO_SURVEYS.
 * @param surveyId Id of the survey they belong to.
 * @returns The new question ids, keyed by their position.
 */
async function insertQuestions(supabase, demo, surveyId) {
  const rows = check(
    await supabase.from('questions').insert(questionRows(demo, surveyId)).select('id, position'),
    'Creating the questions',
  );

  return new Map(rows.map((row) => [row.position, row.id]));
}

/**
 * Builds the rows for the options table.
 *
 * @param demo One entry of DEMO_SURVEYS.
 * @param questionIds Question ids keyed by position.
 * @returns The rows to insert.
 */
function optionRows(demo, questionIds) {
  return demo.questions.flatMap((question, questionIndex) =>
    question.options.map((option, optionIndex) => ({
      question_id: questionIds.get(questionIndex + 1),
      text: option.text,
      position: optionIndex + 1,
    })),
  );
}

/**
 * Writes the answer options of every question.
 *
 * @param supabase The Supabase client.
 * @param demo One entry of DEMO_SURVEYS.
 * @param questionIds Question ids keyed by position.
 * @returns The new option ids, keyed by question id and option text.
 */
async function insertOptions(supabase, demo, questionIds) {
  const rows = check(
    await supabase
      .from('options')
      .insert(optionRows(demo, questionIds))
      .select('id, question_id, text'),
    'Creating the answer options',
  );

  return new Map(rows.map((row) => [`${row.question_id}|${row.text}`, row.id]));
}

/**
 * Spreads the vote counts of the demo data into one row per vote, which is how the app
 * stores them.
 *
 * @param demo One entry of DEMO_SURVEYS.
 * @param questionIds Question ids keyed by position.
 * @param optionIds Option ids keyed by question id and option text.
 * @returns The rows to insert into votes.
 */
function buildVotes(demo, questionIds, optionIds) {
  return demo.questions.flatMap((question, questionIndex) =>
    question.options.flatMap((option) => {
      const key = `${questionIds.get(questionIndex + 1)}|${option.text}`;
      const optionId = optionIds.get(key);
      return Array.from({ length: option.votes }, () => ({ option_id: optionId }));
    }),
  );
}

/**
 * Writes one demo survey with its questions, answers and votes.
 *
 * Surveys that have already ended stay without votes: the RLS policy rejects them once
 * ends_at has passed, and anon may not backdate a survey afterwards.
 *
 * @param supabase The Supabase client.
 * @param demo One entry of DEMO_SURVEYS.
 * @returns How much was written, and whether the survey had already ended.
 */
async function seedSurvey(supabase, demo) {
  const id = await insertSurvey(supabase, demo);
  const questionIds = await insertQuestions(supabase, demo, id);
  const optionIds = await insertOptions(supabase, demo, questionIds);
  const votes = buildVotes(demo, questionIds, optionIds);
  const expired = demo.endsInDays <= 0;

  if (!expired) {
    check(await supabase.from('votes').insert(votes), 'Creating the votes');
  }

  const counts = { questions: demo.questions.length, options: optionIds.size };
  return { id, ...counts, votes: expired ? 0 : votes.length, expired };
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
    `seeded   ${demo.title}${result.expired ? ' (already ended, no votes)' : ''}\n` +
      `         ${result.questions} questions, ${result.options} answers, ${result.votes} votes` +
      ` — /survey/${result.id}`,
  );
}
