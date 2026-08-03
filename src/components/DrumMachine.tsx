"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChannelEditor from "./ChannelEditor";
import ChannelGrid from "./ChannelGrid";
import Transport from "./Transport";
import { useSampleBank } from "@/hooks/useSampleBank";
import { useSequencer } from "@/hooks/useSequencer";
import {
  DEFAULT_BPM,
  channelIdForIndex,
  clampChannelName,
  clampLength,
  clampPitch,
  clampVolume,
  createInitialChannels,
  playbackRateForPitch,
  type Channel,
} from "@/lib/sequencer";
import { computePeaks } from "@/lib/waveform";

export default function DrumMachine() {
  const [channels, setChannels] = useState<Channel[]>(createInitialChannels);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [selectedChannelId, setSelectedChannelId] = useState(
    channelIdForIndex(0),
  );

  const { ensureContext, loadSample, removeSample, trigger } = useSampleBank();

  // The scheduler runs outside React's render cycle, so it reads the current
  // pattern through a ref rather than through a captured prop.
  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // Each channel wraps the absolute tick by its own length, so channels with
  // different lengths drift against each other instead of restarting together.
  const handleStep = useCallback(
    (tick: number, time: number) => {
      for (const channel of channelsRef.current) {
        if (channel.steps[tick % clampLength(channel.length)]) {
          trigger(channel.id, time, {
            gain: clampVolume(channel.volume),
            playbackRate: playbackRateForPitch(channel.pitch),
          });
        }
      }
    },
    [trigger],
  );

  const { isPlaying, currentTick, play, stop } = useSequencer({
    bpm,
    ensureContext,
    onStep: handleStep,
  });

  /** Applies a partial update to a single channel. */
  const updateChannel = useCallback(
    (channelId: string, patch: Partial<Channel>) => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, ...patch } : channel,
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
      updateChannel(channelId, {
        sample: { status: "loading", name: file.name },
      });
      try {
        const buffer = await loadSample(channelId, file);
        updateChannel(channelId, {
          sample: {
            status: "loaded",
            name: file.name,
            peaks: computePeaks(buffer),
            durationSeconds: buffer.duration,
          },
        });
      } catch (error) {
        console.error(`Failed to decode audio for ${channelId}`, error);
        removeSample(channelId);
        updateChannel(channelId, {
          sample: { status: "error", message: "Couldn't load that file" },
        });
      }
    },
    [loadSample, removeSample, updateChannel],
  );

  // Removing a sample keeps the channel's pattern, so a new sample can be
  // dropped straight onto the same rhythm.
  const handleRemove = useCallback(
    (channelId: string) => {
      removeSample(channelId);
      updateChannel(channelId, { sample: { status: "empty" } });
    },
    [removeSample, updateChannel],
  );

  const handleLengthChange = useCallback(
    (channelId: string, length: number) => {
      updateChannel(channelId, { length: clampLength(length) });
    },
    [updateChannel],
  );

  const handleVolumeChange = useCallback(
    (channelId: string, volume: number) => {
      updateChannel(channelId, { volume: clampVolume(volume) });
    },
    [updateChannel],
  );

  const handlePitchChange = useCallback(
    (channelId: string, pitch: number) => {
      updateChannel(channelId, { pitch: clampPitch(pitch) });
    },
    [updateChannel],
  );

  const handleNameChange = useCallback(
    (channelId: string, name: string) => {
      updateChannel(channelId, { name: clampChannelName(name) });
    },
    [updateChannel],
  );

  const canPlay = channels.some(
    (channel) => channel.sample.status === "loaded",
  );

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  // The playhead shown is the selected channel's own position in its cycle.
  const currentStep =
    currentTick === null
      ? null
      : currentTick % clampLength(selectedChannel.length);

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

      <ChannelGrid
        channels={channels}
        selectedChannelId={selectedChannel.id}
        onSelectChannel={setSelectedChannelId}
      />

      <ChannelEditor
        channel={selectedChannel}
        currentStep={currentStep}
        onToggleStep={(stepIndex) =>
          handleToggleStep(selectedChannel.id, stepIndex)
        }
        onUpload={(file) => void handleUpload(selectedChannel.id, file)}
        onRemove={() => handleRemove(selectedChannel.id)}
        onLengthChange={(length) =>
          handleLengthChange(selectedChannel.id, length)
        }
        onVolumeChange={(volume) =>
          handleVolumeChange(selectedChannel.id, volume)
        }
        onPitchChange={(pitch) => handlePitchChange(selectedChannel.id, pitch)}
        onNameChange={(name) => handleNameChange(selectedChannel.id, name)}
      />
    </div>
  );
}
