import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import { letter, NewSurvey } from '../../core/survey.models';
import { CategorySelect } from '../category-select/category-select';
import { DatePicker } from '../date-picker/date-picker';
import { DraftQuestion, value, withAnswerText, withoutAnswer } from './create-survey-draft';
import {
  answerMissing,
  anyAnswerMissing,
  parseIsoDay,
  questionComplete,
  questionMissing,
  todayIso,
} from './create-survey-validation';

/** How long the "published" overlay sits over the button before the survey opens. */
const PUBLISHED_OVERLAY_MS = 1800;

/**
 * Overlay for creating a survey. It validates the draft, writes it to the database and
 * then replaces the form with a confirmation.
 *
 * Errors stay hidden until the first publish attempt, so an untouched form looks calm.
 */
@Component({
  selector: 'app-create-survey',
  imports: [DatePicker, CategorySelect],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private readonly surveyService = inject(SurveyService);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.viewTimer));
  }

  /** Asks the host to close the overlay. */
  readonly closed = output<void>();

  /** Carries the id of the new survey, so the host can refresh its lists. */
  readonly published = output<string>();

  private nextId = 0;

  /** Handle of the timer that opens the new survey after publishing. */
  private viewTimer: ReturnType<typeof setTimeout> | undefined;

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
    const question = this.newQuestion();

    this.questions.update((questions) => [...questions, question]);
    this.focusField(`input[data-question-id="${question.id}"]`);
  }

  /**
   * Appends an empty answer to a question.
   *
   * @param questionId Id of the question.
   */
  protected addAnswer(questionId: number): void {
    const answerId = this.nextId++;

    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, answers: [...question.answers, { id: answerId, text: '' }] }
          : question,
      ),
    );

    this.focusField(`input[data-answer-id="${answerId}"]`);
  }

  /**
   * Puts the caret into a freshly added field, so the form can be filled without
   * reaching for the mouse. The field only exists once Angular has rendered the new
   * row, hence the wait for the next render.
   *
   * @param selector CSS selector of the field, relative to this component.
   */
  private focusField(selector: string): void {
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLInputElement>(selector)?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * Removes a question, or empties its text field when it is the last one. A survey keeps
   * at least one question, but the delete icon stays usable either way.
   *
   * @param questionId Id of the question.
   */
  protected removeQuestion(questionId: number): void {
    if (this.questions().length <= 1) {
      this.questions.update((questions) =>
        questions.map((question) =>
          question.id === questionId ? { ...question, text: '' } : question,
        ),
      );
      return;
    }

    this.questions.update((questions) =>
      questions.filter((question) => question.id !== questionId),
    );
  }

  /**
   * Removes an answer, or empties its text field when the question is down to its last two.
   * A question keeps at least two answers, but the delete icon stays usable either way.
   *
   * @param questionId Id of the question the answer belongs to.
   * @param answerId Id of the answer.
   */
  protected removeAnswer(questionId: number, answerId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId ? withoutAnswer(question, answerId) : question,
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

  /** True when the survey has no title. */
  protected readonly titleMissing = computed(() => this.title().trim() === '');

  /** True when no category is picked. */
  protected readonly categoryMissing = computed(() => this.category() === null);

  /**
   * True when the end date lies in the past. The date itself is optional, but a past
   * one would close the survey right away.
   */
  protected readonly endDateInvalid = computed(() => {
    const parsed = parseIsoDay(this.endDate());
    return parsed !== null && parsed.getTime() <= Date.now();
  });

  protected readonly questionMissing = questionMissing;

  protected readonly answerMissing = answerMissing;

  protected readonly anyAnswerMissing = anyAnswerMissing;

  /** True once every required field is filled and the end date is usable. */
  protected readonly valid = computed(
    () =>
      !this.titleMissing() &&
      !this.categoryMissing() &&
      !this.endDateInvalid() &&
      this.questions().every((question) => questionComplete(question)),
  );

  protected readonly minEndDate = todayIso;

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
    this.startOverlayTimer();
  }

  /** Leaves the overlay standing for a moment before the new survey opens. */
  private startOverlayTimer(): void {
    if (this.createdId() === null) {
      return;
    }

    this.viewTimer = setTimeout(() => void this.openCreated(), PUBLISHED_OVERLAY_MS);
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
      endsAt: parseIsoDay(this.endDate()),
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

  /**
   * Leaves the confirmation overlay for the new survey. Runs on the timer started by
   * {@link publish}, and on a click on the overlay itself so it can be skipped.
   */
  protected async openCreated(): Promise<void> {
    clearTimeout(this.viewTimer);

    const id = this.createdId();
    if (id === null) {
      return;
    }

    await this.router.navigate(['/survey', id]);
    this.closed.emit();
  }
}
