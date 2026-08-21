import { Injectable, signal } from '@angular/core';

/**
 * Connects the create dialog with the components that open it.
 *
 * The dialog itself lives in the app shell while the buttons that open it sit in the
 * header and on the home screen, so the request travels through these signals instead
 * of inputs and outputs.
 */
@Injectable({ providedIn: 'root' })
export class CreateSurveyDialog {
  /** True while the dialog is open. */
  readonly open = signal(false);

  /** Counts published surveys so open lists can reload when it changes. */
  readonly created = signal(0);

  /** Opens the dialog. */
  requestOpen(): void {
    this.open.set(true);
  }

  /** Closes the dialog. */
  requestClose(): void {
    this.open.set(false);
  }

  /** Announces a freshly published survey to everyone watching {@link created}. */
  markCreated(): void {
    this.created.update((count) => count + 1);
  }
}
