# Drum Machine

A browser-based drum machine with Web Audio synthesis, pattern sequencing, and real-time effects processing.

## Architecture

- **Next.js 16** app (see @AGENTS.md for breaking changes)
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Web Audio API** for synthesis and effects
- **Local storage** for patterns, presets, and bank management

## Project Structure

```
src/
├── app/              - Next.js pages, layout, manifests
├── components/       - React components organized by feature
│   ├── channel/      - Individual channel UI (samples, envelope, filter, FX, LFO)
│   ├── master/       - Master controls (volume, drive, effects, compression)
│   ├── patterns/     - Pattern bank and slot management
│   ├── transport/    - Play/stop controls
│   ├── shell/        - App shell, sidebar, settings dialog (MIDI, sound, theme)
│   └── ui/           - Reusable UI components (sliders, knobs, tabs, menus)
├── hooks/            - Custom React hooks
│   ├── useSequencer  - Main sequencer state and playback logic
│   ├── useChannel*   - Channel-specific hooks (shortcuts, meters, flash)
│   ├── useSampleBank - Sample management
│   └── useBanks      - Pattern bank management
└── lib/              - Utilities and business logic
    ├── sequencer.ts  - Core sequencer engine
    ├── waveform.ts   - Sample waveform utilities
    ├── presets.ts    - Preset/snapshot management
    ├── patternShare.ts - Beat links: wire format, encode/decode, URL hash
    ├── themes.ts     - Theme definitions
    ├── shortcuts.ts  - Keyboard shortcut definitions
    └── *Response.ts  - Audio response curves (filter, envelope, FX, LFO)
```

## Tech Stack

- **React 19** with Server Components
- **TypeScript 5** for type safety
- **Tailwind CSS 4** with PostCSS
- **ESLint 9** + Prettier for code formatting
- **Web Audio API** native (no external audio libraries)

## Key Features

### Channels

- Sample playback with pitch control
- ADSR envelope
- Resonant filter (cutoff + resonance)
- Effects (distortion, bit crusher)
- LFO modulation

### Patterns & Banks

- Save/load patterns in named banks
- Multiple slot management
- Persistent storage via localStorage

### Sharing

- "Copy link" packs the live machine into a URL fragment (`#p=…`)
- Carries steps, mix, per-channel sample edits, kit, tempo, swing, and all six
  master FX stages (drive, filter, compressor, delay, reverb, phaser)
- **Not** the output fader: how loud a beat arrives is the listener's business
- Deflated and base64url-encoded; a full kit with effects fits in ~380 characters
- Opening a link replaces the whole machine — unmentioned channels are emptied
  and the effects rail is set from the link, so a beat can't be heard through a
  stranger's reverb
- Uploaded samples cannot travel — those slots arrive empty, steps intact
- A shared beat is a **superset of `Pattern`**: patterns deliberately omit the
  kit (see `lib/patterns.ts`), which a link cannot assume the recipient has

Wire format is versioned (`v`). Version 2 added the master stages; version 1
links still open, and decode to the six stages at their defaults (all bypassed).
Bump `FORMAT_VERSION` when adding fields, and keep the decoder tolerant of
older ones — every value arriving from a link goes through the `clamp*` that
owns it, since a URL is a string someone else wrote.

### Transport

- Play/stop with playback position
- Tempo control
- Pattern length adjustment

### Master FX

- Reverb
- Phaser
- Delay
- Compressor with gain reduction meter

### Shortcuts

- Keyboard bindings for transport, channels, and master controls
- See `src/lib/shortcuts.ts` for definitions

## UI Conventions

- **Discrete channel settings** use `<select>` dropdowns with label on top, not segmented buttons
- **Control groups** organized in collapsible sections per feature (envelope, filter, FX, etc.)
- **Tabs** for sample editor, patterns, and effects
- **Context menus** for pattern/channel operations
- **Responsive design** with mobile nav footer

## Development

### Setup

```bash
npm install
npm run dev          # Start dev server at http://localhost:3000
```

### Build & Deploy

```bash
npm run build        # Production build
npm run start        # Start production server
npm run serve        # Serve static export
npm run icons        # Generate app icons
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run format:check # Check formatting
```

### Service Worker

- PWA support via Service Worker (`scripts/build-service-worker.mjs`)
- Runs after build in postbuild script
- Enables offline functionality

## Important Patterns

- **Hooks manage state** (sequencer, samples, patterns, shortcuts)
- **Components are presentational** (styling + event handlers)
- **Audio logic isolated** in `lib/sequencer.ts` and response modules
- **localStorage** for persistence (no backend)
- **Web Audio nodes** created once and reused (avoid GC pauses)

## Relevant Commits

- `62797ae` Added LFO tab with display
- `803d3d0` Tab redesign
- `53740c1` FX tab with simple animations
- `7098575` Sample redesign
- `f1f2a73` Parameters inside sample tab

## See Also

@AGENTS.md - Next.js version-specific warnings and setup notes
