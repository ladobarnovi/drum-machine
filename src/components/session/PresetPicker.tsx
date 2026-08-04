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

  return (
    <RailGroup title="Kit">
      <select
        value={selected.id}
        onChange={(event) => setSelectedId(event.target.value)}
        aria-label="Kit"
        className="border-edge bg-field w-full rounded border px-2 py-1 text-xs"
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
        className="border-edge hover:bg-raised w-full rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Loading…" : "Load kit"}
      </button>

      <p className="text-muted text-xs">
        Fills channels 1–{selected.slots.length}. Step patterns are kept.
      </p>
    </RailGroup>
  );
}
