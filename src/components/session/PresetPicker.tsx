"use client";

import { useState } from "react";

import RailGroup from "@/components/ui/RailGroup";
import type { Preset } from "@/lib/presets";

type PresetPickerProps = {
  presets: Preset[];
  /** Id of the preset currently loading, if any. */
  loadingPresetId: string | null;
  onLoadPreset: (preset: Preset) => void;
};

/**
 * Kit picker, stacked for the rail. Picking and loading are two steps rather
 * than one, because loading replaces every sample in the machine: running that
 * off the select itself would make browsing the list destructive.
 */
export default function PresetPicker({
  presets,
  loadingPresetId,
  onLoadPreset,
}: PresetPickerProps) {
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "");
  const selected =
    presets.find((preset) => preset.id === selectedId) ?? presets[0];

  if (!selected) return null;

  const isLoading = loadingPresetId !== null;

  /** The blank kit is the one with nothing to load, so it clears instead. */
  const isEmptyKit = selected.sampleIds.length === 0;

  return (
    <RailGroup title="Kit">
      {/* All four on the face of the rail rather than folded into a list:
          there are only four, and which kit is loaded is worth being able to
          see without opening anything. Picking one still only points the button
          below at it — loading is what replaces the samples, so it stays a
          second, deliberate press. */}
      <div role="group" aria-label="Kit" className="grid grid-cols-2 gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelectedId(preset.id)}
            aria-pressed={preset.id === selected.id}
            data-on={preset.id === selected.id}
            className="btn"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onLoadPreset(selected)}
        disabled={isLoading}
        className="btn h-9 w-full"
      >
        {isLoading ? "Loading…" : isEmptyKit ? "Clear kit" : "Load kit"}
      </button>

      <p className="text-muted text-xs">
        {isEmptyKit
          ? "Empties every channel — samples and patterns both."
          : `Fills channels 1–${selected.sampleIds.length}. Step patterns are kept.`}
      </p>
    </RailGroup>
  );
}
