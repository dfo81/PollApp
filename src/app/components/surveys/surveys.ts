import {
  afterNextRender,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../../core/survey-service';
import { CreateSurveyDialog } from '../../core/create-survey-dialog';
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
    '(window:resize)': 'measureCards()',
  },
})
export class Surveys {
  private readonly surveyService = inject(SurveyService);

  private readonly createDialog = inject(CreateSurveyDialog);

  /** How long the list scrollbar stays visible after the last scroll. */
  private static readonly SCROLLBAR_FADE_MS = 800;

  /**
   * Height of the list thumb: null sizes it proportionally to the list, a number pins
   * it to that many pixels. Either way {@link onListScroll} keeps it flush with the
   * bottom at the end of the list.
   */
  private static readonly THUMB_HEIGHT: number | null = null;

  /** Keeps a proportional thumb visible on long lists and wide carousels. */
  private static readonly MIN_THUMB_SIZE = 24;

  /** Below this the pointer is still on its way to a click, not dragging the carousel. */
  private static readonly DRAG_THRESHOLD = 5;

  private readonly categoryFilter = viewChild<ElementRef<HTMLElement>>('categoryFilter');

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  private readonly cards = viewChild<ElementRef<HTMLElement>>('cards');

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

  /** True when the carousel holds more cards than fit on screen. */
  protected readonly cardsScrollable = signal(false);

  /** Width of the carousel thumb in pixels. */
  protected readonly cardsThumbWidth = signal(0);

  /** Offset of the carousel thumb from the left of its track, in pixels. */
  protected readonly cardsThumbLeft = signal(0);

  /** True while the carousel is being dragged with the mouse. */
  protected readonly dragging = signal(false);

  private dragPointer: number | null = null;

  private dragStartX = 0;

  private dragStartScroll = 0;

  /** Set once a drag passes the threshold, cleared by the click it produces. */
  private dragged = false;

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
   * Maps a plain vertical wheel onto the carousel, which scrolls sideways. Without this
   * the cards are unreachable with a mouse, since the horizontal scrollbar is hidden.
   * At either end the page keeps scrolling, so the carousel never traps the wheel.
   *
   * @param event Wheel event on the carousel.
   */
  protected onCardsWheel(event: WheelEvent): void {
    const cards = event.currentTarget as HTMLElement;
    const furthest = cards.scrollWidth - cards.clientWidth;
    const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);

    if (sideways || furthest <= 0 || atCarouselEdge(cards, event, furthest)) {
      return;
    }

    event.preventDefault();
    const target = cards.scrollLeft + wheelDelta(event);
    cards.scrollLeft = Math.min(furthest, Math.max(0, target));
  }

  /**
   * Starts a possible carousel drag. Touch and pen already pan natively, so this only
   * covers the mouse.
   *
   * @param event Pointer press on the carousel.
   */
  protected onCardsPointerDown(event: PointerEvent): void {
    const cards = this.cards()?.nativeElement;
    const grabbable = cards && cards.scrollWidth > cards.clientWidth;

    if (event.pointerType !== 'mouse' || event.button !== 0 || !grabbable) {
      return;
    }

    this.dragPointer = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScroll = cards.scrollLeft;
    this.dragged = false;
  }

  /**
   * Scrolls the carousel along with the pointer once the drag threshold is passed.
   *
   * @param event Pointer movement on the carousel.
   */
  protected onCardsPointerMove(event: PointerEvent): void {
    const cards = this.cards()?.nativeElement;
    if (!cards || event.pointerId !== this.dragPointer) {
      return;
    }

    const moved = event.clientX - this.dragStartX;
    if (!this.dragged && !this.beginDrag(cards, event, moved)) {
      return;
    }

    cards.scrollLeft = this.dragStartScroll - moved;
  }

  /**
   * Starts the drag once the pointer has travelled far enough. Capturing the pointer
   * keeps the drag alive when it leaves the carousel.
   *
   * @param cards The carousel element.
   * @param event Pointer movement on the carousel.
   * @param moved Distance travelled since the press, in pixels.
   * @returns True once the drag is running.
   */
  private beginDrag(cards: HTMLElement, event: PointerEvent, moved: number): boolean {
    if (Math.abs(moved) < Surveys.DRAG_THRESHOLD) {
      return false;
    }

    this.dragged = true;
    this.dragging.set(true);
    cards.setPointerCapture(event.pointerId);
    return true;
  }

  /**
   * Ends a carousel drag. The dragged flag stays set on purpose, the click that follows
   * the drag still has to be caught.
   *
   * @param event Pointer release or cancel on the carousel.
   */
  protected onCardsPointerEnd(event: PointerEvent): void {
    const cards = this.cards()?.nativeElement;
    if (!cards || event.pointerId !== this.dragPointer) {
      return;
    }

    if (cards.hasPointerCapture(event.pointerId)) {
      cards.releasePointerCapture(event.pointerId);
    }

    this.dragPointer = null;
    this.dragging.set(false);
  }

  /**
   * Sizes and positions the carousel thumb. Runs after every render and on every
   * carousel scroll, so the thumb is ready before the first interaction.
   */
  protected measureCards(): void {
    const cards = this.cards()?.nativeElement;
    if (!cards) {
      return;
    }

    const track = cards.clientWidth;
    const scrollable = cards.scrollWidth - track;
    this.cardsScrollable.set(scrollable > 0);

    if (scrollable > 0) {
      this.placeCardsThumb(cards, track, scrollable);
    }
  }

  /**
   * Sizes the carousel thumb and moves it to the current scroll position.
   *
   * @param cards The carousel element.
   * @param track Visible width of the carousel, in pixels.
   * @param scrollable Width that is scrollable beyond the track, in pixels.
   */
  private placeCardsThumb(cards: HTMLElement, track: number, scrollable: number): void {
    const width = Math.max((track / cards.scrollWidth) * track, Surveys.MIN_THUMB_SIZE);
    this.cardsThumbWidth.set(width);
    this.cardsThumbLeft.set((cards.scrollLeft / scrollable) * (track - width));
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
   * Keeps the carousel thumb measured and swallows the click that ends a drag.
   *
   * Angular has no capture phase binding, so that listener is registered by hand and
   * sits in front of the routerLink of the card.
   */
  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearTimeout(this.hideScrollbar));

    afterRenderEffect(() => {
      this.endingSoon();
      this.measureCards();
    });

    afterNextRender(() => this.swallowDragClicks(destroyRef));
  }

  /**
   * Catches the click a drag ends with, so the grabbed card does not navigate.
   *
   * Angular has no capture phase binding, so the listener is registered by hand and
   * sits in front of the routerLink of the card.
   *
   * @param destroyRef Used to remove the listener with the component.
   */
  private swallowDragClicks(destroyRef: DestroyRef): void {
    const cards = this.cards()?.nativeElement;
    if (!cards) {
      return;
    }

    const swallow = (event: MouseEvent) => this.swallowIfDragged(event);
    cards.addEventListener('click', swallow, true);
    destroyRef.onDestroy(() => cards.removeEventListener('click', swallow, true));
  }

  /**
   * Stops a click that came out of a drag, and arms the carousel for the next one.
   *
   * @param event Click on the carousel.
   */
  private swallowIfDragged(event: MouseEvent): void {
    if (this.dragged) {
      event.preventDefault();
      event.stopPropagation();
      this.dragged = false;
    }
  }
}

/**
 * Tells whether the carousel is already at the end the wheel points to, so the page
 * keeps scrolling instead of the carousel trapping the wheel.
 *
 * @param cards The carousel element.
 * @param event Wheel event on the carousel.
 * @param furthest Width that is scrollable beyond the track, in pixels.
 * @returns True at the matching end of the carousel.
 */
function atCarouselEdge(cards: HTMLElement, event: WheelEvent, furthest: number): boolean {
  const atStart = event.deltaY < 0 && cards.scrollLeft <= 0;
  const atEnd = event.deltaY > 0 && cards.scrollLeft >= furthest;
  return atStart || atEnd;
}

/**
 * Reads the wheel travel in pixels. Firefox reports whole lines rather than pixels.
 *
 * @param event Wheel event on the carousel.
 * @returns Distance to scroll, in pixels.
 */
function wheelDelta(event: WheelEvent): number {
  return event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? event.deltaY * LINE_HEIGHT_PX
    : event.deltaY;
}
