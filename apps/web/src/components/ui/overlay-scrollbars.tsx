import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const HIDE_DELAY_MS = 800;
const MIN_THUMB_SIZE = 24;
const SCROLLBAR_SIZE = 10;
const HIDDEN_SCROLLBAR_SELECTOR =
  ".scroll-shadow--hide-scrollbar, .scrollbar-none, .code-diff__viewport, .agenda__time-grid";

type ScrollAxis = "horizontal" | "vertical";

interface ScrollbarDrag {
  axis: ScrollAxis;
  pointerId: number;
  pointerStart: number;
  scrollStart: number;
  target: HTMLElement;
}

function canScroll(element: HTMLElement, axis: ScrollAxis): boolean {
  if (element.matches(HIDDEN_SCROLLBAR_SELECTOR)) return false;

  const style = getComputedStyle(element);
  const overflow = axis === "horizontal" ? style.overflowX : style.overflowY;
  const isScrollableOverflow = overflow === "auto" || overflow === "scroll";

  return (
    isScrollableOverflow &&
    (axis === "horizontal"
      ? element.scrollWidth - element.clientWidth
      : element.scrollHeight - element.clientHeight) > 1
  );
}

function findScrollContainer(target: EventTarget | null): HTMLElement | null {
  let element = target instanceof HTMLElement ? target : null;

  while (element) {
    if (element.matches(HIDDEN_SCROLLBAR_SELECTOR)) return null;
    if (canScroll(element, "vertical") || canScroll(element, "horizontal")) return element;
    element = element.parentElement;
  }

  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

export function OverlayScrollbars() {
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<ScrollbarDrag | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const verticalTrackRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);

  const updateScrollbars = useCallback(() => {
    const target = activeTargetRef.current;
    const horizontalTrack = horizontalTrackRef.current;
    const horizontalThumb = horizontalThumbRef.current;
    const verticalTrack = verticalTrackRef.current;
    const verticalThumb = verticalThumbRef.current;
    if (!target || !horizontalTrack || !horizontalThumb || !verticalTrack || !verticalThumb) return;

    const bounds = target.getBoundingClientRect();
    const left = Math.max(0, bounds.left);
    const right = Math.min(window.innerWidth, bounds.right);
    const top = Math.max(0, bounds.top);
    const bottom = Math.min(window.innerHeight, bounds.bottom);
    const hasHorizontalScrollbar = canScroll(target, "horizontal");
    const hasVerticalScrollbar = canScroll(target, "vertical");
    const horizontalTrackSize = Math.max(
      0,
      right - left - (hasVerticalScrollbar ? SCROLLBAR_SIZE : 0),
    );
    const verticalTrackSize = Math.max(
      0,
      bottom - top - (hasHorizontalScrollbar ? SCROLLBAR_SIZE : 0),
    );

    horizontalTrack.dataset.visible = String(hasHorizontalScrollbar && horizontalTrackSize > 0);
    horizontalTrack.style.left = `${left}px`;
    horizontalTrack.style.top = `${bottom - SCROLLBAR_SIZE}px`;
    horizontalTrack.style.width = `${horizontalTrackSize}px`;
    const horizontalThumbSize = Math.min(
      horizontalTrackSize,
      Math.max(MIN_THUMB_SIZE, (target.clientWidth / target.scrollWidth) * horizontalTrackSize),
    );
    horizontalThumb.style.width = `${horizontalThumbSize}px`;
    horizontalThumb.style.transform = `translateX(${
      target.scrollWidth > target.clientWidth
        ? (target.scrollLeft / (target.scrollWidth - target.clientWidth)) *
          (horizontalTrackSize - horizontalThumbSize)
        : 0
    }px)`;

    verticalTrack.dataset.visible = String(hasVerticalScrollbar && verticalTrackSize > 0);
    verticalTrack.style.left = `${right - SCROLLBAR_SIZE}px`;
    verticalTrack.style.top = `${top}px`;
    verticalTrack.style.height = `${verticalTrackSize}px`;
    const verticalThumbSize = Math.min(
      verticalTrackSize,
      Math.max(MIN_THUMB_SIZE, (target.clientHeight / target.scrollHeight) * verticalTrackSize),
    );
    verticalThumb.style.height = `${verticalThumbSize}px`;
    verticalThumb.style.transform = `translateY(${
      target.scrollHeight > target.clientHeight
        ? (target.scrollTop / (target.scrollHeight - target.clientHeight)) *
          (verticalTrackSize - verticalThumbSize)
        : 0
    }px)`;
  }, []);

  const hideScrollbars = useCallback(() => {
    horizontalTrackRef.current?.removeAttribute("data-active");
    verticalTrackRef.current?.removeAttribute("data-active");
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(hideScrollbars, HIDE_DELAY_MS);
  }, [hideScrollbars]);

  const showScrollbars = useCallback(
    (target: HTMLElement) => {
      if (activeTargetRef.current !== target) {
        activeTargetRef.current = target;
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current?.observe(target);
      }

      updateScrollbars();
      horizontalTrackRef.current?.setAttribute("data-active", "true");
      verticalTrackRef.current?.setAttribute("data-active", "true");
      scheduleHide();
    },
    [scheduleHide, updateScrollbars],
  );

  useEffect(() => {
    document.documentElement.dataset.overlayScrollbars = "true";
    resizeObserverRef.current = new ResizeObserver(updateScrollbars);

    const handleScroll = (event: Event) => {
      const target = findScrollContainer(event.target);
      if (target) showScrollbars(target);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (dragRef.current) return;
      const target = findScrollContainer(event.target);
      if (!target) return;

      const bounds = target.getBoundingClientRect();
      const isNearVertical =
        canScroll(target, "vertical") && event.clientX >= bounds.right - SCROLLBAR_SIZE * 2;
      const isNearHorizontal =
        canScroll(target, "horizontal") && event.clientY >= bounds.bottom - SCROLLBAR_SIZE * 2;
      if (isNearVertical || isNearHorizontal) showScrollbars(target);
    };
    const handleResize = () => updateScrollbars();

    document.addEventListener("scroll", handleScroll, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("resize", handleResize);

    return () => {
      delete document.documentElement.dataset.overlayScrollbars;
      document.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("resize", handleResize);
      resizeObserverRef.current?.disconnect();
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [showScrollbars, updateScrollbars]);

  function handleTrackPointerDown(axis: ScrollAxis, event: React.PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const target = activeTargetRef.current;
    const thumb = axis === "horizontal" ? horizontalThumbRef.current : verticalThumbRef.current;
    if (!target || !thumb) return;

    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const trackSize = axis === "horizontal" ? bounds.width : bounds.height;
    const thumbSize = axis === "horizontal" ? thumb.clientWidth : thumb.clientHeight;
    const pointer =
      axis === "horizontal" ? event.clientX - bounds.left : event.clientY - bounds.top;
    const maxScroll =
      axis === "horizontal"
        ? target.scrollWidth - target.clientWidth
        : target.scrollHeight - target.clientHeight;
    const scroll = ((pointer - thumbSize / 2) / Math.max(1, trackSize - thumbSize)) * maxScroll;

    if (axis === "horizontal") target.scrollLeft = scroll;
    else target.scrollTop = scroll;
  }

  function handleThumbPointerDown(axis: ScrollAxis, event: React.PointerEvent<HTMLDivElement>) {
    const target = activeTargetRef.current;
    if (!target) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      axis,
      pointerId: event.pointerId,
      pointerStart: axis === "horizontal" ? event.clientX : event.clientY,
      scrollStart: axis === "horizontal" ? target.scrollLeft : target.scrollTop,
      target,
    };
    if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
  }

  function handleThumbPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = event.currentTarget.parentElement;
    if (!drag || drag.pointerId !== event.pointerId || !track) return;

    const pointer = drag.axis === "horizontal" ? event.clientX : event.clientY;
    const trackSize = drag.axis === "horizontal" ? track.clientWidth : track.clientHeight;
    const thumbSize =
      drag.axis === "horizontal"
        ? event.currentTarget.clientWidth
        : event.currentTarget.clientHeight;
    const maxScroll =
      drag.axis === "horizontal"
        ? drag.target.scrollWidth - drag.target.clientWidth
        : drag.target.scrollHeight - drag.target.clientHeight;
    const scroll =
      drag.scrollStart +
      ((pointer - drag.pointerStart) / Math.max(1, trackSize - thumbSize)) * maxScroll;

    if (drag.axis === "horizontal") drag.target.scrollLeft = scroll;
    else drag.target.scrollTop = scroll;
  }

  function handleThumbPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleHide();
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="overlay-scrollbars__track overlay-scrollbars__track--horizontal"
        ref={horizontalTrackRef}
        onPointerDown={(event) => handleTrackPointerDown("horizontal", event)}
      >
        <div
          className="overlay-scrollbars__thumb"
          ref={horizontalThumbRef}
          onPointerCancel={handleThumbPointerEnd}
          onPointerDown={(event) => handleThumbPointerDown("horizontal", event)}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerEnd}
        />
      </div>
      <div
        aria-hidden="true"
        className="overlay-scrollbars__track overlay-scrollbars__track--vertical"
        ref={verticalTrackRef}
        onPointerDown={(event) => handleTrackPointerDown("vertical", event)}
      >
        <div
          className="overlay-scrollbars__thumb"
          ref={verticalThumbRef}
          onPointerCancel={handleThumbPointerEnd}
          onPointerDown={(event) => handleThumbPointerDown("vertical", event)}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerEnd}
        />
      </div>
    </>,
    document.body,
  );
}
