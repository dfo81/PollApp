import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreateSurveyDialog } from '../../core/create-survey-dialog';

/** Header with the logo and, on survey pages, the button that opens the create dialog. */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly createDialog = inject(CreateSurveyDialog);

  /** True on light pages, which need the dark logo; false on dark pages. */
  readonly light = input(false);

  /** Shows the "Create survey" button, which appears from the desktop breakpoint on. */
  readonly createButton = input(false);

  /** Opens the create dialog that lives in the app shell. */
  protected openCreate(): void {
    this.createDialog.requestOpen();
  }
}
