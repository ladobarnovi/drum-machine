"use client";

import { useEffect, useRef } from "react";

import { subscribeToTheme } from "@/lib/themes";

/** How tall the screen is drawn, in CSS pixels. */
const SCOPE_HEIGHT_PX = 64;

/** Thickness of the trace, in CSS pixels. */
const TRACE_WIDTH_PX = 1.5;

/**
 * How much of the screen's half-height a full-scale sample reaches.
 *
 * Short of the edge on purpose: a mix driven into the master's own headroom
 * would otherwise draw itself flat against the top and bottom of the frame, and
 * the whole use of a scope is seeing that it is about to.
 */
const TRACE_HEADROOM = 0.9;

/** The midpoint `getByteTimeDomainData` reports silence as. */
const SILENCE_BYTE = 128;

type OscilloscopeProps = {
  /** Reads the last window of samples leaving the machine, or null if silent. */
  getWaveform: () => Uint8Array | null;
};

/**
 * The mix as a waveform, drawn from the tap on the master fader.
 *
 * Canvas rather than SVG: this redraws a couple of thousand points sixty times
 * a second, and putting that many nodes through the DOM on every frame is the
 * one way to make a scope cost more than everything else on the page together.
 *
 * Which also means the colours cannot come from a class. They are read off the
 * CSS custom properties instead, and re-read when the theme changes or the
 * system flips between light and dark — `classic` follows the system, so the
 * theme id alone does not say what colour anything is.
 */
export default function Oscilloscope({ getWaveform }: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let trace = "";
    let centre = "";

    const readColours = () => {
      const styles = getComputedStyle(canvas);
      trace = styles.getPropertyValue("--accent").trim();
      centre = styles.getPropertyValue("--edge").trim();
    };

    readColours();

    // Both ways the palette can move out from under a canvas that cannot simply
    // be given a class and left alone.
    const unsubscribe = subscribeToTheme(readColours);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", readColours);

    // The rail changes width between breakpoints and when the drawer opens, so
    // the backing store is sized from the box rather than fixed once.
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      // Drawing stays in CSS pixels; the transform is what makes it land on the
      // device's own, so the trace is sharp on a high-density screen.
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (width === 0 || height === 0) return;

      context.clearRect(0, 0, width, height);

      const middle = height / 2;

      // Drawn first and always, so a machine that has never made a sound still
      // shows a screen with a line on it rather than an empty box.
      context.strokeStyle = centre;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, middle);
      context.lineTo(width, middle);
      context.stroke();

      const samples = getWaveform();
      if (!samples || samples.length === 0) return;

      context.strokeStyle = trace;
      context.lineWidth = TRACE_WIDTH_PX;
      context.lineJoin = "round";
      context.beginPath();

      // More samples than pixels, so each column takes the reading that lands
      // on it rather than every sample getting a point of its own.
      const step = samples.length / width;
      for (let x = 0; x < width; x += 1) {
        const sample = samples[Math.floor(x * step)];
        const offset = (sample - SILENCE_BYTE) / SILENCE_BYTE;
        const y = middle - offset * middle * TRACE_HEADROOM;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scheme.removeEventListener("change", readColours);
      unsubscribe();
    };
  }, [getWaveform]);

  return (
    <section className="border-line flex flex-col gap-3 rounded-md border p-3">
      <h3 className="text-xs font-semibold">Scope</h3>

      {/* Hidden from assistive technology: it is a picture of a sound, and
          there is nothing it says that could be said as text. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="bg-panel border-line block w-full rounded border"
        style={{ height: `${SCOPE_HEIGHT_PX}px` }}
      />
    </section>
  );
}
