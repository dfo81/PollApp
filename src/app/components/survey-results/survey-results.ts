import { Component, computed, effect, input, signal } from '@angular/core';
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

  /**
   * True while the results include the options the visitor has ticked but not yet
   * submitted. Only used to open the collapsed results, the bars themselves need no
   * marker: the numbers are as live as the badge above them says.
   */
  readonly preview = input(false);

  /**
   * True as soon as a single vote is in. The service returns one entry per question
   * whether or not it was voted on, so an empty array is not what marks a fresh survey.
   */
  protected readonly hasVotes = computed(() =>
    this.results().some((question) => question.totalVotes > 0),
  );

  /** Only used below the desktop breakpoint, where the results are collapsible. */
  protected readonly resultsOpen = signal(false);

  /** Letter in front of an answer option, see {@link letter}. */
  protected readonly letter = letter;

  /**
   * Opens the results as soon as a preview starts, so the bars are not hidden behind the
   * button while the visitor ticks their answers. Only reacts to the start of a preview,
   * a visitor who closes the results again is left alone.
   */
  constructor() {
    effect(() => {
      if (this.preview()) {
        this.resultsOpen.set(true);
      }
    });
  }

  /** Shows or hides the results below the desktop breakpoint. */
  protected toggleResults(): void {
    this.resultsOpen.update((open) => !open);
  }
}
