import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import {
  endLabel,
  isRunning,
  letter,
  SurveyDetail,
  SurveyQuestion,
} from '../../core/survey.models';

/** Option ids the visitor has picked. */
export type Selection = ReadonlySet<string>;

/**
 * Ballot of a published survey. A closed survey is still shown but no longer accepts
 * clicks, and each visitor may submit their answers only once.
 */
@Component({
  selector: 'app-published-survey',
  imports: [RouterLink],
  templateUrl: './published-survey.html',
  styleUrl: './published-survey.scss',
})
export class PublishedSurvey {
  private readonly surveyService = inject(SurveyService);

  /** The survey being voted on. */
  readonly survey = input.required<SurveyDetail>();

  /** Tells the parent to reload the results once the votes reached the database. */
  readonly voted = output<void>();

  /**
   * Option ids the visitor picked, across all questions of the survey. The detail view
   * binds it so the results can preview the votes before they are submitted.
   */
  readonly selection = model<Selection>(new Set());

  /** True while the votes are being saved. */
  protected readonly submitting = signal(false);

  /** True once the visitor has voted. */
  protected readonly submitted = signal(false);

  /** Message of a failed submission, or null. */
  protected readonly submitError = signal<string | null>(null);

  /** True while the survey accepts votes. */
  protected readonly running = computed(() => isRunning(this.survey()));

  /** Deadline of the survey as shown above the title. */
  protected readonly deadline = computed(() => endLabel(this.survey().endsAt));

  /** True once at least one option is picked, which enables the submit button. */
  protected readonly hasSelection = computed(() => this.selection().size > 0);

  /** Letter in front of an answer option, see {@link letter}. */
  protected readonly letter = letter;

  /**
   * Tells whether an option is currently picked.
   *
   * @param optionId Id of the option.
   * @returns True when the option is part of the selection.
   */
  protected isSelected(optionId: string): boolean {
    return this.selection().has(optionId);
  }

  /**
   * Picks or unpicks an option. A single choice question replaces its previous answer
   * instead of adding a second one. Does nothing on a closed or already answered survey.
   *
   * @param question Question the option belongs to.
   * @param optionId Id of the option that was clicked.
   */
  protected toggle(question: SurveyQuestion, optionId: string): void {
    if (!this.running() || this.submitted()) {
      return;
    }

    this.selection.update((selection) => nextSelection(selection, question, optionId));
  }

  /**
   * Saves the picked options and announces the vote to the parent. Ignores repeated
   * calls while a submission is running or after it succeeded.
   */
  protected async submit(): Promise<void> {
    if (this.submitting() || this.submitted() || !this.hasSelection()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    await this.saveVotes();
    this.submitting.set(false);
  }

  /** Writes the picked options to the database and records the outcome. */
  private async saveVotes(): Promise<void> {
    try {
      await this.surveyService.submitVotes([...this.selection()]);
      this.submitted.set(true);
      this.voted.emit();
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }
}

/**
 * Applies a click on an option to the current selection. A single choice question
 * replaces its previous answer instead of adding a second one.
 *
 * @param selection Options picked so far.
 * @param question Question the option belongs to.
 * @param optionId Id of the option that was clicked.
 * @returns The new selection.
 */
function nextSelection(
  selection: Selection,
  question: SurveyQuestion,
  optionId: string,
): Selection {
  const next = new Set(selection);

  if (next.has(optionId)) {
    next.delete(optionId);
    return next;
  }
  return pick(next, question, optionId);
}

/**
 * Adds an option to the selection. A single choice question drops its previous answer
 * first, so it never holds two.
 *
 * @param next Selection being built.
 * @param question Question the option belongs to.
 * @param optionId Id of the option to add.
 * @returns The selection including the option.
 */
function pick(next: Set<string>, question: SurveyQuestion, optionId: string): Selection {
  if (!question.allowMultiple) {
    question.options.forEach((option) => next.delete(option.id));
  }

  next.add(optionId);
  return next;
}
