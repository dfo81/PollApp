import { Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import { letter, NewSurvey, SURVEY_CATEGORIES } from '../../core/survey.models';

/** One answer of a question that is being drafted. */
interface DraftAnswer {
  /** Stable id for the template, not the database id. */
  id: number;
  text: string;
}

/** One question of a survey that is being drafted. */
interface DraftQuestion {
  /** Stable id for the template, not the database id. */
  id: number;
  text: string;
  allowMultiple: boolean;
  answers: DraftAnswer[];
}

/**
 * Overlay for creating a survey. It validates the draft, writes it to the database and
 * then replaces the form with a confirmation.
 *
 * Errors stay hidden until the first publish attempt, so an untouched form looks calm.
 */
@Component({
  selector: 'app-create-survey',
  imports: [],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class CreateSurvey {
  private readonly surveyService = inject(SurveyService);
  private readonly router = inject(Router);

  /** Asks the host to close the overlay. */
  readonly closed = output<void>();

  /** Carries the id of the new survey, so the host can refresh its lists. */
  readonly published = output<string>();

  private readonly categoryField = viewChild<ElementRef<HTMLElement>>('categoryField');

  /** The categories offered by the dropdown. */
  protected readonly categories = SURVEY_CATEGORIES;

  private nextId = 0;

  /** Title of the survey, a required field. */
  protected readonly title = signal('');

  /** End date as the ISO day of the native date input, empty when not set. */
  protected readonly endDate = signal('');

  /** Optional description of the survey. */
  protected readonly description = signal('');

  /** The questions of the draft, at least one. */
  protected readonly questions = signal<DraftQuestion[]>([this.newQuestion()]);

  /** Selected category, a required field. */
  protected readonly category = signal<string | null>(null);

  /** True while the category dropdown is open. */
  protected readonly categoryOpen = signal(false);

  /** True once publishing was attempted, which reveals the validation errors. */
  protected readonly attempted = signal(false);

  /** True while the survey is being written to the database. */
  protected readonly saving = signal(false);

  /** Message of a failed publish, or null. */
  protected readonly saveError = signal<string | null>(null);

  /** Id of the new survey once it reached the database, which shows the confirmation. */
  protected readonly createdId = signal<string | null>(null);

  /** Letter in front of an answer, see {@link letter}. */
  protected readonly letter = letter;

  /** Appends an empty question to the draft. */
  protected addQuestion(): void {
    this.questions.update((questions) => [...questions, this.newQuestion()]);
  }

  /**
   * Appends an empty answer to a question.
   *
   * @param questionId Id of the question.
   */
  protected addAnswer(questionId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, answers: [...question.answers, { id: this.nextId++, text: '' }] }
          : question,
      ),
    );
  }

  /**
   * Removes a question. A survey keeps at least one, so the template only renders the
   * delete icon while removing is allowed.
   *
   * @param questionId Id of the question.
   */
  protected removeQuestion(questionId: number): void {
    this.questions.update((questions) =>
      questions.filter((question) => question.id !== questionId),
    );
  }

  /**
   * Removes an answer. A question keeps at least two, so the template only renders the
   * delete icon while removing is allowed.
   *
   * @param questionId Id of the question the answer belongs to.
   * @param answerId Id of the answer.
   */
  protected removeAnswer(questionId: number, answerId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, answers: question.answers.filter((answer) => answer.id !== answerId) }
          : question,
      ),
    );
  }

  /**
   * Builds an empty question with the two answers a question needs at minimum.
   *
   * @returns The new question.
   */
  private newQuestion(): DraftQuestion {
    return {
      id: this.nextId++,
      text: '',
      allowMultiple: false,
      answers: [
        { id: this.nextId++, text: '' },
        { id: this.nextId++, text: '' },
      ],
    };
  }

  /**
   * Takes over the survey title.
   *
   * @param event Input event of the title field.
   */
  protected setTitle(event: Event): void {
    this.title.set(value(event));
  }

  /**
   * Takes over the end date.
   *
   * @param event Input event of the date field.
   */
  protected setEndDate(event: Event): void {
    this.endDate.set(value(event));
  }

  /**
   * Takes over the description.
   *
   * @param event Input event of the description field.
   */
  protected setDescription(event: Event): void {
    this.description.set(value(event));
  }

  /**
   * Takes over the text of a question.
   *
   * @param questionId Id of the question.
   * @param event Input event of the question field.
   */
  protected setQuestionText(questionId: number, event: Event): void {
    const text = value(event);
    this.questions.update((questions) =>
      questions.map((question) => (question.id === questionId ? { ...question, text } : question)),
    );
  }

  /**
   * Takes over the text of an answer.
   *
   * @param questionId Id of the question the answer belongs to.
   * @param answerId Id of the answer.
   * @param event Input event of the answer field.
   */
  protected setAnswerText(questionId: number, answerId: number, event: Event): void {
    const text = value(event);
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId ? withAnswerText(question, answerId, text) : question,
      ),
    );
  }

  /**
   * Switches a question between single and multiple choice.
   *
   * @param questionId Id of the question.
   */
  protected toggleAllowMultiple(questionId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, allowMultiple: !question.allowMultiple }
          : question,
      ),
    );
  }

  /** Empties the title field. */
  protected clearTitle(): void {
    this.title.set('');
  }

  /** Empties the end date field. */
  protected clearEndDate(): void {
    this.endDate.set('');
  }

  /** Empties the description field. */
  protected clearDescription(): void {
    this.description.set('');
  }

  /** Opens or closes the category dropdown. */
  protected toggleCategory(): void {
    this.categoryOpen.update((open) => !open);
  }

  /** Closes the category dropdown. */
  protected closeCategory(): void {
    this.categoryOpen.set(false);
  }

  /**
   * Picks a category.
   *
   * @param category The chosen category.
   */
  protected selectCategory(category: string): void {
    this.category.set(category);
    this.closeCategory();
  }

  /**
   * Closes the category dropdown on a click outside of it.
   *
   * @param event Click anywhere in the document.
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.categoryOpen()) {
      return;
    }

    const field = this.categoryField()?.nativeElement;
    if (field && !field.contains(event.target as Node)) {
      this.closeCategory();
    }
  }

  /**
   * Lets Escape close the open dropdown first, not the whole dialog.
   *
   * @param event Escape key press anywhere in the document.
   */
  protected onEscape(event: Event): void {
    if (this.categoryOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeCategory();
    }
  }

  /** True when the survey has no title. */
  protected readonly titleMissing = computed(() => this.title().trim() === '');

  /** True when no category is picked. */
  protected readonly categoryMissing = computed(() => this.category() === null);

  /**
   * True when the end date lies in the past. The date itself is optional, but a past
   * one would close the survey right away.
   */
  protected readonly endDateInvalid = computed(() => {
    const parsed = this.parsedEndDate();
    return parsed !== null && parsed.getTime() <= Date.now();
  });

  /**
   * Tells whether a question is still without text.
   *
   * @param question Question to check.
   * @returns True when the question text is empty.
   */
  protected questionMissing(question: DraftQuestion): boolean {
    return question.text.trim() === '';
  }

  /**
   * Tells whether an answer is still without text.
   *
   * @param answer Answer to check.
   * @returns True when the answer text is empty.
   */
  protected answerMissing(answer: DraftAnswer): boolean {
    return answer.text.trim() === '';
  }

  /**
   * Tells whether a question has at least one empty answer.
   *
   * @param question Question to check.
   * @returns True when any of its answers is without text.
   */
  protected anyAnswerMissing(question: DraftQuestion): boolean {
    return question.answers.some((answer) => this.answerMissing(answer));
  }

  /** True once every required field is filled and the end date is usable. */
  protected readonly valid = computed(
    () =>
      !this.titleMissing() &&
      !this.categoryMissing() &&
      !this.endDateInvalid() &&
      this.questions().every(
        (question) =>
          !this.questionMissing(question) &&
          question.answers.every((answer) => !this.answerMissing(answer)),
      ),
  );

  /**
   * Reads the end date field. The native date input hands over an ISO day, the survey
   * runs to the end of it.
   *
   * @returns The end of the chosen day, or null when no usable date is set.
   */
  private parsedEndDate(): Date | null {
    const raw = this.endDate();
    if (raw === '') {
      return null;
    }

    const parsed = new Date(`${raw}T23:59:59`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Validates the draft and writes it to the database. On success the confirmation
   * replaces the form and the new id is announced through {@link published}, on failure
   * the message lands in {@link saveError}.
   */
  protected async publish(): Promise<void> {
    this.attempted.set(true);
    this.saveError.set(null);

    if (!this.valid() || this.saving()) {
      return;
    }

    this.saving.set(true);
    await this.save(this.buildDraft());
    this.saving.set(false);
  }

  /**
   * Collects the entered values into the draft the service expects.
   *
   * @returns The survey ready to be created.
   */
  private buildDraft(): NewSurvey {
    return {
      title: this.title().trim(),
      description: this.description().trim() || null,
      category: this.category()!,
      endsAt: this.parsedEndDate(),
      questions: this.questions().map((question) => ({
        text: question.text.trim(),
        allowMultiple: question.allowMultiple,
        options: question.answers.map((answer) => answer.text.trim()),
      })),
    };
  }

  /**
   * Writes the draft to the database and records the outcome.
   *
   * @param draft The survey to create.
   */
  private async save(draft: NewSurvey): Promise<void> {
    try {
      const id = await this.surveyService.createSurvey(draft);
      this.createdId.set(id);
      this.published.emit(id);
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  /** Opens the freshly created survey and closes the overlay. */
  protected async openCreated(): Promise<void> {
    const id = this.createdId();
    if (id === null) {
      return;
    }

    await this.router.navigate(['/survey', id]);
    this.closed.emit();
  }
}

/**
 * Reads the current text of an input or textarea.
 *
 * @param event Input event of the field.
 * @returns The value of the field.
 */
function value(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
}

/**
 * Replaces the text of one answer of a question.
 *
 * @param question Question the answer belongs to.
 * @param answerId Id of the answer.
 * @param text The new text.
 * @returns A copy of the question with the updated answer.
 */
function withAnswerText(question: DraftQuestion, answerId: number, text: string): DraftQuestion {
  return {
    ...question,
    answers: question.answers.map((answer) =>
      answer.id === answerId ? { ...answer, text } : answer,
    ),
  };
}
