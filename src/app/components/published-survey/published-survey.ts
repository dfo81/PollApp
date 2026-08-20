import { Component, computed, inject, input, output, signal } from '@angular/core';
import { SurveyService } from '../../core/survey-service';
import {
  endLabel,
  isRunning,
  letter,
  SurveyDetail,
  SurveyQuestion,
} from '../../core/survey.models';

@Component({
  selector: 'app-published-survey',
  imports: [],
  templateUrl: './published-survey.html',
  styleUrl: './published-survey.scss',
})
export class PublishedSurvey {
  private readonly surveyService = inject(SurveyService);

  readonly survey = input.required<SurveyDetail>();

  // tells the parent to reload the results after the votes reached the database
  readonly voted = output<void>();

  // option ids the visitor picked, across all questions of the survey
  private readonly selection = signal<ReadonlySet<string>>(new Set());

  protected readonly submitting = signal(false);

  protected readonly submitted = signal(false);

  protected readonly submitError = signal<string | null>(null);

  protected readonly running = computed(() => isRunning(this.survey()));

  protected readonly deadline = computed(() => endLabel(this.survey().endsAt));

  protected readonly hasSelection = computed(() => this.selection().size > 0);

  protected readonly letter = letter;

  protected isSelected(optionId: string): boolean {
    return this.selection().has(optionId);
  }

  protected toggle(question: SurveyQuestion, optionId: string): void {
    if (!this.running() || this.submitted()) {
      return;
    }

    this.selection.update((selection) => {
      const next = new Set(selection);

      if (next.has(optionId)) {
        next.delete(optionId);
        return next;
      }

      // A single-choice question replaces its previous answer instead of adding a second one.
      if (!question.allowMultiple) {
        for (const option of question.options) {
          next.delete(option.id);
        }
      }

      next.add(optionId);
      return next;
    });
  }

  protected async submit(): Promise<void> {
    if (this.submitting() || this.submitted() || !this.hasSelection()) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      await this.surveyService.submitVotes([...this.selection()]);
      this.submitted.set(true);
      this.voted.emit();
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      this.submitting.set(false);
    }
  }
}
