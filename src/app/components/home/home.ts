import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { Surveys } from '../surveys/surveys';
import { CreateSurvey } from '../create-survey/create-survey';

@Component({
  selector: 'app-home',
  imports: [Surveys, CreateSurvey],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly createDialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');

  protected readonly createOpen = signal(false);

  private pressStartedOnBackdrop = false;

  protected openCreate(): void {
    this.createOpen.set(true);
    this.createDialog().nativeElement.showModal();
  }

  protected closeCreate(): void {
    this.createDialog().nativeElement.close();
  }

  protected onDialogClose(): void {
    this.createOpen.set(false);
  }

  protected onDialogMouseDown(event: MouseEvent): void {
    this.pressStartedOnBackdrop = event.target === this.createDialog().nativeElement;
  }

  protected onBackdropClick(event: MouseEvent): void {
    const onBackdrop = event.target === this.createDialog().nativeElement;
    if (this.pressStartedOnBackdrop && onBackdrop) {
      this.closeCreate();
    }
    this.pressStartedOnBackdrop = false;
  }
}
