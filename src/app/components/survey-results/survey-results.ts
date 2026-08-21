import { Component, input, signal } from '@angular/core';
import { letter, QuestionResult } from '../../core/survey.models';

/**
 * Tally of a survey as a bar per answer option. On desktop it sits next to the ballot,
 * below that breakpoint it collapses behind a "See results" button.
 */
@Component({
  selector: 'app-survey-results',
  imports: [],
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.scss',
})
export class SurveyResults {
  /** One result per question of the survey. */
  readonly results = input.required<QuestionResult[]>();

  /** True while the results are being loaded. */
  readonly loading = input(false);

  /** False for a closed survey, whose results are final instead of live. */
  readonly live = input(true);

  /** Only used below the desktop breakpoint, where the results are collapsible. */
  protected readonly resultsOpen = signal(false);

  /** Letter in front of an answer option, see {@link letter}. */
  protected readonly letter = letter;

  /** Shows or hides the results below the desktop breakpoint. */
  protected toggleResults(): void {
    this.resultsOpen.update((open) => !open);
  }
}
