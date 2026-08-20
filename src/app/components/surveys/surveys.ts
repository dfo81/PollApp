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
import {
  ALL_CATEGORIES,
  deadlineLabel,
  isRunning,
  SURVEY_CATEGORIES,
  SurveyListItem,
} from '../../core/survey.models';

type Tab = 'active' | 'past';

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

  // The list scrollbar stays hidden until it is used, like the native overlay ones.
  private static readonly SCROLLBAR_FADE_MS = 800;

  // null sizes the thumb proportionally to the list, a number pins it to that many
  // pixels. Either way onListScroll keeps it flush with the bottom at the end of the list.
  private static readonly THUMB_HEIGHT: number | null = null;

  // Keeps a proportional thumb visible on long lists and wide carousels.
  private static readonly MIN_THUMB_SIZE = 24;

  // Below this the pointer is still on its way to a click, not dragging the carousel.
  private static readonly DRAG_THRESHOLD = 5;

  private readonly categoryFilter = viewChild<ElementRef<HTMLElement>>('categoryFilter');

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  private readonly cards = viewChild<ElementRef<HTMLElement>>('cards');

  protected readonly surveys = resource({
    defaultValue: [] as SurveyListItem[],
    loader: () => this.surveyService.listSurveys(),
  });

  protected readonly tab = signal<Tab>('active');

  protected readonly category = signal<string | null>(null);

  protected readonly dropdownOpen = signal(false);

  protected readonly listScrolling = signal(false);

  // Thumb geometry in pixels, mirroring the scroll position of the list.
  protected readonly thumbHeight = signal(0);

  protected readonly thumbTop = signal(0);

  private hideScrollbar?: ReturnType<typeof setTimeout>;

  // Carousel thumb in pixels. Unlike the list its scrollbar is always on — it is the only
  // hint that there are more cards to the right.
  protected readonly cardsScrollable = signal(false);

  protected readonly cardsThumbWidth = signal(0);

  protected readonly cardsThumbLeft = signal(0);

  protected readonly dragging = signal(false);

  private dragPointer: number | null = null;

  private dragStartX = 0;

  private dragStartScroll = 0;

  // Set once a drag passes the threshold, cleared by the click it produces.
  private dragged = false;

  protected readonly running = computed(() => this.surveys.value().filter((s) => isRunning(s)));

  protected readonly past = computed(() => this.surveys.value().filter((s) => !isRunning(s)));

  protected readonly endingSoon = computed(() => this.running().slice(0, 6));

  private readonly inTab = computed(() => (this.tab() === 'active' ? this.running() : this.past()));

  protected readonly categories = SURVEY_CATEGORIES;

  protected readonly allLabel = ALL_CATEGORIES;

  protected readonly listed = computed(() => {
    const category = this.category();
    return category === null ? this.inTab() : this.inTab().filter((s) => s.category === category);
  });

  // A plain vertical wheel scrolls the carousel sideways — without this the cards are
  // unreachable with a mouse, since the horizontal scrollbar is hidden.
  protected onCardsWheel(event: WheelEvent): void {
    const cards = event.currentTarget as HTMLElement;

    // A trackpad already reports sideways gestures, only a vertical wheel needs mapping.
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }

    const furthest = cards.scrollWidth - cards.clientWidth;
    if (furthest <= 0) {
      return;
    }

    // At either end the page keeps scrolling, so the carousel never traps the wheel.
    const atStart = event.deltaY < 0 && cards.scrollLeft <= 0;
    const atEnd = event.deltaY > 0 && cards.scrollLeft >= furthest;
    if (atStart || atEnd) {
      return;
    }

    // Firefox reports whole lines rather than pixels.
    const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;

    event.preventDefault();
    cards.scrollLeft = Math.min(furthest, Math.max(0, cards.scrollLeft + delta));
  }

  protected onCardsPointerDown(event: PointerEvent): void {
    // Touch and pen already pan the carousel natively, this is only for the mouse.
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    const cards = this.cards()?.nativeElement;
    if (!cards || cards.scrollWidth <= cards.clientWidth) {
      return;
    }

    this.dragPointer = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScroll = cards.scrollLeft;
    this.dragged = false;
  }

  protected onCardsPointerMove(event: PointerEvent): void {
    const cards = this.cards()?.nativeElement;
    if (!cards || event.pointerId !== this.dragPointer) {
      return;
    }

    const moved = event.clientX - this.dragStartX;

    if (!this.dragged) {
      if (Math.abs(moved) < Surveys.DRAG_THRESHOLD) {
        return;
      }

      this.dragged = true;
      this.dragging.set(true);
      // Keeps the drag alive when the pointer leaves the carousel.
      cards.setPointerCapture(event.pointerId);
    }

    cards.scrollLeft = this.dragStartScroll - moved;
  }

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
    // `dragged` stays set on purpose — the click right after the drag still has to be caught.
  }

  // Runs after every render and on every carousel scroll, so the thumb is already sized
  // before the first interaction and follows along afterwards.
  protected measureCards(): void {
    const cards = this.cards()?.nativeElement;
    if (!cards) {
      return;
    }

    const track = cards.clientWidth;
    const scrollable = cards.scrollWidth - track;

    this.cardsScrollable.set(scrollable > 0);
    if (scrollable <= 0) {
      return;
    }

    const width = Math.max((track / cards.scrollWidth) * track, Surveys.MIN_THUMB_SIZE);
    this.cardsThumbWidth.set(width);
    this.cardsThumbLeft.set((cards.scrollLeft / scrollable) * (track - width));
  }

  protected onListScroll(): void {
    const list = this.list()?.nativeElement;
    if (!list) {
      return;
    }

    const track = list.clientHeight;
    const scrollable = list.scrollHeight - track;

    // A thumb held at its minimum height is taller than its share of the track, so the
    // offset is measured against the travel that is actually left instead of the raw
    // scroll ratio. That keeps the thumb flush with the bottom at the end of the list.
    const height =
      Surveys.THUMB_HEIGHT ?? Math.max((track / list.scrollHeight) * track, Surveys.MIN_THUMB_SIZE);
    const progress = scrollable > 0 ? list.scrollTop / scrollable : 0;

    this.thumbHeight.set(height);
    this.thumbTop.set(progress * (track - height));

    this.listScrolling.set(true);
    clearTimeout(this.hideScrollbar);
    this.hideScrollbar = setTimeout(() => this.listScrolling.set(false), Surveys.SCROLLBAR_FADE_MS);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.category.set(null);
    this.closeDropdown();
  }

  protected toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected selectCategory(category: string | null): void {
    this.category.set(category);
    this.closeDropdown();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) {
      return;
    }

    const filter = this.categoryFilter()?.nativeElement;
    if (filter && !filter.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  protected label(survey: SurveyListItem): string {
    return deadlineLabel(survey);
  }

  constructor() {
    // grabbed here so the render callbacks below can still register their cleanup
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearTimeout(this.hideScrollbar));

    // re-measures whenever the rendered cards change, e.g. once the surveys have loaded
    afterRenderEffect(() => {
      this.endingSoon();
      this.measureCards();
    });

    // A drag ends in a click on whichever card was grabbed. Angular has no capture-phase
    // binding, so this listener sits in front of the card's routerLink and swallows it.
    afterNextRender(() => {
      const cards = this.cards()?.nativeElement;
      if (!cards) {
        return;
      }

      const swallowClickAfterDrag = (event: MouseEvent) => {
        if (!this.dragged) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.dragged = false;
      };

      cards.addEventListener('click', swallowClickAfterDrag, true);
      destroyRef.onDestroy(() => cards.removeEventListener('click', swallowClickAfterDrag, true));
    });
  }
}
