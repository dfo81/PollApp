import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

/** One cell of the month grid. */
interface DayCell {
  /** ISO day, also the value handed out on a pick. */
  iso: string;
  /** Day of the month, as printed in the cell. */
  label: number;
  /** False for the leading and trailing days of the neighbouring months. */
  inMonth: boolean;
  /** True when the day lies before {@link DatePicker.min}. */
  disabled: boolean;
  /** True for today, which gets a marker of its own. */
  today: boolean;
}

/** Weekday headers of the grid, Monday first, in the browser's language. */
const WEEKDAYS = buildWeekdays();

/** How many days the arrow keys move the cursor. */
const CURSOR_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** How many months PageUp and PageDown move the grid. */
const MONTH_STEPS: Record<string, number> = { PageUp: -1, PageDown: 1 };

/**
 * Date field with a calendar of its own. It replaces `<input type="date">`, whose popup
 * is drawn by the browser outside the document and therefore cannot be styled.
 *
 * The value is an ISO day (`yyyy-mm-dd`), the same shape the native input uses.
 */
@Component({
  selector: 'app-date-picker',
  imports: [],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class DatePicker {
  /** Selected day as `yyyy-mm-dd`, empty when nothing is picked. */
  readonly value = input('');

  /** Earliest selectable day as `yyyy-mm-dd`, empty for no lower bound. */
  readonly min = input('');

  /** Draws the field as rejected, matching the other fields of the form. */
  readonly invalid = input(false);

  /** Describes the field for screen readers. */
  readonly label = input('Date');

  /** Fires with the new ISO day whenever one is picked. */
  readonly valueChange = output<string>();

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** True while the calendar is open. */
  protected readonly open = signal(false);

  /** Day the keyboard cursor sits on. Also decides which month the grid shows. */
  protected readonly cursor = signal(startOfDay(new Date()));

  protected readonly weekdays = WEEKDAYS;

  /** The selected day, or null while the field is empty. */
  private readonly selected = computed(() => fromIso(this.value()));

  /** The lower bound, or null when none is set. */
  private readonly minDate = computed(() => fromIso(this.min()));

  /** The selected day in the browser's format, empty while nothing is picked. */
  protected readonly display = computed(() => {
    const date = this.selected();
    return date === null ? '' : date.toLocaleDateString();
  });

  /** Month and year above the grid, in the browser's language. */
  protected readonly monthLabel = computed(() =>
    this.cursor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  /** Id of the cell the keyboard cursor sits on, for aria-activedescendant. */
  protected readonly activeId = computed(() =>
    this.open() ? `day-${toIso(this.cursor())}` : null,
  );

  /** The six weeks the grid shows, always Monday to Sunday. */
  protected readonly weeks = computed<DayCell[][]>(() => {
    const cursor = this.cursor();
    const min = this.minDate();
    const today = toIso(startOfDay(new Date()));
    const month = cursor.getMonth();

    const first = new Date(cursor.getFullYear(), month, 1);
    const start = addDays(first, -mondayOffset(first));

    const weeks: DayCell[][] = [];
    for (let week = 0; week < 6; week++) {
      const days: DayCell[] = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(start, week * 7 + day);
        const iso = toIso(date);
        days.push({
          iso,
          label: date.getDate(),
          inMonth: date.getMonth() === month,
          disabled: min !== null && date.getTime() < min.getTime(),
          today: iso === today,
        });
      }
      weeks.push(days);
    }
    return weeks;
  });

  /** True for the day currently selected. */
  protected isSelected(iso: string): boolean {
    return iso === this.value();
  }

  /** True for the day the keyboard cursor sits on. */
  protected isActive(iso: string): boolean {
    return this.open() && iso === toIso(this.cursor());
  }

  /** Opens or closes the calendar. */
  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openCalendar();
    }
  }

  /** Hands the picked day to the parent and closes the calendar. */
  protected pick(day: DayCell): void {
    if (day.disabled) {
      return;
    }

    this.valueChange.emit(day.iso);
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  /** Steps the grid one month back or forward without changing the selection. */
  protected shiftMonth(step: number): void {
    this.cursor.update((date) => clampToMonth(date, step));
  }

  /**
   * Drives the calendar from the keyboard. Focus stays on the trigger and
   * aria-activedescendant names the active day, so no focus has to move into the grid.
   *
   * @param event Key press on the trigger button.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      this.onClosedKeydown(event);
      return;
    }

    const days = CURSOR_STEPS[event.key];
    if (days !== undefined) {
      this.moveCursor(event, days);
      return;
    }

    this.onOpenKeydown(event);
  }

  /**
   * Handles the keys that open the calendar. Enter and Space are left to the button,
   * whose own click handler opens it.
   *
   * @param event Key press on the trigger button.
   */
  private onClosedKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();
    this.openCalendar();
  }

  /**
   * Handles the keys of an open calendar that do not move the cursor by a fixed number
   * of days.
   *
   * @param event Key press on the trigger button.
   */
  private onOpenKeydown(event: KeyboardEvent): void {
    const months = MONTH_STEPS[event.key];
    if (months !== undefined) {
      event.preventDefault();
      this.shiftMonth(months);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      this.moveCursor(event, this.weekEdgeStep(event.key));
      return;
    }
    this.onCommitKeydown(event);
  }

  /**
   * Distance from the cursor to the start or the end of its week.
   *
   * @param key Either Home or End.
   * @returns Number of days to move, negative for backwards.
   */
  private weekEdgeStep(key: string): number {
    const offset = mondayOffset(this.cursor());
    return key === 'Home' ? -offset : 6 - offset;
  }

  /**
   * Takes over the highlighted day, or hands the key on to the ones that close.
   *
   * @param event Key press on the trigger button.
   */
  private onCommitKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pickCursor();
      return;
    }
    this.onCloseKeydown(event);
  }

  /**
   * Closes the calendar on Escape and Tab. Escape is kept from bubbling, otherwise the
   * dialog around the form would close along with it.
   *
   * @param event Key press on the trigger button.
   */
  private onCloseKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key !== 'Tab') {
      return;
    }
    this.close();
  }

  /** Picks the day the keyboard cursor sits on. */
  private pickCursor(): void {
    const iso = toIso(this.cursor());
    const day = this.weeks()
      .flat()
      .find((cell) => cell.iso === iso);

    if (day) {
      this.pick(day);
    }
  }

  /**
   * Closes the calendar on a click outside of it.
   *
   * @param event Click anywhere in the document.
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    const host = this.trigger()?.nativeElement.closest('.date-picker');
    if (host && !host.contains(event.target as Node)) {
      this.close();
    }
  }

  /** Opens the calendar on the selected day, or on today when the field is empty. */
  private openCalendar(): void {
    this.cursor.set(this.selected() ?? startOfDay(new Date()));
    this.open.set(true);
  }

  /** Closes the calendar. */
  private close(): void {
    this.open.set(false);
  }

  /**
   * Moves the keyboard cursor, skipping over days below the lower bound.
   *
   * @param event Key press to swallow, so the page does not scroll.
   * @param days Number of days to move, negative for backwards.
   */
  private moveCursor(event: KeyboardEvent, days: number): void {
    event.preventDefault();

    const target = addDays(this.cursor(), days);
    const min = this.minDate();
    this.cursor.set(min !== null && target.getTime() < min.getTime() ? min : target);
  }
}

/** Midnight of the given day, so comparisons ignore the time. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The day that many days after the given one. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Days since the Monday of that week, 0 for Monday and 6 for Sunday. */
function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** The same day-of-month in the neighbouring month, clamped to its last day. */
function clampToMonth(date: Date, step: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + step, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

/**
 * Formats a day as `yyyy-mm-dd`. Built from the local parts on purpose: toISOString()
 * would shift the day for anyone east or west of UTC.
 */
function toIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Reads a `yyyy-mm-dd` day, or null when the text is not one. */
function fromIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Short weekday names, Monday first, in the browser's language. */
function buildWeekdays(): { short: string; long: string }[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    return {
      short: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
      long: date.toLocaleDateString(undefined, { weekday: 'long' }),
    };
  });
}
