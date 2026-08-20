import { Component, inject, input, resource } from '@angular/core';
import { PublishedSurvey } from '../published-survey/published-survey';
import { SurveyResults } from '../survey-results/survey-results';
import { SurveyService } from '../../core/survey-service';
import { isRunning, QuestionResult, SurveyDetail } from '../../core/survey.models';

@Component({
  selector: 'app-survey-view',
  imports: [PublishedSurvey, SurveyResults],
  templateUrl: './survey-view.html',
  styleUrl: './survey-view.scss',
})
export class SurveyView {
  private readonly surveyService = inject(SurveyService);

  // bound to the survey/:id route via withComponentInputBinding()
  readonly id = input<string>();

  protected readonly survey = resource({
    params: () => this.id(),
    loader: ({ params }) => this.surveyService.getSurvey(params),
  });

  // reloads whenever the survey changes and after the visitor has voted
  protected readonly results = resource({
    defaultValue: [] as QuestionResult[],
    params: () => this.survey.value(),
    loader: ({ params }) => this.surveyService.loadResults(params),
  });

  protected live(survey: SurveyDetail): boolean {
    return isRunning(survey);
  }

  protected onVoted(): void {
    this.results.reload();
  }
}
