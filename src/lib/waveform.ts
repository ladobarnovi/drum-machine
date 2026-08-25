/** Buckets sampled across the whole file; the SVG stretches to any width. */
export const WAVEFORM_BUCKETS = 400;

/**
 * Downsamples a decoded buffer into per-bucket peak amplitudes in the range
 * 0..1, computed once at load time so rendering never rescans the audio.
 *
 * Values are peak-normalised: a quiet sample would otherwise be a flat line in
 * a strip this short, and the point of the display is the shape, not the gain.
 */
export function computePeaks(
  buffer: AudioBuffer,
  bucketCount: number = WAVEFORM_BUCKETS,
): number[] {
  const frameCount = buffer.length;
  if (frameCount === 0 || buffer.numberOfChannels === 0) return [];

  const channelData = Array.from(
    { length: buffer.numberOfChannels },
    (_, channel) => buffer.getChannelData(channel),
  );

  const framesPerBucket = Math.max(1, Math.floor(frameCount / bucketCount));
  const peaks: number[] = [];
  let loudestPeak = 0;

  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const start = bucket * framesPerBucket;
    if (start >= frameCount) break;
    const end = Math.min(start + framesPerBucket, frameCount);

    let peak = 0;
    for (const data of channelData) {
      for (let frame = start; frame < end; frame++) {
        const amplitude = Math.abs(data[frame]);
        if (amplitude > peak) peak = amplitude;
      }
    }

    peaks.push(peak);
    if (peak > loudestPeak) loudestPeak = peak;
  }

  if (loudestPeak > 0) {
    for (let index = 0; index < peaks.length; index++) {
      peaks[index] /= loudestPeak;
    }
  }

  return peaks;
}

/**
 * A fraction of the file as a fraction of the strip, and back again — the same
 * flip either way, which is why one function does both directions.
 *
 * Reversing turns the picture round without touching the trim: `start` and
 * `end` go on meaning the same two points of the file they always did, and the
 * same audio goes on playing. It is only where those points *are shown* that
 * moves, and everything drawn on the strip goes through here so that the shape,
 * the handles and the line following the hit can never be mirrored
 * independently of one another.
 */
export function onStrip(fraction: number, reversed: boolean): number {
  return reversed ? 1 - fraction : fraction;
}
