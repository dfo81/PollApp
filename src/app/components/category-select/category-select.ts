import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { SURVEY_CATEGORIES } from '../../core/survey.models';

/**
 * Dropdown for picking the category of a survey.
 *
 * Focus stays on the toggle button while the list is open and aria-activedescendant
 * names the highlighted option, so no focus has to be moved into a list that only
 * exists while the dropdown is open.
 */
@Component({
  selector: 'app-category-select',
  imports: [],
  templateUrl: './category-select.html',
  styleUrl: './category-select.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class CategorySelect {
  /** The chosen category, null while none is picked. */
  readonly value = input<string | null>(null);

  /** Draws the toggle as rejected, matching the other fields of the form. */
  readonly invalid = input(false);

  /** Fires with the category whenever one is picked. */
  readonly valueChange = output<string>();

  private readonly field = viewChild<ElementRef<HTMLElement>>('field');

  /** The categories on offer. */
  protected readonly categories = SURVEY_CATEGORIES;

  /** True while the list is open. */
  protected readonly open = signal(false);

  /** Option the keyboard cursor sits on, -1 while the list is closed. */
  protected readonly activeIndex = signal(-1);

  /** Id of the active option, for aria-activedescendant on the toggle. */
  protected readonly activeId = computed(() => {
    const index = this.activeIndex();
    return index < 0 ? null : `category-option-${index}`;
  });

  /** Opens or closes the list. */
  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openList();
    }
  }

  /**
   * Hands the picked category to the parent and closes the list.
   *
   * @param category The chosen category.
   */
  protected select(category: string): void {
    this.valueChange.emit(category);
    this.close();
  }

  /**
   * Drives the dropdown from the keyboard.
   *
   * @param event Key press on the toggle button.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.step(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (this.open()) {
      this.onOpenKeydown(event);
    }
  }

  /**
   * Closes the list on a click outside of it.
   *
   * @param event Click anywhere in the document.
   */
  protected onDocumentClick(event: MouseEvent): void {
    const field = this.field()?.nativeElement;

    if (this.open() && field && !field.contains(event.target as Node)) {
      this.close();
    }
  }

  /**
   * Lets Escape close the open list first, not the dialog around the form.
   *
   * @param event Escape key press anywhere in the document.
   */
  protected onEscape(event: Event): void {
    if (!this.open()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  /**
   * Moves the highlight one option on, opening the list first when it is closed.
   *
   * @param step 1 for the next option, -1 for the previous one.
   */
  private step(step: number): void {
    if (!this.open()) {
      this.openList();
      return;
    }

    const count = this.categories.length;
    this.activeIndex.update((index) => (index + step + count) % count);
  }

  /**
   * Handles the keys that only apply while the list is open.
   *
   * @param event Key press on the toggle button.
   */
  private onOpenKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.close();
      return;
    }
    if (event.key !== 'Home' && event.key !== 'End' && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.commit(event.key);
  }

  /**
   * Jumps to an end of the list, or takes over the highlighted category.
   *
   * @param key Home, End, Enter or Space.
   */
  private commit(key: string): void {
    if (key === 'Home' || key === 'End') {
      this.activeIndex.set(key === 'Home' ? 0 : this.categories.length - 1);
      return;
    }

    const index = this.activeIndex();
    if (index >= 0) {
      this.select(this.categories[index]);
    }
  }

  /** Opens the list with the cursor on the current category. */
  private openList(): void {
    const selected = (this.categories as readonly string[]).indexOf(this.value() ?? '');
    this.activeIndex.set(selected >= 0 ? selected : 0);
    this.open.set(true);
  }

  /** Closes the list. */
  private close(): void {
    this.open.set(false);
    this.activeIndex.set(-1);
  }
}
