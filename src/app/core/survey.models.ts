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

export interface SurveyListItem {
  id: string;
  title: string;
  category: string;
  endsAt: Date | null;
}

export function isRunning(survey: SurveyListItem, now: Date = new Date()): boolean {
  return survey.endsAt === null || survey.endsAt > now;
}

export function deadlineLabel(survey: SurveyListItem, now: Date = new Date()): string {
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
