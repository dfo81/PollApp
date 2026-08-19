import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { SURVEY_CATEGORIES } from '../../core/survey.models';

interface DraftAnswer {
  id: number;
}

interface DraftQuestion {
  id: number;
  answers: DraftAnswer[];
}

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
  readonly closed = output<void>();

  private readonly categoryField = viewChild<ElementRef<HTMLElement>>('categoryField');

  protected readonly categories = SURVEY_CATEGORIES;

  // Ids keep @for tracking stable, the inputs are not bound to a model yet.
  private nextId = 0;

  protected readonly questions = signal<DraftQuestion[]>([this.newQuestion()]);

  protected readonly category = signal<string | null>(null);

  protected readonly categoryOpen = signal(false);

  protected addQuestion(): void {
    this.questions.update((questions) => [...questions, this.newQuestion()]);
  }

  protected addAnswer(questionId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, answers: [...question.answers, { id: this.nextId++ }] }
          : question,
      ),
    );
  }

  // A survey keeps at least one question and a question at least two answers; the template
  // only renders the delete icon while removing is allowed.
  protected removeQuestion(questionId: number): void {
    this.questions.update((questions) => questions.filter((question) => question.id !== questionId));
  }

  protected removeAnswer(questionId: number, answerId: number): void {
    this.questions.update((questions) =>
      questions.map((question) =>
        question.id === questionId
          ? { ...question, answers: question.answers.filter((answer) => answer.id !== answerId) }
          : question,
      ),
    );
  }

  // A, B, C … a draft is not expected to run past Z.
  protected letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  private newQuestion(): DraftQuestion {
    return { id: this.nextId++, answers: [{ id: this.nextId++ }, { id: this.nextId++ }] };
  }

  protected toggleCategory(): void {
    this.categoryOpen.update((open) => !open);
  }

  protected closeCategory(): void {
    this.categoryOpen.set(false);
  }

  protected selectCategory(category: string): void {
    this.category.set(category);
    this.closeCategory();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.categoryOpen()) {
      return;
    }

    const field = this.categoryField()?.nativeElement;
    if (field && !field.contains(event.target as Node)) {
      this.closeCategory();
    }
  }

  // Escape closes the open dropdown first, not the whole dialog.
  protected onEscape(event: Event): void {
    if (this.categoryOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeCategory();
    }
  }
}
