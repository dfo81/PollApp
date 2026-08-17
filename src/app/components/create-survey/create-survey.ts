import { Component, output } from '@angular/core';

@Component({
  selector: 'app-create-survey',
  imports: [],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  readonly closed = output<void>();
}
