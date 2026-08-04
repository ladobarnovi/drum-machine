"use client";

import { useState } from "react";

import RailGroup from "./RailGroup";
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

  return (
    <RailGroup title="Kit">
      <select
        value={selected.id}
        onChange={(event) => setSelectedId(event.target.value)}
        aria-label="Kit"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onLoadPreset(selected)}
        disabled={isLoading}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {isLoading ? "Loading…" : "Load kit"}
      </button>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Fills channels 1–{selected.slots.length}. Step patterns are kept.
      </p>
    </RailGroup>
  );
}
