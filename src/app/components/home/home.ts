import { Component, inject } from '@angular/core';
import { Surveys } from '../surveys/surveys';
import { CreateSurveyDialog } from '../../core/create-survey-dialog';

/** Home screen with the intro section and the survey lists. */
@Component({
  selector: 'app-home',
  imports: [Surveys],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly createDialog = inject(CreateSurveyDialog);

  /** Opens the create dialog that lives in the app shell. */
  protected openCreate(): void {
    this.createDialog.requestOpen();
  }
}
