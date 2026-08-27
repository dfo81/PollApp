import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import { CreateSurveyDialog } from '../../core/create-survey-dialog';
import { CardsCarousel } from './cards-carousel';
import {
  ALL_CATEGORIES,
  deadlineLabel,
  isRunning,
  SURVEY_CATEGORIES,
  SurveyListItem,
} from '../../core/survey.models';

/** Which of the two lists is on screen. */
type Tab = 'active' | 'past';

/** Assumed line height, to convert a line wise wheel report into pixels. */
const LINE_HEIGHT_PX = 16;

/** How many surveys the "ending soon" carousel shows at most. */
const ENDING_SOON_COUNT = 6;

/** How many surveys of the list are on screen before it starts to scroll. */
const LIST_VISIBLE_COUNT = 6;

/**
 * How far the list reaches into the next survey when there is more to scroll to. The cut
 * off card is what tells the visitor the list goes on, a scrollbar that only shows up
 * during scrolling cannot say that.
 */
const LIST_PEEK_PX = 24;

/**
 * Survey lists of the home screen: a carousel of the surveys ending soon and below it
 * the full list, switchable between running and finished surveys and filterable by
 * category. Both scrollbars are drawn by hand, the native ones are hidden.
 */
@Component({
  selector: 'app-surveys',
  imports: [RouterLink],
  templateUrl: './surveys.html',
  styleUrl: './surveys.scss',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeDropdown()',
    '(window:resize)': 'carousel.measure()',
  },
})
export class Surveys {
  private readonly surveyService = inject(SurveyService);

  private readonly createDialog = inject(CreateSurveyDialog);

  /** Keeps a proportional thumb visible on long lists. */
  private static readonly MIN_THUMB_SIZE = 24;

  /** How long the list scrollbar stays visible after the last scroll. */
  private static readonly SCROLLBAR_FADE_MS = 800;

  /**
   * Height of the list thumb: null sizes it proportionally to the list, a number pins
   * it to that many pixels. Either way {@link onListScroll} keeps it flush with the
   * bottom at the end of the list.
   */
  private static readonly THUMB_HEIGHT: number | null = null;

  private readonly categoryFilter = viewChild<ElementRef<HTMLElement>>('categoryFilter');

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  private readonly cards = viewChild<ElementRef<HTMLElement>>('cards');

  /** Drag, wheel and scrollbar of the "ending soon" carousel. */
  protected readonly carousel = new CardsCarousel(() => this.cards()?.nativeElement);

  /** All surveys. Reloads whenever a survey is published in the create dialog. */
  protected readonly surveys = resource({
    params: () => this.createDialog.created(),
    defaultValue: [] as SurveyListItem[],
    loader: () => this.surveyService.listSurveys(),
  });

  /** The list that is currently on screen. */
  protected readonly tab = signal<Tab>('active');

  /** Selected category, or null for all of them. */
  protected readonly category = signal<string | null>(null);

  /** True while the category dropdown is open. */
  protected readonly dropdownOpen = signal(false);

  /** True while the list scrollbar is visible. */
  protected readonly listScrolling = signal(false);

  /** Height of the list thumb in pixels. */
  protected readonly thumbHeight = signal(0);

  /** Offset of the list thumb from the top of its track, in pixels. */
  protected readonly thumbTop = signal(0);

  private hideScrollbar?: ReturnType<typeof setTimeout>;

  /** Width of the list at the last measurement, see {@link watchListWidth}. */
  private listWidth = 0;

  /** Surveys that still accept votes. */
  protected readonly running = computed(() => this.surveys.value().filter((s) => isRunning(s)));

  /** Surveys whose deadline has passed. */
  protected readonly past = computed(() => this.surveys.value().filter((s) => !isRunning(s)));

  /** The running surveys with the nearest deadlines, shown in the carousel. */
  protected readonly endingSoon = computed(() => this.running().slice(0, ENDING_SOON_COUNT));

  private readonly inTab = computed(() => (this.tab() === 'active' ? this.running() : this.past()));

  /** The categories offered by the filter. */
  protected readonly categories = SURVEY_CATEGORIES;

  /** Label of the filter entry that clears the category. */
  protected readonly allLabel = ALL_CATEGORIES;

  /** The surveys of the current tab after the category filter. */
  protected readonly listed = computed(() => {
    const category = this.category();
    return category === null ? this.inTab() : this.inTab().filter((s) => s.category === category);
  });

  /**
   * Measures the height the first {@link LIST_VISIBLE_COUNT} surveys actually take up
   * and offers it to the stylesheet. A fixed row height cuts the last visible row in
   * half as soon as a title wraps onto a second line, measuring the cards keeps the box
   * flush with them.
   *
   * Only the two column layout caps the list, on mobile the stylesheet ignores the
   * measurement and runs the full list. Shorter lists drop the cap either way, they
   * have nothing to scroll.
   */
  private measureList(): void {
    const list = this.list()?.nativeElement;
    if (!list) {
      return;
    }
    const height = this.visibleListHeight(list);
    if (height === null) {
      list.style.removeProperty('--list-max-height');
      return;
    }
    list.style.setProperty('--list-max-height', `${height}px`);
  }

  /**
   * Height of the first {@link LIST_VISIBLE_COUNT} surveys, plus a peek at the next one
   * while there is more to scroll to.
   *
   * @param list The list element.
   * @returns The height in pixels, or null when the list is short enough to show whole.
   */
  private visibleListHeight(list: HTMLElement): number | null {
    const surveys = list.querySelectorAll<HTMLElement>('.survey');
    const last = surveys[LIST_VISIBLE_COUNT - 1];
    if (!last) {
      return null;
    }
    const height = last.offsetTop + last.offsetHeight - surveys[0].offsetTop;
    return surveys.length > LIST_VISIBLE_COUNT ? height + LIST_PEEK_PX : height;
  }

  /**
   * Re-measures the list whenever it is given a new width, since that is what makes the
   * titles wrap differently. Height changes are ignored, those are the result of the
   * measurement itself and would otherwise feed back into it.
   *
   * @param onCleanup Disconnects the observer before the effect runs again or the
   *   component goes away.
   */
  private watchListWidth(onCleanup: (fn: () => void) => void): void {
    const list = this.list()?.nativeElement;
    if (!list || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => this.onListResize(list));
    observer.observe(list);
    onCleanup(() => observer.disconnect());
  }

  /**
   * Re-measures the list after a width change, ignoring the height changes the
   * measurement itself produces.
   *
   * @param list The list element.
   */
  private onListResize(list: HTMLElement): void {
    if (list.clientWidth === this.listWidth) {
      return;
    }

    this.listWidth = list.clientWidth;
    this.measureList();
  }

  /**
   * Moves the list thumb with the list and shows the scrollbar for a moment.
   *
   * A thumb held at its minimum height is taller than its share of the track, so the
   * offset is measured against the travel that is actually left instead of the raw
   * scroll ratio. That keeps the thumb flush with the bottom at the end of the list.
   */
  protected onListScroll(): void {
    const list = this.list()?.nativeElement;
    if (!list) {
      return;
    }

    this.placeListThumb(list);
    this.flashScrollbar();
  }

  /**
   * Sizes the list thumb and moves it to the current scroll position.
   *
   * A thumb held at its minimum height is taller than its share of the track, so the
   * offset is measured against the travel that is actually left instead of the raw
   * scroll ratio. That keeps the thumb flush with the bottom at the end of the list.
   *
   * @param list The scrolling list element.
   */
  private placeListThumb(list: HTMLElement): void {
    const track = list.clientHeight;
    const scrollable = list.scrollHeight - track;
    const height =
      Surveys.THUMB_HEIGHT ?? Math.max((track / list.scrollHeight) * track, Surveys.MIN_THUMB_SIZE);
    const progress = scrollable > 0 ? list.scrollTop / scrollable : 0;

    this.thumbHeight.set(height);
    this.thumbTop.set(progress * (track - height));
  }

  /** Shows the list scrollbar and hides it again once scrolling has stopped. */
  private flashScrollbar(): void {
    this.listScrolling.set(true);
    clearTimeout(this.hideScrollbar);
    this.hideScrollbar = setTimeout(() => this.listScrolling.set(false), Surveys.SCROLLBAR_FADE_MS);
  }

  /**
   * Switches between the running and the finished surveys and clears the category, so
   * the two lists never mix their filters.
   *
   * @param tab List to show.
   */
  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.category.set(null);
    this.closeDropdown();
  }

  /** Opens or closes the category dropdown. */
  protected toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  /** Closes the category dropdown. */
  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  /**
   * Filters the list by a category.
   *
   * @param category Category to filter by, or null for all surveys.
   */
  protected selectCategory(category: string | null): void {
    this.category.set(category);
    this.closeDropdown();
  }

  /**
   * Closes the category dropdown on a click outside of it.
   *
   * @param event Click anywhere in the document.
   */
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) {
      return;
    }

    const filter = this.categoryFilter()?.nativeElement;
    if (filter && !filter.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  /**
   * Deadline text of a survey card.
   *
   * @param survey Survey to describe.
   * @returns Human readable deadline, see {@link deadlineLabel}.
   */
  protected label(survey: SurveyListItem): string {
    return deadlineLabel(survey);
  }

  /**
   * Keeps carousel and list measured, and arms the two listeners that cannot be bound
   * in the template: the click that ends a drag and the width of the list.
   *
   * Both elements only exist once the surveys have loaded, so the effects wait for them
   * instead of running after the first render.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearTimeout(this.hideScrollbar));

    this.keepMeasured();
    effect((onCleanup) => this.carousel.swallowClicks(onCleanup));
    effect((onCleanup) => this.watchListWidth(onCleanup));
  }

  /**
   * Re-measures carousel and list after every render that changed their contents, and
   * once more when the real font has replaced the fallback, whose titles may wrap at a
   * different word.
   */
  private keepMeasured(): void {
    afterRenderEffect(() => {
      this.endingSoon();
      this.carousel.measure();
    });

    afterRenderEffect(() => {
      this.listed();
      this.measureList();
    });

    afterNextRender(() => void document.fonts?.ready.then(() => this.measureList()));
  }
}
