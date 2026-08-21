/** Label of the filter entry that clears the category selection. */
export const ALL_CATEGORIES = 'All Surveys';

/** Milliseconds of one day, used to count the days up to a deadline. */
const MS_PER_DAY = 86_400_000;

/** Char code of "A", the letter of the first answer option. */
const LETTER_A = 65;

/** The categories a survey can be filed under, in the order the dropdowns list them. */
export const SURVEY_CATEGORIES = [
  'Team Activities',
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Lifestyle & Preferences',
  'Technology & Innovation',
] as const;

/** One of the values of {@link SURVEY_CATEGORIES}. */
export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];

/**
 * Everything the deadline helpers need, shared by the list and the detail model.
 */
export interface Deadline {
  /** End of the survey, or null when it runs indefinitely. */
  endsAt: Date | null;
}

/** A survey as shown in the lists on the home screen. */
export interface SurveyListItem extends Deadline {
  id: string;
  title: string;
  category: string;
}

/**
 * Tells whether a survey still accepts votes.
 *
 * @param survey Survey to check.
 * @param now Point in time to compare against, defaults to the current time.
 * @returns True while the survey has no deadline or its deadline lies ahead.
 */
export function isRunning(survey: Deadline, now: Date = new Date()): boolean {
  return survey.endsAt === null || survey.endsAt > now;
}

/**
 * Builds the short deadline text of the survey cards, for example "Ends in 3 days".
 *
 * @param survey Survey to describe.
 * @param now Point in time the remaining days are counted from.
 * @returns Human readable deadline for the card label.
 */
export function deadlineLabel(survey: Deadline, now: Date = new Date()): string {
  if (survey.endsAt === null) {
    return 'No deadline';
  }

  return remainingLabel(daysUntil(survey.endsAt, now));
}

/**
 * Counts the days that are left up to a deadline, rounded up.
 *
 * @param endsAt End of the survey.
 * @param now Point in time to count from.
 * @returns Days left, negative once the deadline has passed.
 */
function daysUntil(endsAt: Date, now: Date): number {
  return Math.ceil((endsAt.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Puts the remaining days into words.
 *
 * @param days Days left up to the deadline.
 * @returns Human readable deadline for the card label.
 */
function remainingLabel(days: number): string {
  if (days < 0) {
    return 'Ended';
  }
  if (days === 0) {
    return 'Ends today';
  }
  if (days === 1) {
    return 'Ends in 1 day';
  }
  return `Ends in ${days} days`;
}

/** A single answer option of a question. */
export interface SurveyOption {
  id: string;
  text: string;
}

/** A question with all of its answer options. */
export interface SurveyQuestion {
  id: string;
  text: string;
  /** True when the visitor may tick more than one option. */
  allowMultiple: boolean;
  options: SurveyOption[];
}

/** A survey with everything the detail view renders. */
export interface SurveyDetail extends Deadline {
  id: string;
  title: string;
  description: string | null;
  category: string;
  questions: SurveyQuestion[];
}

/** Vote count of one option, both absolute and as a share of its question. */
export interface OptionResult {
  id: string;
  text: string;
  votes: number;
  percent: number;
}

/** Tallied result of one question. */
export interface QuestionResult {
  id: string;
  text: string;
  totalVotes: number;
  options: OptionResult[];
}

/**
 * Turns an index into the answer letter shown in front of an option.
 * A survey is not expected to run past Z.
 *
 * @param index Zero based position of the option.
 * @returns The matching capital letter, "A" for 0.
 */
export function letter(index: number): string {
  return String.fromCharCode(LETTER_A + index);
}

/**
 * Builds the long deadline text of the detail view, for example "Ends on 30.09.2026".
 *
 * @param endsAt End of the survey, or null when it runs indefinitely.
 * @returns Human readable deadline in German date format.
 */
export function endLabel(endsAt: Date | null): string {
  if (endsAt === null) {
    return 'No deadline';
  }

  const date = endsAt.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return endsAt > new Date() ? `Ends on ${date}` : `Ended on ${date}`;
}

/**
 * A question of a survey that is being drafted in the create dialog.
 * Ids and positions are assigned by the database.
 */
export interface NewSurveyQuestion {
  text: string;
  allowMultiple: boolean;
  /** Answer texts in the order they were entered. */
  options: string[];
}

/** What the create dialog hands to {@link SurveyService.createSurvey}. */
export interface NewSurvey {
  title: string;
  description: string | null;
  category: string;
  endsAt: Date | null;
  questions: NewSurveyQuestion[];
}
