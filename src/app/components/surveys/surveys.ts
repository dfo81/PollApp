import { Component, computed, ElementRef, inject, resource, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import {
  ALL_CATEGORIES,
  deadlineLabel,
  isRunning,
  SURVEY_CATEGORIES,
  SurveyListItem,
} from '../../core/survey.models';

type Tab = 'active' | 'past';

@Component({
  selector: 'app-surveys',
  imports: [RouterLink],
  templateUrl: './surveys.html',
  styleUrl: './surveys.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeDropdown()',
  },
})
export class Surveys {
  private readonly surveyService = inject(SurveyService);

  private readonly categoryFilter = viewChild<ElementRef<HTMLElement>>('categoryFilter');

  protected readonly surveys = resource({
    defaultValue: [] as SurveyListItem[],
    loader: () => this.surveyService.listSurveys(),
  });

  protected readonly tab = signal<Tab>('active');

  protected readonly category = signal<string | null>(null);

  protected readonly dropdownOpen = signal(false);

  protected readonly running = computed(() => this.surveys.value().filter((s) => isRunning(s)));

  protected readonly past = computed(() => this.surveys.value().filter((s) => !isRunning(s)));

  protected readonly endingSoon = computed(() => this.running().slice(0, 6));

  private readonly inTab = computed(() => (this.tab() === 'active' ? this.running() : this.past()));

  protected readonly categories = SURVEY_CATEGORIES;

  protected readonly allLabel = ALL_CATEGORIES;

  protected readonly listed = computed(() => {
    const category = this.category();
    return category === null ? this.inTab() : this.inTab().filter((s) => s.category === category);
  });

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.category.set(null);
    this.closeDropdown();
  }

  protected toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected selectCategory(category: string | null): void {
    this.category.set(category);
    this.closeDropdown();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) {
      return;
    }

    const filter = this.categoryFilter()?.nativeElement;
    if (filter && !filter.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  protected label(survey: SurveyListItem): string {
    return deadlineLabel(survey);
  }
}
