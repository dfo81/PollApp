import { inject, Injectable } from '@angular/core';
import { Supabase } from './supabase';
import { QuestionResult, SurveyDetail, SurveyListItem } from './survey.models';

// supabase-js derives the row type from this literal, so it has to stay one unbroken string
const SURVEY_SELECT =
  'id, title, description, category, ends_at, questions(id, text, position, allow_multiple, options(id, text, position))';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly supabase = inject(Supabase);

  async listSurveys(): Promise<SurveyListItem[]> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('id, title, category, ends_at')
      .order('ends_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Surveys could not be loaded: ${error.message}`);
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      endsAt: row.ends_at ? new Date(row.ends_at) : null,
    }));
  }

  async getSurvey(id: string): Promise<SurveyDetail> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select(SURVEY_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Survey could not be loaded: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      endsAt: data.ends_at ? new Date(data.ends_at) : null,
      // Postgres returns embedded rows unordered, the position columns carry the intended order.
      questions: byPosition(data.questions).map((question) => ({
        id: question.id,
        text: question.text,
        allowMultiple: question.allow_multiple,
        options: byPosition(question.options).map((option) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    };
  }

  // Votes are anonymous rows, so the tally is counted from the raw rows of this survey.
  async loadResults(survey: SurveyDetail): Promise<QuestionResult[]> {
    const optionIds = survey.questions.flatMap((question) =>
      question.options.map((option) => option.id),
    );

    if (optionIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('votes')
      .select('option_id')
      .in('option_id', optionIds);

    if (error) {
      throw new Error(`Results could not be loaded: ${error.message}`);
    }

    const counts = new Map<string, number>();
    for (const vote of data) {
      counts.set(vote.option_id, (counts.get(vote.option_id) ?? 0) + 1);
    }

    return survey.questions.map((question) => {
      const votes = question.options.map((option) => counts.get(option.id) ?? 0);
      const total = votes.reduce((sum, count) => sum + count, 0);

      return {
        id: question.id,
        text: question.text,
        totalVotes: total,
        options: question.options.map((option, index) => ({
          id: option.id,
          text: option.text,
          votes: votes[index],
          percent: total === 0 ? 0 : Math.round((votes[index] / total) * 100),
        })),
      };
    });
  }

  async submitVotes(optionIds: string[]): Promise<void> {
    const { error } = await this.supabase.client
      .from('votes')
      .insert(optionIds.map((optionId) => ({ option_id: optionId })));

    if (error) {
      throw new Error(`Your answers could not be saved: ${error.message}`);
    }
  }
}

function byPosition<T extends { position: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.position - b.position);
}
