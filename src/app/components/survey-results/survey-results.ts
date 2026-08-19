import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-survey-results',
  imports: [],
  templateUrl: './survey-results.html',
  styleUrl: './survey-results.scss',
})
export class SurveyResults {
  // Only used below the desktop breakpoint; on desktop the results are always visible.
  protected readonly resultsOpen = signal(false);

  protected toggleResults(): void {
    this.resultsOpen.update((open) => !open);
  }
}
