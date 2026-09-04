import type { Channel } from "./sequencer";

/**
 * Eight scenes, because eight is what the keyboard can reach: the digits
 * `shortcutDigitFromCode` reads run 1 to 8, and `SHORTCUT_BANK_SIZE` is
 * already that wide. A ninth slot would be one nothing could recall while
 * both hands were busy, which is the only time a scene is worth having.
 */
export const SCENE_COUNT = 8;

/** Follows `BANKS_STORAGE_KEY`'s naming in `lib/patterns.ts`. */
export const SCENES_STORAGE_KEY = "drum-machine-scenes";

/** Matches `MAX_CHANNEL_NAME_LENGTH`, so both name fields behave alike. */
export const MAX_SCENE_NAME_LENGTH = 24;

/**
 * One performance state: which channels are silent, and nothing else.
 *
 * Deliberately not a mix. `ParameterSnapshot` already owns "a mix to come back
 * to" — levels, sends, the whole effects rail — and a scene that also carried
 * those would be a second way to do the one job, with no way to tell from the
 * UI which of the two last touched a fader. A scene answers a different
 * question, and only that one: who is playing right now.
 *
 * Solo is left out for the same reason it is kept apart from mute in
 * `isChannelAudible`. Mute is an arrangement decision — this channel is out
 * for this section — and survives being written down. Solo is a listening
 * tool, reached for to check one thing and dropped a moment later; a slot that
 * handed someone back a half-finished solo would be a bug that felt like one.
 * So recalling a scene changes what sits underneath a solo without disturbing
 * the solo itself, and dropping the solo reveals the scene.
 */
export type Scene = {
  /** What the slot is called. Empty for a scene nobody has named. */
  name: string;
  /**
   * The channel ids this scene silences.
   *
   * Ids rather than a flag per position, for the reason a snapshot is keyed by
   * one: a scene lands on the channel it was taken from however the list is
   * read back. A list rather than a flag for all sixteen, because absent
   * already means audible — which makes the empty list the scene where
   * everything plays, rather than something that has to be spelled out.
   */
  muted: string[];
};

/** Eight scene slots. `null` is an empty slot, not a scene that mutes nothing. */
export type Scenes = (Scene | null)[];

export function createInitialScenes(): Scenes {
  return Array.from({ length: SCENE_COUNT }, () => null);
}

/** How a scene is named when it has none of its own: Scene 1, Scene 2… */
export function sceneLabel(sceneIndex: number): string {
  return `Scene ${sceneIndex + 1}`;
}

/** What a scene is called wherever one is shown, named or not. */
export function sceneDisplayName(
  scene: Scene | null,
  sceneIndex: number,
): string {
  const named = scene?.name.trim();
  return named ? named : sceneLabel(sceneIndex);
}

export function clampSceneName(value: string): string {
  return value.slice(0, MAX_SCENE_NAME_LENGTH);
}

/**
 * Reads the live mutes into a scene. Keeps whatever the slot was already
 * called, so saving over a scene you have named does not cost you the name.
 */
export function captureScene(channels: Channel[], name = ""): Scene {
  return {
    name: clampSceneName(name),
    muted: channels
      .filter((channel) => channel.muted)
      .map((channel) => channel.id),
  };
}

/**
 * Writes a scene back over the channels: every channel it names goes silent,
 * every channel it does not comes back.
 *
 * A channel already sitting where the scene wants it is handed back unchanged
 * rather than copied, the way `applyStepFill` leaves a step it has nothing to
 * say about — so recalling the scene that is already playing is not a render.
 */
export function applyScene(channels: Channel[], scene: Scene): Channel[] {
  const muted = new Set(scene.muted);

  return channels.map((channel) => {
    const next = muted.has(channel.id);
    return channel.muted === next ? channel : { ...channel, muted: next };
  });
}

/**
 * Whether the channels are already muted exactly the way this scene says.
 *
 * What the scene grid lights its ring from, rather than a stored marker of
 * which slot was last pressed — the same trick `matchesStepFill` plays for the
 * fill buttons. Derived, it cannot go stale: muting a channel by hand drops
 * the ring the moment the mix stops matching, and muting your way back into a
 * scene's shape lights it again without anything having to say so.
 *
 * An id the scene names that no channel has is simply not found, which is the
 * right answer rather than a hole: `applyScene` cannot silence a channel that
 * is not there either, so the two agree about what the scene sounds like.
 */
export function matchesScene(channels: Channel[], scene: Scene): boolean {
  const muted = new Set(scene.muted);
  return channels.every((channel) => channel.muted === muted.has(channel.id));
}

/**
 * The slot whose scene the channels are currently sitting in, or null for a
 * mix that matches none of them.
 *
 * The first match wins. Two slots holding the same set of mutes is a thing a
 * user is allowed to do — the same mutes under two names, for two moments in a
 * set — and lighting both would say the machine was in two places at once.
 */
export function activeSceneIndex(
  channels: Channel[],
  scenes: Scenes,
): number | null {
  const index = scenes.findIndex(
    (scene) => scene !== null && matchesScene(channels, scene),
  );
  return index === -1 ? null : index;
}
