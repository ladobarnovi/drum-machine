"use client";

import type { SampleState } from "@/lib/sequencer";

type SampleSlotProps = {
  channelLabel: string;
  sample: SampleState;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

function statusText(sample: SampleState) {
  switch (sample.status) {
    case "loaded":
      return sample.name;
    case "loading":
      return "Loading…";
    case "error":
      return sample.message;
    case "empty":
      return "No sample";
  }
}

export default function SampleSlot({
  channelLabel,
  sample,
  onUpload,
  onRemove,
}: SampleSlotProps) {
  const hasSample = sample.status === "loaded";

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (file) onUpload(file);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className="border-edge hover:bg-raised shrink-0 cursor-pointer rounded border px-2 py-1 text-xs">
        {hasSample ? "Replace" : "Load"}
        <input
          type="file"
          accept="audio/*"
          onChange={handleChange}
          aria-label={`Load sample for channel ${channelLabel}`}
          className="hidden"
        />
      </label>

      <span
        title={statusText(sample)}
        className={`min-w-0 flex-1 truncate text-xs ${
          sample.status === "error" ? "text-danger" : "text-muted"
        }`}
      >
        {statusText(sample)}
      </span>

      {hasSample && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove sample from channel ${channelLabel}`}
          className="text-muted hover:bg-raised hover:text-danger shrink-0 rounded px-1.5 text-sm"
        >
          ×
        </button>
      )}
    </div>
  );
}
