import { inject, Injectable } from '@angular/core';
import { Supabase } from './supabase';
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
import { SurveyDetailRow, SurveyRow } from './survey-rows';
import {
  allOptionIds,
  countPerOption,
  tally,
  toDetail,
  toListItem,
  toOptionRows,
  toQuestionRow,
  toSurveyRow,
} from './survey-mapping';

const SURVEY_SELECT =
  'id, title, description, category, ends_at, questions(id, text, position, allow_multiple, options(id, text, position))';

/**
 * Reads and writes surveys, questions, options and votes in Supabase and maps the
 * database rows onto the models the components work with.
 */
@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly supabase = inject(Supabase);

  /**
   * Loads all surveys for the home screen, earliest deadline first.
   *
   * @returns The surveys without their questions.
   * @throws Error when the request fails.
   */
  async listSurveys(): Promise<SurveyListItem[]> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('id, title, category, ends_at')
      .order('ends_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Surveys could not be loaded: ${error.message}`);
    }

    return data.map(toListItem);
  }

  /**
   * Loads one survey with all of its questions and options.
   *
   * @param id Id of the survey.
   * @returns The survey with its questions and options in their intended order.
   * @throws Error when the survey does not exist or the request fails.
   */
  async getSurvey(id: string): Promise<SurveyDetail> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select(SURVEY_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Survey could not be loaded: ${error.message}`);
    }
    return toDetail(data);
  }

  /**
   * Counts the votes of a survey. Votes are anonymous rows, so the tally is built
   * from the raw rows of this survey.
   *
   * @param survey Survey whose options are counted.
   * @returns One result per question, with absolute votes and percentages.
   * @throws Error when the request fails.
   */
  async loadResults(survey: SurveyDetail): Promise<QuestionResult[]> {
    const optionIds = allOptionIds(survey);

    if (optionIds.length === 0) {
      return [];
    }

    const counts = await this.countVotes(optionIds);
    return survey.questions.map((question) => tally(question, counts));
  }

  /**
   * Counts how often each option was voted for.
   *
   * @param optionIds Options to count.
   * @returns Votes per option id, missing for options without a vote.
   * @throws Error when the request fails.
   */
  private async countVotes(optionIds: string[]): Promise<Map<string, number>> {
    const { data, error } = await this.supabase.client
      .from('votes')
      .select('option_id')
      .in('option_id', optionIds);

    if (error) {
      throw new Error(`Results could not be loaded: ${error.message}`);
    }

    return countPerOption(data);
  }

  /**
   * Creates a survey with its questions and options.
   *
   * The REST API offers no transaction, so the inserts are chained and the survey row
   * is removed again if a later step fails. That cleanup is best effort: the anon role
   * has no delete policy, so an empty survey may stay behind. It does not show up in
   * the detail view either way.
   *
   * @param draft The survey as entered in the create dialog.
   * @returns Id of the new survey.
   * @throws Error when any of the inserts fails.
   */
  async createSurvey(draft: NewSurvey): Promise<string> {
    const surveyId = await this.insertSurvey(draft);

    try {
      await this.insertQuestions(surveyId, draft);
    } catch (cause) {
      await this.supabase.client.from('surveys').delete().eq('id', surveyId);
      throw new Error(
        `Survey could not be created: ${cause instanceof Error ? cause.message : cause}`,
      );
    }

    return surveyId;
  }

  /**
   * Inserts the survey row itself.
   *
   * @param draft The survey as entered in the create dialog.
   * @returns Id of the new survey.
   * @throws Error when the insert fails.
   */
  private async insertSurvey(draft: NewSurvey): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .insert(toSurveyRow(draft))
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data.id;
  }

  /**
   * Inserts the questions of a survey together with their options.
   *
   * @param surveyId Id of the survey the questions belong to.
   * @param draft The survey as entered in the create dialog.
   * @throws Error when one of the inserts fails.
   */
  private async insertQuestions(surveyId: string, draft: NewSurvey): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('questions')
      .insert(draft.questions.map((question, index) => toQuestionRow(surveyId, question, index)))
      .select('id, position');

    if (error) {
      throw new Error(error.message);
    }

    await this.insertOptions(
      data.flatMap((row) => toOptionRows(row.id, draft.questions[row.position - 1])),
    );
  }

  /**
   * Inserts the answer options of all questions of a survey.
   *
   * @param options Rows ready to be inserted.
   * @throws Error when the insert fails.
   */
  private async insertOptions(
    options: { question_id: string; text: string; position: number }[],
  ): Promise<void> {
    const { error } = await this.supabase.client.from('options').insert(options);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Subscribes to incoming votes so the results can update live. The votes table is
   * part of the supabase_realtime publication, see migration 0001.
   *
   * @param onVote Called with the option id of every inserted vote, across all surveys.
   * @returns Function that ends the subscription.
   */
  watchVotes(onVote: (optionId: string) => void): () => void {
    const channel = this.supabase.client
      .channel('votes-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) =>
        onVote((payload.new as { option_id: string }).option_id),
      )
      .subscribe();

    return () => {
      void this.supabase.client.removeChannel(channel);
    };
  }

  /**
   * Stores the answers of one visitor.
   *
   * @param optionIds Options the visitor picked, across all questions of the survey.
   * @throws Error when the votes cannot be saved, for example on a closed survey.
   */
  async submitVotes(optionIds: string[]): Promise<void> {
    const { error } = await this.supabase.client
      .from('votes')
      .insert(optionIds.map((optionId) => ({ option_id: optionId })));

    if (error) {
      throw new Error(`Your answers could not be saved: ${error.message}`);
    }
  }
}
