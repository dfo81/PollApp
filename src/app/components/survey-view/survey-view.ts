import { Component, input } from '@angular/core';
import { PublishedSurvey } from '../published-survey/published-survey';
import { SurveyResults } from '../survey-results/survey-results';

@Component({
  selector: 'app-survey-view',
  imports: [PublishedSurvey, SurveyResults],
  templateUrl: './survey-view.html',
  styleUrl: './survey-view.scss',
})
export class SurveyView {
  // gebunden an die Route survey/:id via withComponentInputBinding()
  readonly id = input<string>();
}
