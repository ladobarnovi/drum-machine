"use client";

import { useEffect, useRef, useState } from "react";

import { useMidiSupported } from "@/hooks/useMidiSupported";

export type MidiPortInfo = { id: string; name: string };

/**
 * Requests Web MIDI access once and keeps the input and output port lists in
 * step with whatever is plugged in or unplugged afterwards.
 *
 * Called once in `DrumMachine` and handed to `useMidiInput` and
 * `useMidiClockOutput` rather than called again by each of them, so the
 * permission prompt is asked for once regardless of how many of the two are
 * in use, and both see the same live port objects.
 */
export function useMidiAccess() {
  const supported = useMidiSupported();
  const [inputs, setInputs] = useState<MidiPortInfo[]>([]);
  const [outputs, setOutputs] = useState<MidiPortInfo[]>([]);

  // The DOM ports themselves aren't state — only their id and name are, for
  // the pickers. `MIDIInputMap`/`MIDIOutputMap` here only offer `forEach`, so
  // these maps are what turn a selected id back into the port to act on.
  const inputPortsRef = useRef<Map<string, MIDIInput>>(new Map());
  const outputPortsRef = useRef<Map<string, MIDIOutput>>(new Map());

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    const sync = (access: MIDIAccess) => {
      const inputPorts = new Map<string, MIDIInput>();
      access.inputs.forEach((input) => inputPorts.set(input.id, input));
      inputPortsRef.current = inputPorts;
      setInputs(
        Array.from(inputPorts.values()).map((input) => ({
          id: input.id,
          name: input.name ?? "MIDI input",
        })),
      );

      const outputPorts = new Map<string, MIDIOutput>();
      access.outputs.forEach((output) => outputPorts.set(output.id, output));
      outputPortsRef.current = outputPorts;
      setOutputs(
        Array.from(outputPorts.values()).map((output) => ({
          id: output.id,
          name: output.name ?? "MIDI output",
        })),
      );
    };

    navigator
      .requestMIDIAccess()
      .then((access) => {
        if (cancelled) return;
        sync(access);
        access.onstatechange = () => sync(access);
      })
      .catch(() => {
        // Permission denied, or no MIDI hardware to arbitrate access over —
        // the machine works exactly as it did before there was such a thing.
      });

    return () => {
      cancelled = true;
    };
  }, [supported]);

  return { supported, inputs, outputs, inputPortsRef, outputPortsRef };
}

export type MidiAccess = ReturnType<typeof useMidiAccess>;
