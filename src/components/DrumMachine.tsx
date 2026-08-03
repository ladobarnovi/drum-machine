"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChannelRow from "./ChannelRow";
import Transport from "./Transport";
import { useSampleBank } from "@/hooks/useSampleBank";
import { useSequencer } from "@/hooks/useSequencer";
import {
  DEFAULT_BPM,
  createInitialChannels,
  type Channel,
  type SampleState,
} from "@/lib/sequencer";

export default function DrumMachine() {
  const [channels, setChannels] = useState<Channel[]>(createInitialChannels);
  const [bpm, setBpm] = useState(DEFAULT_BPM);

  const { ensureContext, loadSample, removeSample, trigger } = useSampleBank();

  // The scheduler runs outside React's render cycle, so it reads the current
  // pattern through a ref rather than through a captured prop.
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const handleStep = useCallback(
    (stepIndex: number, time: number) => {
      for (const channel of channelsRef.current) {
        if (channel.steps[stepIndex]) {
          trigger(channel.id, time);
        }
      }
    },
    [trigger],
  );

  const { isPlaying, currentStep, play, stop } = useSequencer({
    bpm,
    ensureContext,
    onStep: handleStep,
  });

  const setSampleState = useCallback(
    (channelId: string, sample: SampleState) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, sample } : channel,
        ),
      );
    },
    [],
  );

  const handleToggleStep = useCallback(
    (channelId: string, stepIndex: number) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                steps: channel.steps.map((active, index) =>
                  index === stepIndex ? !active : active,
                ),
              }
            : channel,
        ),
      );
    },
    [],
  );

  const handleUpload = useCallback(
    async (channelId: string, file: File) => {
      setSampleState(channelId, { status: "loading", name: file.name });
      try {
        await loadSample(channelId, file);
        setSampleState(channelId, { status: "loaded", name: file.name });
      } catch (error) {
        console.error(`Failed to decode audio for ${channelId}`, error);
        removeSample(channelId);
        setSampleState(channelId, {
          status: "error",
          message: "Couldn't load that file",
        });
      }
    },
    [loadSample, removeSample, setSampleState],
  );

  // Removing a sample keeps the channel's pattern, so a new sample can be
  // dropped straight onto the same rhythm.
  const handleRemove = useCallback(
    (channelId: string) => {
      removeSample(channelId);
      setSampleState(channelId, { status: "empty" });
    },
    [removeSample, setSampleState],
  );

  const canPlay = channels.some(
    (channel) => channel.sample.status === "loaded",
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 text-neutral-900 dark:text-neutral-100">
      <h1 className="text-lg font-semibold">Drum Machine</h1>

      <Transport
        isPlaying={isPlaying}
        bpm={bpm}
        canPlay={canPlay}
        onTogglePlay={isPlaying ? stop : play}
        onBpmChange={setBpm}
      />

      <div className="flex flex-col gap-2">
        {channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            currentStep={currentStep}
            onToggleStep={(stepIndex) =>
              handleToggleStep(channel.id, stepIndex)
            }
            onUpload={(file) => void handleUpload(channel.id, file)}
            onRemove={() => handleRemove(channel.id)}
          />
        ))}
      </div>
    </div>
  );
}
