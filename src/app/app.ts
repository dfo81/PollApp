import { Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Header } from './components/header/header';
import { CreateSurvey } from './components/create-survey/create-survey';
import { CreateSurveyDialog } from './core/create-survey-dialog';

/**
 * Shell of the app: header, routed page, footer and the create dialog.
 *
 * The dialog lives here rather than on the home screen so the header can open it on
 * every page. Its appearance is driven by route data: `{ light: true }` switches the
 * page to the light theme, `{ createButton: true }` shows the button in the header.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Header, CreateSurvey],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[class.light-page]': 'light()',
  },
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly createDialogState = inject(CreateSurveyDialog);

  private readonly createDialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');

  /** True while the create dialog is open. */
  protected readonly createOpen = this.createDialogState.open;

  /** Whether the press that may close the dialog started on the backdrop. */
  private pressStartedOnBackdrop = false;

  /** Keeps the native dialog element in sync with {@link createOpen}. */
  constructor() {
    effect(() => {
      const dialog = this.createDialog().nativeElement;
      if (this.createOpen()) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  /** Re-emits after every completed navigation. */
  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
  );

  /** Data of the currently active, deepest route. */
  private readonly routeData = computed(() => {
    this.navEnd();
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data;
  });

  /** True on light pages, which get a white background and the dark logo. */
  protected readonly light = computed(() => this.routeData()['light'] ?? false);

  /** True where the header shows its "Create survey" button. */
  protected readonly createButton = computed(() => this.routeData()['createButton'] ?? false);

  /** Closes the create dialog. */
  protected closeCreate(): void {
    this.createDialogState.requestClose();
  }

  /**
   * Reacts to a published survey. The dialog stays open with its confirmation while
   * the list behind it already reloads.
   */
  protected onPublished(): void {
    this.createDialogState.markCreated();
  }

  /**
   * Notes whether a press started on the backdrop, so a drag that ends there does not
   * close the dialog.
   *
   * @param event Pointer press on the dialog or its backdrop.
   */
  protected onDialogMouseDown(event: MouseEvent): void {
    this.pressStartedOnBackdrop = event.target === this.createDialog().nativeElement;
  }

  /**
   * Closes the dialog when a click began and ended on the backdrop.
   *
   * @param event Click on the dialog or its backdrop.
   */
  protected onBackdropClick(event: MouseEvent): void {
    const onBackdrop = event.target === this.createDialog().nativeElement;
    if (this.pressStartedOnBackdrop && onBackdrop) {
      this.closeCreate();
    }
    this.pressStartedOnBackdrop = false;
  }
}
