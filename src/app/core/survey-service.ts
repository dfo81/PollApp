import { inject, Injectable } from '@angular/core';
import { Supabase } from './supabase';
import { SurveyListItem } from './survey.models';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly supabase = inject(Supabase);

  async listSurveys(): Promise<SurveyListItem[]> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('id, title, category, ends_at')
      .order('ends_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Umfragen konnten nicht geladen werden: ${error.message}`);
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      endsAt: row.ends_at ? new Date(row.ends_at) : null,
    }));
  }
}
