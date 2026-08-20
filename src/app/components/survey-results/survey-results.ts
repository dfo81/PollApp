import { Component, input, signal } from '@angular/core';
import { letter, QuestionResult } from '../../core/survey.models';

@Component({
  selector: 'app-survey-results',
  imports: [],
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.scss',
})
export class SurveyResults {
  readonly results = input.required<QuestionResult[]>();

  readonly loading = input(false);

  // a closed survey still shows its results, they just stop moving
  readonly live = input(true);

  // Only used below the desktop breakpoint; on desktop the results are always visible.
  protected readonly resultsOpen = signal(false);

  protected readonly letter = letter;

  protected toggleResults(): void {
    this.resultsOpen.update((open) => !open);
  }
}
