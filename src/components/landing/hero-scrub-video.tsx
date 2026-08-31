"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Fraction of the clip's total duration that one full window-width mouse sweep scrubs through.
const SENSITIVITY = 0.8;

/**
 * Scoped to whatever container the caller sizes it into (the hero section) — not a page-wide
 * fixed layer, so it scrolls away with the hero and is never visible once the user scrolls past
 * it. It never autoplays; currentTime is driven entirely by horizontal mousemove, tracked on this
 * component's own container rather than window, so the scrub only responds while the cursor is
 * actually over the hero (and stops mattering the moment it's scrolled out of view).
 *
 * Seeking a video is asynchronous — setting currentTime again before the previous seek's `seeked`
 * event fires can drop or stall frames. `targetTime` is updated on every mousemove regardless,
 * but a new seek is only issued once the in-flight one completes; `onSeeked` then checks whether
 * targetTime moved again while it was seeking and immediately queues the next one. That keeps the
 * video always heading toward the latest cursor position without flooding it with overlapping
 * seeks.
 *
 * `children` renders inside the same pointer-tracked container, positioned above the video, so
 * the hero can overlay its headline without a second listener.
 *
 * Touch/coarse-pointer devices (no continuous mousemove to drive a scrub with) get a normal
 * autoplay loop instead.
 */
export function HeroScrubVideo({
  src,
  className,
  objectPositionClassName = "object-center",
  scale = 1,
  children,
}: {
  src: string;
  className?: string;
  /** Tailwind object-position utility class(es) — a plain string can't express a breakpoint
   * change, and the crop needs one: a tall/narrow phone viewport crops far more of the frame's
   * width than a tablet does, so the same fixed focal point that centers the subject on desktop
   * pushes it (and Piggy's face) out of frame on small phones. */
  objectPositionClassName?: string;
  /** Shrinks the rendered video below its "cover" size, centered, so the container's own
   * background frames it — object-fit: cover already scales the footage up as far as it goes to
   * fill the box with no gaps, so there's no way to make the subject read smaller within a
   * gapless frame; this trades a visible margin for a less blown-up subject. */
  scale?: number;
  children?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const canScrub = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canScrub) {
      // No mouse to scrub with (touch/coarse-pointer) — play forward once and freeze on the
      // "Piggy looking at the camera" pose (~3s in) instead of looping the whole clip, so the
      // framing (and where the phone sits in Piggy's hands) stays put for the overlay content.
      const FREEZE_AT_SECONDS = 3;
      const onTimeUpdate = () => {
        if (video.currentTime >= FREEZE_AT_SECONDS) {
          video.pause();
          video.removeEventListener("timeupdate", onTimeUpdate);
        }
      };
      video.addEventListener("timeupdate", onTimeUpdate);
      video.play().catch(() => {});
      return () => video.removeEventListener("timeupdate", onTimeUpdate);
    }

    let prevX: number | null = null;
    let targetTime = 0;
    let seeking = false;

    const seekTo = (time: number) => {
      seeking = true;
      video.currentTime = time;
    };

    const onSeeked = () => {
      seeking = false;
      if (Math.abs(targetTime - video.currentTime) > 0.01) seekTo(targetTime);
    };
    video.addEventListener("seeked", onSeeked);

    const onPointerMove = (event: PointerEvent) => {
      if (!video.duration) return;
      if (prevX === null) { prevX = event.clientX; return; }
      const delta = event.clientX - prevX;
      prevX = event.clientX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTime = Math.min(video.duration, Math.max(0, targetTime + offset));
      if (!seeking) seekTo(targetTime);
    };
    container.addEventListener("pointermove", onPointerMove);

    return () => {
      video.removeEventListener("seeked", onSeeked);
      container.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div ref={containerRef} className={className ?? "relative h-full w-full"}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="auto"
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover ${objectPositionClassName}`}
        style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
      />
      {children}
    </div>
  );
}
