"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChannelEditor from "./ChannelEditor";
import ChannelGrid from "./ChannelGrid";
import MasterDriveControls from "./MasterDriveControls";
import PresetPicker from "./PresetPicker";
import Sidebar, { SIDEBAR_ID } from "./Sidebar";
import Transport from "./Transport";
import { useChannelShortcuts } from "@/hooks/useChannelShortcuts";
import { useSampleBank } from "@/hooks/useSampleBank";
import { useSequencer } from "@/hooks/useSequencer";
import { useTransportShortcuts } from "@/hooks/useTransportShortcuts";
import {
  CHANNEL_COUNT,
  DEFAULT_BPM,
  DEFAULT_MASTER_DRIVE,
  channelIdForIndex,
  clampChannelName,
  clampFrequency,
  clampLength,
  clampPitch,
  clampVolume,
  createInitialChannels,
  hasSoloedChannel,
  isChannelAudible,
  triggerOptionsForChannel,
  type Channel,
  type MasterDrive,
} from "@/lib/sequencer";
import { PRESETS, presetSlotUrl, type Preset } from "@/lib/presets";
import { computePeaks } from "@/lib/waveform";

export default function DrumMachine() {
  const [channels, setChannels] = useState<Channel[]>(createInitialChannels);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [selectedChannelId, setSelectedChannelId] = useState(
    channelIdForIndex(0),
  );
  /** Drawer state, only used below `md` where the sidebar is an overlay. */
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  const [masterDrive, setMasterDrive] = useState<MasterDrive>(
    DEFAULT_MASTER_DRIVE,
  );

  const {
    ensureContext,
    applyMasterDrive,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    trigger,
  } = useSampleBank();

  // The drive stage is persistent nodes rather than per-hit ones, so it is
  // pushed across on change instead of being read at trigger time.
  useEffect(() => {
    applyMasterDrive(masterDrive);
  }, [applyMasterDrive, masterDrive]);

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
      const soloActive = hasSoloedChannel(channelsRef.current);
      for (const channel of channelsRef.current) {
        if (!isChannelAudible(channel, soloActive)) continue;
        if (channel.steps[tick % clampLength(channel.length)]) {
          trigger(channel.id, time, triggerOptionsForChannel(channel));
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

  /** Flips one of the boolean routing flags on a single channel. */
  const toggleChannelFlag = useCallback(
    (channelId: string, key: "muted" | "soloed") => {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? { ...channel, [key]: !channel[key] }
            : channel,
        ),
      );
    },
    [],
  );

  const handleToggleMute = useCallback(
    (channelId: string) => toggleChannelFlag(channelId, "muted"),
    [toggleChannelFlag],
  );

  // Solo is additive: soloing a second channel leaves both playing, and
  // clearing the last solo brings every unmuted channel back.
  const handleToggleSolo = useCallback(
    (channelId: string) => toggleChannelFlag(channelId, "soloed"),
    [toggleChannelFlag],
  );

  /**
   * Auditions one channel outside the transport, so a sample can be checked
   * without starting playback. Mute and solo are deliberately ignored: this is
   * a direct request to hear that one channel, not a change to the mix.
   *
   * The context is created and resumed inside the click gesture, which is what
   * browsers require before any sound can come out.
   */
  const handlePreviewChannel = useCallback(
    (channelId: string) => {
      const context = ensureContext();
      if (context.state === "suspended") {
        void context.resume();
      }

      const channel = channelsRef.current.find((item) => item.id === channelId);
      if (!channel) return;

      trigger(channelId, context.currentTime, triggerOptionsForChannel(channel));
    },
    [ensureContext, trigger],
  );

  const handleSelectChannelIndex = useCallback((index: number) => {
    setSelectedChannelId(channelIdForIndex(index));
  }, []);

  useChannelShortcuts({
    channelCount: channels.length,
    onSelectChannelIndex: handleSelectChannelIndex,
  });

  const handleLowCutChange = useCallback(
    (channelId: string, hz: number) => {
      updateChannel(channelId, { lowCutHz: clampFrequency(hz) });
    },
    [updateChannel],
  );

  const handleHighCutChange = useCallback(
    (channelId: string, hz: number) => {
      updateChannel(channelId, { highCutHz: clampFrequency(hz) });
    },
    [updateChannel],
  );

  /**
   * Fills the leading channels with a kit: names and loading state are applied
   * up front in one pass, then each sample resolves independently so a single
   * missing file can't stall the rest of the kit. Step patterns are untouched.
   */
  const handleLoadPreset = useCallback(
    async (preset: Preset) => {
      // Create the audio context while still inside the click gesture.
      ensureContext();
      setLoadingPresetId(preset.id);

      const slots = preset.slots.slice(0, CHANNEL_COUNT);

      setChannels((prev) =>
        prev.map((channel, index) => {
          const slot = slots[index];
          if (!slot) return channel;
          return {
            ...channel,
            name: clampChannelName(slot.channelName),
            sample: { status: "loading", name: slot.file },
          };
        }),
      );

      await Promise.all(
        slots.map(async (slot, index) => {
          const channelId = channelIdForIndex(index);
          try {
            const buffer = await loadSampleFromUrl(
              channelId,
              presetSlotUrl(preset, slot),
            );
            updateChannel(channelId, {
              sample: {
                status: "loaded",
                name: slot.file,
                peaks: computePeaks(buffer),
                durationSeconds: buffer.duration,
              },
            });
          } catch (error) {
            console.error(`Failed to load preset sample ${slot.file}`, error);
            removeSample(channelId);
            updateChannel(channelId, {
              sample: {
                status: "error",
                message: "Couldn't load preset sample",
              },
            });
          }
        }),
      );

      setLoadingPresetId(null);
    },
    [ensureContext, loadSampleFromUrl, removeSample, updateChannel],
  );

  const canPlay = channels.some(
    (channel) => channel.sample.status === "loaded",
  );

  // Stopping always works; starting needs at least one loaded sample, matching
  // the transport button's own disabled rule.
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stop();
    } else if (canPlay) {
      play();
    }
  }, [canPlay, isPlaying, play, stop]);

  useTransportShortcuts({ onTogglePlay: handleTogglePlay });

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  // The playhead shown is the selected channel's own position in its cycle.
  const currentStep =
    currentTick === null
      ? null
      : currentTick % clampLength(selectedChannel.length);

  return (
    <div className="min-h-screen text-neutral-900 dark:text-neutral-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}>
        <Transport
          isPlaying={isPlaying}
          bpm={bpm}
          canPlay={canPlay}
          onTogglePlay={handleTogglePlay}
          onBpmChange={setBpm}
        />

        <MasterDriveControls drive={masterDrive} onChange={setMasterDrive} />
      </Sidebar>

      {/* Padding clears the fixed sidebar so the content centres beside it. */}
      <div className="md:pl-56">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
          <header className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Show controls"
              aria-expanded={isSidebarOpen}
              aria-controls={SIDEBAR_ID}
              className="rounded-md border border-neutral-300 p-1.5 md:hidden dark:border-neutral-700"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-4"
              >
                <path d="M7 4l6 6-6 6" />
              </svg>
            </button>

            <h1 className="text-lg font-semibold">Drum Machine</h1>
          </header>

          <PresetPicker
            presets={PRESETS}
            loadingPresetId={loadingPresetId}
            onLoadPreset={(preset) => void handleLoadPreset(preset)}
          />

          <ChannelGrid
            channels={channels}
            selectedChannelId={selectedChannel.id}
            onSelectChannel={setSelectedChannelId}
            onPreviewChannel={handlePreviewChannel}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
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
            onPitchChange={(pitch) =>
              handlePitchChange(selectedChannel.id, pitch)
            }
            onNameChange={(name) => handleNameChange(selectedChannel.id, name)}
            onLowCutChange={(hz) => handleLowCutChange(selectedChannel.id, hz)}
            onHighCutChange={(hz) =>
              handleHighCutChange(selectedChannel.id, hz)
            }
          />
        </div>
      </div>
    </div>
  );
}
