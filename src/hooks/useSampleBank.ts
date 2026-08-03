"use client";

import { useCallback, useEffect, useRef } from "react";

type TriggerOptions = {
  /** Linear gain for this hit. */
  gain?: number;
  /** Playback rate multiplier; also changes pitch. */
  playbackRate?: number;
};

/**
 * Owns the AudioContext and the decoded AudioBuffer for each channel.
 *
 * Buffers live in a ref rather than state: they are large binary objects that
 * nothing renders directly, so storing them would only cause needless renders.
 * Components decide what to display from the channel's `SampleState` instead.
 */
export function useSampleBank() {
  const contextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef(new Map<string, AudioBuffer>());

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
    };
  }, []);

  /**
   * Creates the AudioContext on first use. Only ever called from a user
   * gesture (file pick or Play), which is what browsers require.
   */
  const ensureContext = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    return contextRef.current;
  }, []);

  /**
   * Decodes `file` for `channelId` and returns the buffer so the caller can
   * derive display data from it. Throws if the file isn't decodable audio.
   */
  const loadSample = useCallback(
    async (channelId: string, file: File): Promise<AudioBuffer> => {
      const context = ensureContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      buffersRef.current.set(channelId, audioBuffer);
      return audioBuffer;
    },
    [ensureContext],
  );

  const removeSample = useCallback((channelId: string) => {
    buffersRef.current.delete(channelId);
  }, []);

  /** Schedules the channel's sample to play at `time` on the audio clock. */
  const trigger = useCallback(
    (
      channelId: string,
      time: number,
      { gain = 1, playbackRate = 1 }: TriggerOptions = {},
    ) => {
      const context = contextRef.current;
      const buffer = buffersRef.current.get(channelId);
      if (!context || !buffer) return;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      // A gain node per hit, so changing volume never retunes a playing note.
      const gainNode = context.createGain();
      gainNode.gain.value = gain;

      source.connect(gainNode);
      gainNode.connect(context.destination);
      source.start(time);
    },
    [],
  );

  return { ensureContext, loadSample, removeSample, trigger };
}
