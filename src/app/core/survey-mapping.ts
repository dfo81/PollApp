/**
 * Turns the rows Supabase returns into the models the components work with, and the
 * drafts of the create form back into rows.
 */
import {
  NewSurvey,
  NewSurveyQuestion,
  OptionResult,
  QuestionResult,
  SurveyDetail,
  SurveyListItem,
  SurveyOption,
  SurveyQuestion,
} from './survey.models';
import { QuestionRow, SurveyDetailRow, SurveyRow } from './survey-rows';

/**
 * Sorts embedded rows by their position column, which Postgres does not guarantee.
 *
 * @param rows Rows carrying a position.
 * @returns A new array in ascending position order.
 */
export function byPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

/**
 * Maps a survey row onto the model the lists work with.
 *
 * @param row Survey row as it comes from the database.
 * @returns The survey for the home screen lists.
 */
export function toListItem(row: SurveyRow): SurveyListItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
  };
}

/**
 * Maps a question row with its embedded options onto the detail model.
 *
 * @param row Question row as it comes from the database.
 * @returns The question with its options in their intended order.
 */
export function toQuestion(row: QuestionRow): SurveyQuestion {
  return {
    id: row.id,
    text: row.text,
    allowMultiple: row.allow_multiple,
    options: byPosition(row.options).map((option) => ({ id: option.id, text: option.text })),
  };
}

/**
 * Maps a survey row with its embedded questions onto the detail model.
 *
 * @param row Survey row as it comes from the database.
 * @returns The survey with its questions and options.
 */
export function toDetail(row: SurveyDetailRow): SurveyDetail {
  return {
    ...toListItem(row),
    description: row.description,
    questions: byPosition(row.questions).map(toQuestion),
  };
}

/**
 * Collects the option ids of a whole survey.
 *
 * @param survey Survey to walk.
 * @returns Ids of every option of every question.
 */
export function allOptionIds(survey: SurveyDetail): string[] {
  return survey.questions.flatMap((question) => question.options.map((option) => option.id));
}

/**
 * Turns the raw vote counts of one question into its result.
 *
 * @param question Question to tally.
 * @param counts Votes per option id.
 * @returns Absolute votes and percentages of the question.
 */
export function tally(question: SurveyQuestion, counts: Map<string, number>): QuestionResult {
  const votes = question.options.map((option) => counts.get(option.id) ?? 0);
  const total = votes.reduce((sum, count) => sum + count, 0);

  return {
    id: question.id,
    text: question.text,
    totalVotes: total,
    options: question.options.map((option, index) => share(option, votes[index], total)),
  };
}

/**
 * Puts one option next to its share of the votes of its question.
 *
 * @param option The answer option.
 * @param votes Votes this option received.
 * @param total Votes of the whole question.
 * @returns The result of the option, with the percentage rounded.
 */
export function share(option: SurveyOption, votes: number, total: number): OptionResult {
  return {
    id: option.id,
    text: option.text,
    votes,
    percent: total === 0 ? 0 : Math.round((votes / total) * 100),
  };
}

/**
 * Lays the options a visitor has ticked but not yet submitted on top of the tally, so
 * the bars show right away what those votes would do to the percentages. The extra
 * votes exist in this browser only, until the ballot is submitted.
 *
 * @param results Results as they were counted in the database.
 * @param selection Option ids the visitor has ticked, across all questions.
 * @returns The results including the pending votes.
 */
export function withPreview(
  results: QuestionResult[],
  selection: ReadonlySet<string>,
): QuestionResult[] {
  if (selection.size === 0) {
    return results;
  }

  return results.map((question) => previewQuestion(question, selection));
}

/**
 * Adds the pending votes of one question to its result. Recounts the percentages the
 * same way {@link tally} does, so they do not jump once the real votes come back.
 *
 * @param question Result of the question as it was counted in the database.
 * @param selection Option ids the visitor has ticked, across all questions.
 * @returns The result of the question including its pending votes.
 */
function previewQuestion(question: QuestionResult, selection: ReadonlySet<string>): QuestionResult {
  const votes = question.options.map((option) => option.votes + (selection.has(option.id) ? 1 : 0));
  const total = votes.reduce((sum, count) => sum + count, 0);

  return {
    ...question,
    totalVotes: total,
    options: question.options.map((option, index) => share(option, votes[index], total)),
  };
}

/**
 * Counts how often each option appears in the raw vote rows.
 *
 * @param rows Vote rows of the survey.
 * @returns Votes per option id.
 */
export function countPerOption(rows: { option_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const vote of rows) {
    counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Builds the database row of the survey itself.
 *
 * @param draft The survey as entered in the create dialog.
 * @returns Row ready to be inserted.
 */
export function toSurveyRow(draft: NewSurvey) {
  return {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    ends_at: draft.endsAt ? draft.endsAt.toISOString() : null,
  };
}

/**
 * Builds the database row of one drafted question.
 *
 * @param surveyId Id of the survey the question belongs to.
 * @param question The drafted question.
 * @param index Zero based position of the question.
 * @returns Row ready to be inserted.
 */
export function toQuestionRow(surveyId: string, question: NewSurveyQuestion, index: number) {
  return {
    survey_id: surveyId,
    text: question.text,
    position: index + 1,
    allow_multiple: question.allowMultiple,
  };
}

/**
 * Builds the database rows of the options of one drafted question.
 *
 * @param questionId Id of the freshly inserted question.
 * @param question The drafted question the option texts come from.
 * @returns Rows ready to be inserted.
 */
export function toOptionRows(questionId: string, question: NewSurveyQuestion) {
  return question.options.map((text, index) => ({
    question_id: questionId,
    text,
    position: index + 1,
  }));
}
