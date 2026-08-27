/**
 * Drag, wheel and scrollbar behaviour of the "ending soon" carousel on the home screen.
 *
 * The markup stays in the surveys template, this only drives the element it is handed.
 */

import { signal } from '@angular/core';

/** Wheel travel of one line, for the browsers that report lines instead of pixels. */
const LINE_HEIGHT_PX = 16;

/** Keeps a proportional thumb visible on wide carousels. */
const MIN_THUMB_SIZE = 24;

/** Below this the pointer is still on its way to a click, not dragging the carousel. */
const DRAG_THRESHOLD = 5;

/** Drives one horizontally scrollable carousel. */
export class CardsCarousel {
  /**
   * @param element Reads the carousel element, which only exists once the surveys have
   *   loaded.
   */
  constructor(private readonly element: () => HTMLElement | undefined) {}

  /** True when the carousel holds more cards than fit on screen. */
  readonly scrollable = signal(false);

  /** Width of the carousel thumb in pixels. */
  readonly thumbWidth = signal(0);

  /** Offset of the carousel thumb from the left of its track, in pixels. */
  readonly thumbLeft = signal(0);

  /** True while the carousel is being dragged with the mouse. */
  readonly dragging = signal(false);

  private dragPointer: number | null = null;

  private dragStartX = 0;

  private dragStartScroll = 0;

  /** Set once a drag passes the threshold, cleared by the click it produces. */
  private dragged = false;

  /**
   * Maps a plain vertical wheel onto the carousel, which scrolls sideways. Without this
   * the cards are unreachable with a mouse, since the horizontal scrollbar is hidden.
   * At either end the page keeps scrolling, so the carousel never traps the wheel.
   *
   * @param event Wheel event on the carousel.
   */
  onWheel(event: WheelEvent): void {
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
  onPointerDown(event: PointerEvent): void {
    const cards = this.element();
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
  onPointerMove(event: PointerEvent): void {
    const cards = this.element();
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
    if (Math.abs(moved) < DRAG_THRESHOLD) {
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
  onPointerEnd(event: PointerEvent): void {
    const cards = this.element();
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
  measure(): void {
    const cards = this.element();
    if (!cards) {
      return;
    }

    const track = cards.clientWidth;
    const scrollable = cards.scrollWidth - track;
    this.scrollable.set(scrollable > 0);

    if (scrollable > 0) {
      this.placeThumb(cards, track, scrollable);
    }
  }

  /**
   * Sizes the carousel thumb and moves it to the current scroll position.
   *
   * @param cards The carousel element.
   * @param track Visible width of the carousel, in pixels.
   * @param scrollable Width that is scrollable beyond the track, in pixels.
   */
  private placeThumb(cards: HTMLElement, track: number, scrollable: number): void {
    const width = Math.max((track / cards.scrollWidth) * track, MIN_THUMB_SIZE);
    this.thumbWidth.set(width);
    this.thumbLeft.set((cards.scrollLeft / scrollable) * (track - width));
  }

  /**
   * Catches the click a drag ends with, so the grabbed card does not navigate.
   *
   * Angular has no capture phase binding, so the listener is registered by hand and
   * sits in front of the routerLink of the card.
   *
   * @param onCleanup Removes the listener before the effect runs again or the
   *   component goes away.
   */
  swallowClicks(onCleanup: (fn: () => void) => void): void {
    const cards = this.element();
    if (!cards) {
      return;
    }

    const swallow = (event: MouseEvent) => this.swallowIfDragged(event);
    cards.addEventListener('click', swallow, true);
    onCleanup(() => cards.removeEventListener('click', swallow, true));
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
