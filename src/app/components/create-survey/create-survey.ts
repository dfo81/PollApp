import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { SURVEY_CATEGORIES } from '../../core/survey.models';

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

  protected readonly category = signal<string | null>(null);

  protected readonly categoryOpen = signal(false);

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
