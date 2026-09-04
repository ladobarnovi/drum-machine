"use client";

import SlotButton from "@/components/patterns/SlotButton";
import RailGroup from "@/components/ui/RailGroup";
import { sceneDisplayName, type Scenes } from "@/lib/scenes";

type SceneGridProps = {
  scenes: Scenes;
  /**
   * The slot the live mutes currently match, or null for a mix that matches
   * none. Derived by the caller rather than remembered here — see
   * `activeSceneIndex`.
   */
  activeIndex: number | null;
  onRecall: (index: number) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
};

/**
 * The eight scene slots, in the controls rail.
 *
 * Built from `SlotButton` rather than from something of its own, because a
 * scene slot is the same object a pattern slot is — a square that is empty or
 * filled, and ringed while it is the one in force — and a second widget that
 * looked almost like it would only raise the question of how they differ.
 * Wearing a colour of its own is the whole of the difference, which is exactly
 * as much as there is.
 */
export default function SceneGrid({
  scenes,
  activeIndex,
  onRecall,
  onContextMenu,
}: SceneGridProps) {
  return (
    <RailGroup title="Scenes">
      <div role="group" aria-label="Scenes" className="grid grid-cols-4 gap-2">
        {scenes.map((scene, index) => (
          <SlotButton
            key={index}
            displayText={String(index + 1)}
            variant="scene"
            filled={scene !== null}
            active={activeIndex === index}
            label={sceneDisplayName(scene, index)}
            // Nothing to recall from an empty slot; the right click that saves
            // one there still works, exactly as it does on a pattern slot.
            onClick={() => {
              if (scene) onRecall(index);
            }}
            onContextMenu={(x, y) => onContextMenu(index, x, y)}
          />
        ))}
      </div>
    </RailGroup>
  );
}
