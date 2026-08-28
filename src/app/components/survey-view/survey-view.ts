import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { PublishedSurvey, Selection } from '../published-survey/published-survey';
import { SurveyResults } from '../survey-results/survey-results';
import { SurveyService } from '../../core/survey-service';
import { withPreview } from '../../core/survey-mapping';
import { isRunning, QuestionResult, SurveyDetail } from '../../core/survey.models';

/**
 * Detail page of one survey: the ballot on the left, the live results next to it.
 * The results follow every vote, including those of other visitors.
 */
@Component({
  selector: 'app-survey-view',
  imports: [PublishedSurvey, SurveyResults],
  templateUrl: './survey-view.html',
  styleUrl: './survey-view.scss',
})
export class SurveyView {
  private readonly surveyService = inject(SurveyService);
  private readonly router = inject(Router);

  /** Votes arrive one by one, this collects a burst into a single reload. */
  private static readonly RELOAD_DELAY_MS = 300;

  /** Id of the survey, bound to the survey/:id route via withComponentInputBinding(). */
  readonly id = input<string>();

  /** The survey being shown. */
  protected readonly survey = resource({
    params: () => this.id(),
    loader: ({ params }) => this.surveyService.getSurvey(params),
  });

  /**
   * Tally of the survey. Reloads when the survey changes, after the visitor has voted
   * and whenever a vote of somebody else comes in.
   */
  protected readonly results = resource({
    defaultValue: [] as QuestionResult[],
    params: () => this.survey.value(),
    loader: ({ params }) => this.surveyService.loadResults(params),
  });

  /**
   * Options the visitor has ticked on the ballot, bound to the ballot itself. Not saved
   * anywhere: they only exist until the ballot is submitted or the page is left.
   */
  protected readonly selection = signal<Selection>(new Set());

  /** True once the visitor has voted, from then on their votes are in the results. */
  private readonly voted = signal(false);

  /**
   * True while ticked but unsaved options are laid on top of the results. Ends with the
   * vote, otherwise the visitor would be counted twice: once in the preview and once in
   * the reloaded results.
   */
  protected readonly previewing = computed(() => !this.voted() && this.selection().size > 0);

  /** The results as shown, including the options the visitor has ticked so far. */
  protected readonly shownResults = computed(() =>
    this.previewing()
      ? withPreview(this.results.value(), this.selection())
      : this.results.value(),
  );

  /** Option ids of the survey on screen, used to sort out votes of other surveys. */
  private readonly optionIds = computed(
    () =>
      new Set(
        this.survey
          .value()
          ?.questions.flatMap((question) => question.options.map((option) => option.id)) ?? [],
      ),
  );

  private reloadTimer?: ReturnType<typeof setTimeout>;

  /** Subscribes to incoming votes and ends the subscription with the component. */
  constructor() {
    const destroyRef = inject(DestroyRef);

    const unsubscribe = this.surveyService.watchVotes((optionId) => {
      if (this.optionIds().has(optionId)) {
        this.scheduleReload();
      }
    });

    destroyRef.onDestroy(() => {
      clearTimeout(this.reloadTimer);
      unsubscribe();
    });
  }

  /**
   * Tells whether the results are still moving.
   *
   * @param survey Survey on screen.
   * @returns True while the survey accepts votes.
   */
  protected live(survey: SurveyDetail): boolean {
    return isRunning(survey);
  }

  /** Sends the visitor back to the overview once their votes are saved. */
  protected onVoted(): void {
    this.voted.set(true);
    void this.router.navigate(['/']);
  }

  /** Reloads the results once the incoming votes have settled. */
  private scheduleReload(): void {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.results.reload(), SurveyView.RELOAD_DELAY_MS);
  }
}
