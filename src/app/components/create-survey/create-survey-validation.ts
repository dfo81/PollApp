/**
 * Checks the create form runs on its draft, kept apart from the component so they stay
 * pure functions over the draft data.
 */

import { DraftAnswer, DraftQuestion } from './create-survey-draft';

/**
 * Tells whether a question is still without text.
 *
 * @param question Question to check.
 * @returns True when the question text is empty.
 */
export function questionMissing(question: DraftQuestion): boolean {
  return question.text.trim() === '';
}

/**
 * Tells whether an answer is still without text.
 *
 * @param answer Answer to check.
 * @returns True when the answer text is empty.
 */
export function answerMissing(answer: DraftAnswer): boolean {
  return answer.text.trim() === '';
}

/**
 * Tells whether a question has at least one empty answer.
 *
 * @param question Question to check.
 * @returns True when any of its answers is without text.
 */
export function anyAnswerMissing(question: DraftQuestion): boolean {
  return question.answers.some((answer) => answerMissing(answer));
}

/**
 * Tells whether a question and all of its answers carry text.
 *
 * @param question Question to check.
 * @returns True when nothing is missing.
 */
export function questionComplete(question: DraftQuestion): boolean {
  return !questionMissing(question) && !anyAnswerMissing(question);
}

/**
 * Today as an ISO day, the earliest end date the date field offers. A function rather
 * than a constant so a dialog left open over midnight still reports the right day.
 *
 * @returns Today in the yyyy-mm-dd form the date field expects.
 */
export function todayIso(): string {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${today.getFullYear()}-${month}-${day}`;
}

/**
 * Reads an ISO day as the end of that day, which is when the survey closes.
 *
 * @param iso The day as yyyy-mm-dd, empty when none is set.
 * @returns The end of the chosen day, or null when there is no usable date.
 */
export function parseIsoDay(iso: string): Date | null {
  if (iso === '') {
    return null;
  }

  const parsed = new Date(`${iso}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
