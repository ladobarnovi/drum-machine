"use client";

import { useCallback, useEffect, useRef } from "react";

import { SYSTEM_DEFAULT_SINK_ID, setContextSink } from "@/lib/audioOutput";
import {
  CENTS_PER_OCTAVE,
  CENTS_PER_SEMITONE,
  CHOKE_FADE_SECONDS,
  type ChannelLfoNodes,
  type ChannelMeter,
  DECAY_FLOOR,
  METER_FFT_SIZE,
  type MasterChain,
  type Playhead,
  REVERB_IMPULSE_SETTLE_MS,
  type TriggerOptions,
  type Voice,
  appendCutFilter,
  applyCompressor,
  applyDelay,
  applyDrive,
  applyFilter,
  applyPhaser,
  applyReverb,
  applyReverbImpulse,
  applyVolume,
  createLfoSource,
  createMasterChain,
  createRandomLfoTable,
  ensureChannelLfo,
  meterForChannel,
  releaseChannelLfo,
  reverseBuffer,
  startLfoSource,
} from "@/lib/audioGraph";
import {
  DEFAULT_BPM,
  DEFAULT_FILTER_SLOPE,
  DEFAULT_MASTER_COMPRESSOR,
  DEFAULT_MASTER_DELAY,
  DEFAULT_MASTER_DRIVE,
  DEFAULT_MASTER_FILTER,
  DEFAULT_MASTER_PHASER,
  DEFAULT_MASTER_REVERB,
  DEFAULT_MASTER_VOLUME,
  DEFAULT_SAMPLE_END,
  DEFAULT_SAMPLE_REVERSED,
  DEFAULT_SAMPLE_START,
  FLAT_FILTER_Q_DB,
  LFO_FILTER_RANGE_OCTAVES,
  LFO_PITCH_RANGE_SEMITONES,
  type MasterCompressor,
  type MasterDelay,
  type MasterDrive,
  type MasterFilter,
  type MasterPhaser,
  type MasterReverb,
  clampLfoAmount,
  clampSampleEnd,
  clampSampleStart,
  clampSend,
  isSampleTrimmed,
} from "@/lib/sequencer";

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
  // The back-to-front copy of every sample a channel is playing reversed, built
  // on first use. Keyed by the forward buffer rather than by channel id, so two
  // channels pointed at one sample — a pasted copy — share the one reversal,
  // and a buffer that has been replaced takes its copy with it when it goes.
  const reversedBuffersRef = useRef(new WeakMap<AudioBuffer, AudioBuffer>());
  const masterRef = useRef<MasterChain | null>(null);
  // Holds the latest settings even before there is a context to apply them to,
  // so a knob moved before the first gesture isn't lost.
  const driveRef = useRef<MasterDrive>(DEFAULT_MASTER_DRIVE);
  const filterRef = useRef<MasterFilter>(DEFAULT_MASTER_FILTER);
  const delayRef = useRef<MasterDelay>(DEFAULT_MASTER_DELAY);
  // Held alongside the delay so a synced time can still be resolved when the
  // chain is built, which happens long after the tempo was last set.
  const delayBpmRef = useRef(DEFAULT_BPM);
  const reverbRef = useRef<MasterReverb>(DEFAULT_MASTER_REVERB);
  /** Pending tail rebuild, held so a knob still moving can push it back. */
  const impulseTimeoutRef = useRef<number | null>(null);
  const phaserRef = useRef<MasterPhaser>(DEFAULT_MASTER_PHASER);
  const compressorRef = useRef<MasterCompressor>(DEFAULT_MASTER_COMPRESSOR);
  // The scope's read buffer, built on first use and then reused every frame.
  const waveformRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  // The meter tap of every channel that has been heard, by channel id.
  const channelMetersRef = useRef(new Map<string, ChannelMeter>());
  // The meters' read buffer. One for all sixteen rather than one each: they are
  // read one after another inside a single frame and the peak is taken before
  // the next read overwrites it, so there is never more than one in use.
  const meterSamplesRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const volumeRef = useRef(DEFAULT_MASTER_VOLUME);
  // Which device the context plays out of, held here for the same reason as the
  // stages above: it can be chosen before the first gesture builds the context.
  const sinkIdRef = useRef(SYSTEM_DEFAULT_SINK_ID);
  // The sample-and-hold table, built on first use and then shared by every
  // voice: it runs to a few hundred kilobytes, and a fresh one per hit would
  // allocate that on every step of every channel using a random LFO.
  const randomLfoRef = useRef<AudioBuffer | null>(null);
  // The continuous LFO of every channel currently running one, by channel id.
  const channelLfosRef = useRef(new Map<string, ChannelLfoNodes>());
  // The sounding voices of every channel something chokes, by channel id. Each
  // voice removes itself as it ends, so this only ever holds what is still
  // audible and there is nothing to sweep up.
  const voicesRef = useRef(new Map<string, Set<Voice>>());
  // Every hit currently scheduled or sounding, by channel id. Kept the same way
  // the voices above are — each one drops itself as it ends — so a channel
  // nobody is looking at costs an insert and a delete per hit and nothing more.
  const playheadsRef = useRef(new Map<string, Set<Playhead>>());

  useEffect(() => {
    return () => {
      if (impulseTimeoutRef.current !== null) {
        window.clearTimeout(impulseTimeoutRef.current);
      }
      void contextRef.current?.close();
    };
  }, []);

  /**
   * Creates the AudioContext and the master chain on first use. Only ever
   * called from a user gesture (file pick or Play), which is what browsers
   * require.
   */
  const ensureContext = useCallback(() => {
    let context = contextRef.current;

    if (!context) {
      context = new AudioContext();
      contextRef.current = context;

      // Before the chain, so a device chosen in an earlier session is already
      // in force by the time the first hit reaches the end of it. Skipped
      // entirely at the default, where a fresh context is pointed already —
      // there is nothing to route, and nothing gained by asking.
      if (sinkIdRef.current !== SYSTEM_DEFAULT_SINK_ID) {
        void setContextSink(context, sinkIdRef.current);
      }

      const chain = createMasterChain(context);
      masterRef.current = chain;
      applyDrive(context, chain, driveRef.current);
      applyFilter(context, chain, filterRef.current);
      applyDelay(context, chain, delayRef.current, delayBpmRef.current);
      applyReverb(context, chain, reverbRef.current);
      applyReverbImpulse(context, chain, reverbRef.current);
      applyPhaser(context, chain, phaserRef.current);
      applyCompressor(context, chain, compressorRef.current);
      applyVolume(context, chain, volumeRef.current);
    }

    return context;
  }, []);

  /**
   * Points the machine at an output device, creating no context of its own —
   * an empty id hands it back to whatever the system is using.
   */
  const applyAudioOutput = useCallback((sinkId: string) => {
    sinkIdRef.current = sinkId;

    const context = contextRef.current;
    // Nothing to route yet; `ensureContext` applies this when it builds one.
    if (!context) return;

    void setContextSink(context, sinkId);
  }, []);

  /** Points the master drive stage at `drive`, creating no context of its own. */
  const applyMasterDrive = useCallback((drive: MasterDrive) => {
    driveRef.current = drive;

    const context = contextRef.current;
    const chain = masterRef.current;
    // Nothing to update yet; `ensureContext` applies this when it builds the chain.
    if (!context || !chain) return;

    applyDrive(context, chain, drive);
  }, []);

  /** Points the master filter stage at `filter`, creating no context of its own. */
  const applyMasterFilter = useCallback((filter: MasterFilter) => {
    filterRef.current = filter;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyFilter(context, chain, filter);
  }, []);

  /** Points the delay bus at `delay`, creating no context of its own. */
  const applyMasterDelay = useCallback((delay: MasterDelay, bpm: number) => {
    delayRef.current = delay;
    delayBpmRef.current = bpm;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyDelay(context, chain, delay, bpm);
  }, []);

  /** Points the reverb bus at `reverb`, creating no context of its own. */
  const applyMasterReverb = useCallback((reverb: MasterReverb) => {
    reverbRef.current = reverb;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    // Levels and tone are three ramps, so they follow the knob exactly.
    applyReverb(context, chain, reverb);

    // The tail is not: rebuilding it is the expensive half, and a decay slider
    // being dragged emits a value every step of the way. Waiting for the knob
    // to settle turns a sweep into one rebuild instead of one per step, and
    // stops the tail being cut over and over on the way there.
    if (impulseTimeoutRef.current !== null) {
      window.clearTimeout(impulseTimeoutRef.current);
    }
    impulseTimeoutRef.current = window.setTimeout(() => {
      impulseTimeoutRef.current = null;

      // Re-read rather than closing over `reverb`: by the time this runs the
      // knob may have moved again, and the latest value is the one that counts.
      const settledContext = contextRef.current;
      const settledChain = masterRef.current;
      if (!settledContext || !settledChain) return;

      applyReverbImpulse(settledContext, settledChain, reverbRef.current);
    }, REVERB_IMPULSE_SETTLE_MS);
  }, []);

  /** Points the phaser bus at `phaser`, creating no context of its own. */
  const applyMasterPhaser = useCallback((phaser: MasterPhaser) => {
    phaserRef.current = phaser;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyPhaser(context, chain, phaser);
  }, []);

  /** Points the compressor at `compressor`, creating no context of its own. */
  const applyMasterCompressor = useCallback((compressor: MasterCompressor) => {
    compressorRef.current = compressor;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyCompressor(context, chain, compressor);
  }, []);

  /**
   * How much the compressor is pulling the mix down right now, in dB — zero or
   * negative, and zero before there is a context to ask.
   *
   * A getter rather than state: this is read once a frame by the meter, and
   * putting it through React would re-render the whole rail sixty times a
   * second to move one bar.
   */
  const getGainReduction = useCallback(() => {
    return masterRef.current?.compressor.reduction ?? 0;
  }, []);

  /**
   * The last window of samples leaving the machine, as bytes about a midpoint
   * of 128, or null before there is a context to ask.
   *
   * The buffer is owned here and handed back rather than filled for the caller,
   * so the scope neither has to know how many samples it is about to be given
   * nor allocate a couple of kilobytes on every frame it draws.
   */
  const getWaveform = useCallback(() => {
    const chain = masterRef.current;
    if (!chain) return null;

    const samples = (waveformRef.current ??= new Uint8Array(
      chain.analyser.fftSize,
    ));
    chain.analyser.getByteTimeDomainData(samples);
    return samples;
  }, []);

  /**
   * The loudest sample a channel has put out in the last window, as a linear
   * amplitude — 0 for a channel that has never been heard, and above 1 for one
   * whose fader is pushing it past full scale.
   *
   * A peak rather than an average: the whole of a drum hit is its transient, and
   * an RMS over a window this short would read a kick and a shaker as far closer
   * together than they sound.
   *
   * A getter rather than state, for the same reason the two master meters are:
   * this is read sixteen times a frame, and no part of it belongs in a render.
   */
  const getChannelLevel = useCallback((channelId: string) => {
    const meter = channelMetersRef.current.get(channelId);
    if (!meter) return 0;

    const samples = (meterSamplesRef.current ??= new Float32Array(
      METER_FFT_SIZE,
    ));

    let peak = 0;
    for (const side of meter.sides) {
      side.getFloatTimeDomainData(samples);
      for (let index = 0; index < samples.length; index += 1) {
        const magnitude = Math.abs(samples[index]);
        if (magnitude > peak) peak = magnitude;
      }
    }
    return peak;
  }, []);

  /** Points the output fader at `volume`, creating no context of its own. */
  const applyMasterVolume = useCallback((volume: number) => {
    volumeRef.current = volume;

    const context = contextRef.current;
    const chain = masterRef.current;
    if (!context || !chain) return;

    applyVolume(context, chain, volume);
  }, []);

  /**
   * Decodes raw audio bytes into `channelId`'s slot and returns the buffer, so
   * callers can derive display data from it. Throws if the bytes aren't audio.
   */
  const decodeInto = useCallback(
    async (channelId: string, data: ArrayBuffer): Promise<AudioBuffer> => {
      const context = ensureContext();
      const audioBuffer = await context.decodeAudioData(data);
      buffersRef.current.set(channelId, audioBuffer);
      return audioBuffer;
    },
    [ensureContext],
  );

  /** Loads a user-picked file. */
  const loadSample = useCallback(
    async (channelId: string, file: File): Promise<AudioBuffer> =>
      decodeInto(channelId, await file.arrayBuffer()),
    [decodeInto],
  );

  /** Loads a bundled sample, e.g. a preset kit under `public/`. */
  const loadSampleFromUrl = useCallback(
    async (channelId: string, url: string): Promise<AudioBuffer> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      return decodeInto(channelId, await response.arrayBuffer());
    },
    [decodeInto],
  );

  const removeSample = useCallback((channelId: string) => {
    buffersRef.current.delete(channelId);
  }, []);

  /**
   * Builds the back-to-front copy of a channel's sample ahead of time.
   *
   * `trigger` falls back to doing this on the first reversed hit, but that hit
   * is scheduled from inside the lookahead pump with about a tenth of a second
   * to spare, and a pass over every frame of a long sample will not fit — the
   * step lands late, or not at all. Called when a channel is *put* into reverse
   * instead, which is off the audio path entirely.
   *
   * A no-op once the copy exists, so it is safe to call as often as it is
   * convenient to.
   */
  const prewarmReversed = useCallback((channelId: string) => {
    const context = contextRef.current;
    const forward = buffersRef.current.get(channelId);
    if (!context || !forward) return;

    const cache = reversedBuffersRef.current;
    if (cache.has(forward)) return;

    cache.set(forward, reverseBuffer(context, forward));
  }, []);

  /** The decoded buffer behind a channel's sample, e.g. to hand off to a copy. */
  const getSampleBuffer = useCallback(
    (channelId: string) => buffersRef.current.get(channelId),
    [],
  );

  /**
   * Points `channelId` at an already-decoded buffer, e.g. pasting a copied
   * sample. Safe to share one `AudioBuffer` across channels — it is only ever
   * read from during playback, never written to.
   */
  const setSampleBuffer = useCallback(
    (channelId: string, buffer: AudioBuffer) => {
      buffersRef.current.set(channelId, buffer);
    },
    [],
  );

  /** Schedules the channel's sample to play at `time` on the audio clock. */
  const trigger = useCallback(
    (
      channelId: string,
      time: number,
      {
        gain = 1,
        pan,
        playbackRate = 1,
        lowCutHz,
        lowCutQDb = FLAT_FILTER_Q_DB,
        highCutHz,
        highCutQDb = FLAT_FILTER_Q_DB,
        filterSlope = DEFAULT_FILTER_SLOPE,
        attackSeconds,
        decaySeconds,
        sustainLevel,
        releaseSeconds,
        delaySend,
        reverbSend,
        phaserSend,
        chokeable = false,
        sampleStart = DEFAULT_SAMPLE_START,
        sampleEnd = DEFAULT_SAMPLE_END,
        sampleReversed = DEFAULT_SAMPLE_REVERSED,
        lfo,
      }: TriggerOptions = {},
    ) => {
      const context = contextRef.current;
      const master = masterRef.current;
      const forward = buffersRef.current.get(channelId);
      if (!context || !master || !forward) return;

      // Reversed on the first hit that asks for it, and kept: the pass over the
      // frames is far too much to do while a step is being scheduled, and a
      // channel left reversed would pay it again on every hit.
      let buffer = forward;
      if (sampleReversed) {
        const cache = reversedBuffersRef.current;
        buffer = cache.get(forward) ?? reverseBuffer(context, forward);
        cache.set(forward, buffer);
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      // Fresh nodes per hit, so a knob move never retunes an already-playing note.
      let tail: AudioNode = source;

      // Everything the voice has to let go of when it ends, run as one handler:
      // `onended` is a single slot and more than one thing can need cleaning up.
      const onEnded: Array<() => void> = [];

      // A choked channel's voices run through a gain node of their own, which is
      // where the fade before the cut is written. It cannot ride `gainNode`
      // below: a volume LFO is summed into that param, so pulling its base value
      // down would leave the modulation still swinging above silence. First in
      // the chain, so the cut takes the sends and the envelope with it.
      let fade: GainNode | null = null;

      if (chokeable) {
        fade = context.createGain();
        tail.connect(fade);
        tail = fade;
      }

      // Held rather than folded into `tail`, since an LFO aimed at a cut needs
      // that cut's own sections back to modulate them. Arrays rather than one
      // node each: past 12 dB/oct a cut is more than one section, and a sweep
      // has to move all of them together or the slope would bend as it went.
      let highpassSections: BiquadFilterNode[] = [];
      let lowpassSections: BiquadFilterNode[] = [];

      if (lowCutHz !== undefined) {
        const cut = appendCutFilter(
          context,
          tail,
          "highpass",
          lowCutHz,
          lowCutQDb,
          filterSlope,
        );
        tail = cut.output;
        highpassSections = cut.sections;
      }

      if (highCutHz !== undefined) {
        const cut = appendCutFilter(
          context,
          tail,
          "lowpass",
          highCutHz,
          highCutQDb,
          filterSlope,
        );
        tail = cut.output;
        lowpassSections = cut.sections;
      }

      // When the decay ends. Held until after `source.start` below, because a
      // source that has not been started yet rejects `stop` outright.
      let releaseTime: number | null = null;

      // The envelope rides its own node rather than shaping the volume gain, so
      // its curve stays a plain 0..1 shape. Scaling it by the channel volume
      // would leave a silenced channel with a decay ramp running from zero,
      // which an exponential curve can't express.
      if (attackSeconds !== undefined || decaySeconds !== undefined) {
        const attack = attackSeconds ?? 0;
        const envelope = context.createGain();
        const level = envelope.gain;

        // Voices are scheduled ahead of the audio clock, so the envelope is
        // pinned to the hit's own start time rather than to `currentTime`.
        level.setValueAtTime(attack > 0 ? 0 : 1, time);
        if (attack > 0) {
          level.linearRampToValueAtTime(1, time + attack);
        }

        if (decaySeconds !== undefined) {
          const decayEnd = time + attack + decaySeconds;

          if (sustainLevel === undefined) {
            // No plateau to fall to, so decay runs straight down to silence —
            // the same floor-then-hard-zero shape it always has. An
            // exponential ramp can never reach zero on its own, hence the
            // floor; the hard zero is what actually gets there.
            level.exponentialRampToValueAtTime(DECAY_FLOOR, decayEnd);
            level.setValueAtTime(0, decayEnd);
            releaseTime = decayEnd;
          } else {
            level.exponentialRampToValueAtTime(sustainLevel, decayEnd);

            if (releaseSeconds !== undefined) {
              const releaseEnd = decayEnd + releaseSeconds;
              // Anchors the plateau explicitly before falling away from it,
              // so the automation queue has a value to ramp from rather than
              // whatever an unrelated hit's release left the param sitting at.
              level.setValueAtTime(sustainLevel, decayEnd);
              level.exponentialRampToValueAtTime(DECAY_FLOOR, releaseEnd);
              level.setValueAtTime(0, releaseEnd);
              releaseTime = releaseEnd;
            }
            // No release: the envelope holds at the sustain level and the
            // voice rings out with the buffer, same as a hit with no decay
            // at all — `releaseTime` stays null and nothing stops it early.
          }
        }

        tail.connect(envelope);
        tail = envelope;
      }

      // Upstream of the volume node, so the sends tapped off it below are panned
      // with the channel: a tom hard right should reach the delay from the right
      // as well, rather than being placed in the dry mix and then quietly
      // recentred by its own repeats.
      //
      // Set rather than ramped, unlike the master params: this is a fresh node
      // built for one hit and nothing is sounding through it yet, so there is no
      // value to move away from and nothing to click.
      if (pan !== undefined) {
        const panner = context.createStereoPanner();
        panner.pan.value = pan;
        tail.connect(panner);
        tail = panner;
      }

      // A volume LFO is written into the voice's own gain rather than given a
      // node of its own: an AudioParam sums its base value with whatever is
      // connected to it, so offsetting the base down by half the depth here is
      // what lets the swing come back up to the channel's level at its peak
      // instead of pushing past it, and down to silence at full depth.
      const tremolo =
        lfo?.destination === "volume" ? clampLfoAmount(lfo.amount) / 2 : 0;

      const gainNode = context.createGain();
      gainNode.gain.value = gain * (1 - tremolo);

      tail.connect(gainNode);
      // Into the master bus rather than the destination, so every voice is
      // summed before the drive stage sees it.
      gainNode.connect(master.input);

      // And into the channel's own meter, off the same node the sends are taken
      // from: post-fader and post-envelope, so the bar reads what the channel is
      // actually putting into the mix rather than what is in its sample slot.
      //
      // Pre-send, though, which is the one thing it cannot show — a channel
      // drowning the mix in reverb still reads as whatever its dry level is.
      // Metering the returns instead would be metering the bus, which belongs to
      // every channel at once and so to none of these bars.
      gainNode.connect(
        meterForChannel(context, channelMetersRef.current, channelId).splitter,
      );

      // Sends are tapped off the volume node rather than off the raw source, so
      // they are post-fader: they carry the channel's envelope and filters, and
      // pulling a channel down takes its share of the delay and reverb with it.
      if (delaySend !== undefined) {
        const send = context.createGain();
        send.gain.value = clampSend(delaySend);
        gainNode.connect(send);
        send.connect(master.delayBus);
      }

      if (reverbSend !== undefined) {
        const send = context.createGain();
        send.gain.value = clampSend(reverbSend);
        gainNode.connect(send);
        send.connect(master.reverbBus);
      }

      if (phaserSend !== undefined) {
        const send = context.createGain();
        send.gain.value = clampSend(phaserSend);
        gainNode.connect(send);
        send.connect(master.phaserBus);
      }

      // A channel keeps a continuous LFO only while something is tapping it, so
      // switching the section off — or back to retriggering — releases it, and
      // the phase starts fresh whenever free mode is next asked for.
      if (!lfo || lfo.retrigger) {
        releaseChannelLfo(channelLfosRef.current, channelId);
      }

      if (lfo) {
        const amount = clampLfoAmount(lfo.amount);
        const randomTable = () =>
          (randomLfoRef.current ??= createRandomLfoTable(context));

        // The LFO swings ±1; this scales that into the destination's own unit.
        const depth = context.createGain();

        if (lfo.retrigger) {
          // An LFO of this voice's own, started with it, so every hit sweeps
          // the same way rather than catching a continuous one wherever it had
          // drifted to by the time the step came round.
          const modulator = createLfoSource(context, lfo, randomTable);
          modulator.connect(depth);
          startLfoSource(modulator, time);

          // Nothing stops an oscillator on its own, and one left running holds
          // every node it feeds alive with it. The voice's own end — the decay
          // below, or the buffer simply running out — is the moment there is no
          // longer anything to modulate.
          onEnded.push(() => modulator.stop());
        } else {
          const channelLfo = ensureChannelLfo(
            context,
            channelLfosRef.current,
            channelId,
            lfo,
            randomTable,
          );
          channelLfo.output.connect(depth);

          // The tap has to come back out when the voice ends. The LFO outlives
          // the voice, so a connection left in place would keep that voice —
          // and everything downstream of it — alive and processing for good.
          onEnded.push(() => {
            channelLfo.output.disconnect(depth);
            depth.disconnect();
          });
        }

        switch (lfo.destination) {
          case "pitch":
            // Into `detune` rather than `playbackRate`, which is a ratio: an
            // equal swing in cents is an equal interval either way, where an
            // equal swing in rate would bend further up than down.
            depth.gain.value =
              amount * LFO_PITCH_RANGE_SEMITONES * CENTS_PER_SEMITONE;
            depth.connect(source.detune);
            break;

          case "volume":
            depth.gain.value = gain * tremolo;
            depth.connect(gainNode.gain);
            break;

          // The filter this rides always exists: `triggerOptionsForChannel`
          // builds the cut an LFO is pointed at even where it would otherwise
          // be bypassed. The empty case is for callers passing their own
          // options — and every section of the cut is swept, so the sections
          // stay stacked on one corner rather than sliding apart.
          case "lowCut":
            depth.gain.value =
              amount * LFO_FILTER_RANGE_OCTAVES * CENTS_PER_OCTAVE;
            for (const section of highpassSections) {
              depth.connect(section.detune);
            }
            break;

          case "highCut":
            depth.gain.value =
              amount * LFO_FILTER_RANGE_OCTAVES * CENTS_PER_OCTAVE;
            for (const section of lowpassSections) {
              depth.connect(section.detune);
            }
            break;
        }
      }

      // Registered before it starts, so a choke scheduled for this same instant
      // can already see it and decide — by its start time — to leave it alone.
      if (fade) {
        const voice: Voice = {
          source,
          fade,
          startTime: time,
          releaseTime,
          choked: false,
        };

        const voices = voicesRef.current;
        const sounding = voices.get(channelId);
        if (sounding) {
          sounding.add(voice);
        } else {
          voices.set(channelId, new Set([voice]));
        }

        onEnded.push(() => {
          const live = voices.get(channelId);
          live?.delete(voice);
          // The channel's set goes with its last voice, so a kit that stops
          // playing leaves nothing behind here.
          if (live?.size === 0) voices.delete(channelId);
        });
      }

      // Where the two handles are, which is the region the hit plays and also
      // the ends of the walk the line below makes across it.
      const start = clampSampleStart(sampleStart, sampleEnd);
      const end = clampSampleEnd(sampleEnd, sampleStart);

      // The walk itself, in the file's own fractions — the far handle back to
      // the near one when the sample is reversed, which is what the ear hears
      // and so what the line has to show. Leaving it in file terms is what lets
      // the strip mirror it the same way it mirrors the handles and the shape,
      // rather than the two arriving at the picture by different routes.
      const playhead: Playhead = {
        startTime: time,
        fromFraction: sampleReversed ? end : start,
        toFraction: sampleReversed ? start : end,
        fractionsPerSecond:
          ((sampleReversed ? -1 : 1) * playbackRate) / buffer.duration,
      };

      const playheads = playheadsRef.current;
      const walking = playheads.get(channelId);
      if (walking) {
        walking.add(playhead);
      } else {
        playheads.set(channelId, new Set([playhead]));
      }

      onEnded.push(() => {
        const live = playheads.get(channelId);
        live?.delete(playhead);
        if (live?.size === 0) playheads.delete(channelId);
      });

      source.onended = () => {
        for (const cleanUp of onEnded) cleanUp();
      };

      // Trimming is done by the source itself rather than by scheduling a stop:
      // the offset and the duration are read in the buffer's own frames, so the
      // region holds its place whatever the playback rate is — a hit tuned down
      // an octave plays the same slice of the file, twice as slowly, exactly as
      // a hardware sampler does. A stop scheduled in wall-clock seconds could
      // not follow that, and a pitch LFO moves the rate while the hit sounds.
      if (isSampleTrimmed(sampleStart, sampleEnd)) {
        // The handles are fractions of the file as it was loaded, so against a
        // reversed buffer they have to be mirrored: what was the last third of
        // the file is the first third of the copy. The span is the same either
        // way — the same slice of audio, read the other way round.
        source.start(
          time,
          (sampleReversed ? 1 - end : start) * buffer.duration,
          (end - start) * buffer.duration,
        );
      } else {
        source.start(time);
      }

      // Past the decay there is nothing left to hear, so the voice is released
      // rather than left running silently until the buffer ends.
      if (releaseTime !== null) {
        source.stop(releaseTime);
      }
    },
    [],
  );

  /**
   * How far into its file `channelId` is being heard right now, as a fraction of
   * the whole file, or null when the channel is silent.
   *
   * Pulled once a frame by the waveform rather than pushed at it, the same way
   * the meters are read: a figure that moves with the audio clock cannot go
   * through React state without re-rendering the machine sixty times a second.
   */
  const getSamplePosition = useCallback((channelId: string) => {
    const context = contextRef.current;
    const walking = playheadsRef.current.get(channelId);
    if (!context || !walking) return null;

    const now = context.currentTime;

    // Hits are scheduled ahead of the clock, so the ones that have not landed
    // yet are not being heard and have no line. Of those that have, the newest
    // is the one showing: a retrigger takes the line off whatever it interrupts,
    // which is the hit the ear now follows.
    let latest: Playhead | null = null;
    for (const playhead of walking) {
      if (playhead.startTime > now) continue;
      if (!latest || playhead.startTime >= latest.startTime) latest = playhead;
    }
    if (!latest) return null;

    const position =
      latest.fromFraction +
      (now - latest.startTime) * latest.fractionsPerSecond;

    // A hit is only dropped from the map when `onended` reaches the main thread,
    // which is a moment after the audio actually stopped — long enough for the
    // line to be seen walking off the end of the region it was given.
    return latest.fractionsPerSecond < 0
      ? Math.max(position, latest.toFraction)
      : Math.min(position, latest.toFraction);
  }, []);

  /**
   * Cuts short whatever `channelIds` are still sounding, at `time` on the audio
   * clock — an open hat taken away by the pedal, which is what a choke is for.
   *
   * Voices that start at `time` or later are left alone. That is what lets a
   * channel and the channel that chokes it land on the same step: the hit being
   * scheduled for that instant survives, and only what was already ringing goes.
   */
  const choke = useCallback((channelIds: string[], time: number) => {
    // Nothing can be sounding before there is a context, so there is nothing to
    // cut and nothing to remember either.
    if (!contextRef.current) return;

    for (const channelId of channelIds) {
      const sounding = voicesRef.current.get(channelId);
      if (!sounding) continue;

      for (const voice of sounding) {
        if (voice.choked || voice.startTime >= time) continue;
        voice.choked = true;

        // The fade node's gain is untouched otherwise, so unity is what it is
        // holding when the ramp starts and there is nothing to anchor against.
        const cutAt = time + CHOKE_FADE_SECONDS;
        voice.fade.gain.setValueAtTime(1, time);
        voice.fade.gain.linearRampToValueAtTime(0, cutAt);

        // Never later than the voice was already going to end, so a choke can
        // only ever shorten a hit — a short decay still finishes when it would.
        voice.source.stop(Math.min(cutAt, voice.releaseTime ?? cutAt));
      }
    }
  }, []);

  return {
    ensureContext,
    applyAudioOutput,
    applyMasterDrive,
    applyMasterFilter,
    applyMasterDelay,
    applyMasterReverb,
    applyMasterPhaser,
    applyMasterCompressor,
    getGainReduction,
    getWaveform,
    getChannelLevel,
    applyMasterVolume,
    loadSample,
    loadSampleFromUrl,
    removeSample,
    getSampleBuffer,
    setSampleBuffer,
    trigger,
    getSamplePosition,
    prewarmReversed,
    choke,
  };
}
