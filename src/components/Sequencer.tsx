"use client";

import { useEffect, useRef, useState } from "react";

const STEP_COUNT = 16;
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_TIME_S = 0.1;
const DEFAULT_BPM = 120;

function stepButtonClasses(active: boolean, isCurrent: boolean) {
  const base = "h-12 w-full rounded-md border transition-colors";
  const color = active
    ? "border-orange-400 bg-orange-500 hover:bg-orange-400"
    : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700";
  const ring = isCurrent
    ? "ring-2 ring-offset-2 ring-sky-400 dark:ring-offset-neutral-900"
    : "";
  return `${base} ${color} ${ring}`;
}

export default function Sequencer() {
  const [steps, setSteps] = useState<boolean[]>(() =>
    Array(STEP_COUNT).fill(false),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [sampleName, setSampleName] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sampleBufferRef = useRef<AudioBuffer | null>(null);
  const stepsRef = useRef(steps);
  const bpmRef = useRef(bpm);
  const nextStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const schedulerTimeoutRef = useRef<number | null>(null);
  const visualTimeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    return () => {
      if (schedulerTimeoutRef.current !== null) {
        window.clearTimeout(schedulerTimeoutRef.current);
      }
      for (const id of visualTimeoutIdsRef.current) {
        window.clearTimeout(id);
      }
      audioContextRef.current?.close();
    };
  }, []);

  function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsLoadingSample(true);
    setUploadError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      sampleBufferRef.current = audioBuffer;
      setSampleName(file.name);
    } catch (err) {
      console.error("Failed to decode audio file", err);
      sampleBufferRef.current = null;
      setSampleName(null);
      setUploadError("Couldn't load that file — try a different audio file.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  function toggleStep(index: number) {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  function playSampleAt(time: number) {
    const ctx = audioContextRef.current;
    const buffer = sampleBufferRef.current;
    if (!ctx || !buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(time);
  }

  function scheduler() {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME_S) {
      const stepIndex = nextStepRef.current;
      const time = nextNoteTimeRef.current;

      if (stepsRef.current[stepIndex]) {
        playSampleAt(time);
      }

      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      const visualId = window.setTimeout(
        () => setCurrentStep(stepIndex),
        delayMs,
      );
      visualTimeoutIdsRef.current.push(visualId);

      const secondsPerStep = 60 / bpmRef.current / 4;
      nextNoteTimeRef.current += secondsPerStep;
      nextStepRef.current = (stepIndex + 1) % STEP_COUNT;
    }

    schedulerTimeoutRef.current = window.setTimeout(
      scheduler,
      SCHEDULER_INTERVAL_MS,
    );
  }

  function handlePlay() {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    nextStepRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setIsPlaying(true);
    scheduler();
  }

  function handleStop() {
    setIsPlaying(false);
    setCurrentStep(null);
    if (schedulerTimeoutRef.current !== null) {
      window.clearTimeout(schedulerTimeoutRef.current);
      schedulerTimeoutRef.current = null;
    }
    for (const id of visualTimeoutIdsRef.current) {
      window.clearTimeout(id);
    }
    visualTimeoutIdsRef.current = [];
  }

  function handleBpmChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setBpm(value);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 text-neutral-900 dark:text-neutral-100">
      <div className="flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1 text-sm">
          Sample
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="text-sm"
          />
        </label>

        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {isLoadingSample ? "Loading…" : (sampleName ?? "No sample loaded")}
        </span>

        <label className="flex flex-col gap-1 text-sm">
          BPM
          <input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={handleBpmChange}
            className="w-20 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>

        <button
          type="button"
          onClick={isPlaying ? handleStop : handlePlay}
          disabled={!sampleName}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isPlaying ? "Stop" : "Play"}
        </button>
      </div>

      {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}

      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2">
        {steps.map((active, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={active}
            onClick={() => toggleStep(index)}
            className={`${stepButtonClasses(active, currentStep === index)} ${
              index % 4 === 0 ? "ml-2 first:ml-0" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
