/** Follows `MIDI_INPUT_STORAGE_KEY`'s naming in `lib/midi.ts`. */
export const AUDIO_OUTPUT_STORAGE_KEY = "drum-machine-audio-output";

/**
 * What the Web Audio spec means by "whatever the system is pointed at" — an
 * empty sink id, rather than a device of its own. Kept as the machine's
 * default so a fresh visit plays out of the same speakers everything else on
 * the computer does, and so following the OS when its default changes costs
 * nothing to express.
 */
export const SYSTEM_DEFAULT_SINK_ID = "";

export type AudioOutputDevice = {
  id: string;
  name: string;
  /** False while the browser is withholding the name for privacy. */
  named: boolean;
};

/**
 * Whether this browser can send an AudioContext somewhere other than the
 * system default. Chrome-shaped for now: `AudioContext.setSinkId` is the piece
 * Safari and Firefox are missing, and without it there is nothing to route.
 */
export function isAudioOutputSelectionSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof AudioContext === "undefined") return false;
  if (!("setSinkId" in AudioContext.prototype)) return false;
  return typeof navigator.mediaDevices?.enumerateDevices === "function";
}

/**
 * Points a live context at a device. Typed through `unknown` rather than
 * against a `setSinkId` the installed DOM lib may or may not declare yet.
 */
export async function setContextSink(
  context: AudioContext,
  sinkId: string,
): Promise<void> {
  const withSink = context as unknown as {
    setSinkId?: (id: string) => Promise<void>;
  };
  if (typeof withSink.setSinkId !== "function") return;

  try {
    await withSink.setSinkId(sinkId);
  } catch {
    // A device unplugged between being picked and being switched to, or one
    // the browser won't hand over. The context carries on out of whatever it
    // was already using, which is the only other thing it could do.
  }
}

export type AudioOutputList = {
  devices: AudioOutputDevice[];
  /**
   * True while the browser is holding the real list back behind a permission,
   * so there is a point in asking for it.
   */
  namesHidden: boolean;
};

/**
 * The output devices this browser is willing to hand over, minus the entries
 * that aren't a device to route to: the empty-id placeholder, and the two
 * aliases Chrome adds for the system's own choices — "default" and
 * "communications" both mean "follow the OS", which is what
 * `SYSTEM_DEFAULT_SINK_ID` already says, and listing them beside it would
 * offer the same thing three times.
 *
 * Until the page has been granted audio-device access, Chrome answers with a
 * single unnamed placeholder instead of the real list — so an unnamed entry
 * anywhere in the raw results, filtered out below or not, is what
 * `namesHidden` reports on. Reading it after the filter instead would leave
 * the commonest case, one placeholder and nothing else, looking like a machine
 * with no outputs at all rather than one behind a prompt.
 */
export async function listAudioOutputs(): Promise<AudioOutputList> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const outputs = devices.filter((device) => device.kind === "audiooutput");

  return {
    devices: outputs
      .filter(
        (device) =>
          device.deviceId !== "" &&
          device.deviceId !== "default" &&
          device.deviceId !== "communications",
      )
      // A device the browser named partially — listed but not labelled — gets
      // a position instead, enough to tell them apart and try them by ear.
      .map((device, index) => ({
        id: device.deviceId,
        name: device.label || `Output ${index + 1}`,
        named: device.label !== "",
      })),
    namesHidden: outputs.some((device) => device.label === ""),
  };
}

/**
 * Asks for the microphone purely to unlock the speaker names: browsers treat
 * the two as one permission, and hold back output labels until audio access
 * has been granted once. The stream is stopped the moment it arrives — nothing
 * is recorded, and the recording indicator goes out with it.
 *
 * Behind an explicit button rather than run on open, since a permission prompt
 * nobody asked for is its own kind of rude.
 */
export async function requestAudioOutputNames(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}
