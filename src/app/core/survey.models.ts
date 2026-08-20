export const ALL_CATEGORIES = 'All Surveys';

export const SURVEY_CATEGORIES = [
  'Team Activities',
  'Health & Wellness',
  'Gaming & Entertainment',
  'Education & Learning',
  'Lifestyle & Preferences',
  'Technology & Innovation',
] as const;

export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number];

// everything the deadline helpers below need, shared by the list and the detail model
export interface Deadline {
  endsAt: Date | null;
}

export interface SurveyListItem extends Deadline {
  id: string;
  title: string;
  category: string;
}

export function isRunning(survey: Deadline, now: Date = new Date()): boolean {
  return survey.endsAt === null || survey.endsAt > now;
}

export function deadlineLabel(survey: Deadline, now: Date = new Date()): string {
  if (survey.endsAt === null) {
    return 'No deadline';
  }

  const days = Math.ceil((survey.endsAt.getTime() - now.getTime()) / 86_400_000);

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

export interface SurveyOption {
  id: string;
  text: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  allowMultiple: boolean;
  options: SurveyOption[];
}

export interface SurveyDetail extends Deadline {
  id: string;
  title: string;
  description: string | null;
  category: string;
  questions: SurveyQuestion[];
}

export interface OptionResult {
  id: string;
  text: string;
  votes: number;
  percent: number;
}

export interface QuestionResult {
  id: string;
  text: string;
  totalVotes: number;
  options: OptionResult[];
}

// A, B, C … a survey is not expected to run past Z.
export function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

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
