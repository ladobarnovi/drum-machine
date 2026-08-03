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
