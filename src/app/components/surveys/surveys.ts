import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import { deadlineLabel, isRunning, SurveyListItem } from '../../core/survey.models';

type Tab = 'active' | 'past';

@Component({
  selector: 'app-surveys',
  imports: [RouterLink],
  templateUrl: './surveys.html',
  styleUrl: './surveys.scss',
})
export class Surveys {
  private readonly surveyService = inject(SurveyService);

  protected readonly surveys = resource({
    defaultValue: [] as SurveyListItem[],
    loader: () => this.surveyService.listSurveys(),
  });

  protected readonly tab = signal<Tab>('active');

  protected readonly running = computed(() => this.surveys.value().filter((s) => isRunning(s)));

  protected readonly past = computed(() => this.surveys.value().filter((s) => !isRunning(s)));

  protected readonly endingSoon = computed(() => this.running().slice(0, 6));

  protected readonly listed = computed(() => (this.tab() === 'active' ? this.running() : this.past()));

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected label(survey: SurveyListItem): string {
    return deadlineLabel(survey);
  }
}
