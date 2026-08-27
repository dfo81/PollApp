/**
 * Shapes of the survey rows as they come back from Supabase, shared by the service and
 * the mapping helpers.
 */

/** Option row as it comes from the database. */
export interface OptionRow {
  id: string;
  text: string;
  position: number;
}

/** Question row with its embedded options. */
export interface QuestionRow {
  id: string;
  text: string;
  position: number;
  allow_multiple: boolean;
  options: OptionRow[];
}

/** Survey row as the lists select it. */
export interface SurveyRow {
  id: string;
  title: string;
  category: string;
  ends_at: string | null;
}

/** Survey row with everything the detail view needs. */
export interface SurveyDetailRow extends SurveyRow {
  description: string | null;
  questions: QuestionRow[];
}
