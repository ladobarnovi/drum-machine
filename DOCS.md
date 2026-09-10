# Drum Machine — Documentation

A 16-channel, 64-step drum sequencer that runs entirely in the browser. Web
Audio does the synthesis and the effects, `localStorage` does the saving, and
there is no backend — no account, no upload, no network call after the page has
loaded. It installs as a PWA and works offline, samples included.

This document covers everything the machine does, control by control, followed
by a parameter reference and a short architecture section for anyone reading the
source.

---

## Contents

1. [At a glance](#1-at-a-glance)
2. [Getting started](#2-getting-started)
3. [The layout](#3-the-layout)
4. [Channels](#4-channels)
5. [The sample editor](#5-the-sample-editor)
6. [The sequencer](#6-the-sequencer)
7. [Transport](#7-transport)
8. [Kits](#8-kits)
9. [Scenes](#9-scenes)
10. [The snapshot](#10-the-snapshot)
11. [Master effects](#11-master-effects)
12. [Sharing a beat](#12-sharing-a-beat)
13. [MIDI](#13-midi)
14. [Sound output](#14-sound-output)
15. [Themes](#15-themes)
16. [Keyboard and pointer reference](#16-keyboard-and-pointer-reference)
17. [What is saved, and where](#17-what-is-saved-and-where)
18. [Offline and install](#18-offline-and-install)
19. [Parameter reference](#19-parameter-reference)
20. [For developers](#20-for-developers)

---

## 1. At a glance

|                |                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| Channels       | 16, each with its own sample, mix, filters, envelope, LFO and sends                                     |
| Pattern length | 1–64 steps per channel, set independently — channels wrap on their own cycles                           |
| Resolution     | 16th notes (4 steps per beat)                                                                           |
| Tempo          | 40–200 BPM, internal or followed from MIDI clock                                                        |
| Swing          | 0–75% delay on the off-grid 16ths                                                                       |
| Per step       | on/off, velocity, probability, retrigger count, timing nudge, slice, and locks on 14 channel parameters |
| Storage        | 16 banks × 16 pattern slots, 8 scenes, 1 held snapshot, autosaved session                               |
| Master FX      | drive, filter, compressor, and three send buses (delay, reverb, phaser)                                 |
| Kits           | 909, 808, 707, plus your own uploads                                                                    |
| Control        | mouse, touch, keyboard, and MIDI (notes, CC learn, clock in/out)                                        |
| Sharing        | the whole machine packed into a URL fragment                                                            |

---

## 2. Getting started

1. Open the page. It loads the **909** kit into channels 1–11 automatically, so
   there is something to play immediately.
2. Press **Play** — the button in the left rail, the scope in the header, or the
   space bar.
3. Click a channel pad to select it, then click steps in the grid to write a
   rhythm.

Play stays disabled until at least one channel has a sample loaded, and the
transport says why rather than leaving the button greyed out unexplained. A
machine with no kit shows a notice above the sample slot pointing at where to
load one.

Everything is autosaved. Closing the tab and coming back restores the kit, the
pattern, the mix, the tempo, the master effects, the output level and the held
snapshot.

**What loads when you open the page**, in order: a shared beat if the address
bar carries one; otherwise the session saved from your last visit; otherwise the
909 kit. A link that will not open falls back to the kit rather than leaving you
with sixteen empty channels, and says so.

---

## 3. The layout

**Desktop (from `xl` up)** — three columns:

- **Left rail — Settings.** Transport, scenes, the kit picker, the share panel,
  the settings dialog button, and a privacy link at the foot.
- **Centre — the machine.** The 16 channel pads, the sample editor card, and the
  sequencer card.
- **Right rail — Effects.** Two tabs: _Send FX_ (delay, reverb, phaser) and
  _Master FX_ (drive, filter, compressor, output level).

**Header** — on every width, outside the scrolling pane so it never scrolls away:
a compact oscilloscope that doubles as play/stop, the page title, and the
snapshot **Save** / **Recall** pair.

**Phone and tablet (below `xl`)** — the same three columns become three pages,
switched from the footer nav: **Settings**, **Main** (the pads icon), and **FX**.
The header stays on all three, so the transport and the snapshot are always
reachable.

---

## 4. Channels

Sixteen pads in a grid. A pad shows the channel name, a level meter, and mute /
solo buttons (dropped on the phone's compact pads).

- **Click** a pad to select the channel — the sample editor and the step grid
  both follow the selection.
- **Alt + click** auditions the channel once, without the transport running.
- **Ctrl + 1…8** selects channels 1–8; **Ctrl + Shift + 1…8** selects 9–16.
- **Right-click** (or **Shift + F10**) opens the channel menu: clear / copy /
  paste steps, copy / paste sample, mute, solo.
- A pad flashes when one of its hits is heard, and its meter follows the
  channel's own output.

**Mute and solo.** Mute always silences its own channel. Solo decides which of
the _unmuted_ channels survive — so mute wins, and each button keeps one meaning.

**Choke.** A channel can name another channel whose hits cut it short — an open
hat silenced by the closed one, the classic case. The setting lives on the
channel being choked, so one hit can silence several others. A channel can never
choke itself. A cut is a 5 ms fade, not a hard stop.

**Naming.** A channel is called `Ch. n` until a sample is loaded, at which point
it takes the sample's name. Type your own name and it stops following samples —
the machine will not rename a slot out from under a decision you made on purpose.
Names are capped at 24 characters.

---

## 5. The sample editor

Five tabs sharing one card, directly above the pattern grid. All five act on the
selected channel.

### 5.1 Sample

- **Load from the library** — the bundled 909, 808 and 707 categories, browsed in
  a dialog that marks what the channel is already playing.
- **Upload** — any audio file the browser can decode. Uploaded samples live only
  in the page that decoded them: they do not survive a reload, and they cannot
  travel in a shared link.
- **Trim** — drag the two handles across the waveform to set where a hit starts
  and stops. The edges are fractions of the file, so a trim survives a pitch
  change. The handles cannot be dragged through one another; they stop half a
  percent apart.
- **Reverse** — plays the trimmed region back to front. The edges keep their
  meaning, so a hit cut to its transient reverses into a swell leading up to it.
- **One shot / Slicer** — one shot plays the whole trimmed region on every hit.
  Slicer divides that same region into 4, 8, 16 or 24 equal parts and hands the
  choice of which part to the pattern, so a single loaded break can be re-ordered
  step by step. The cuts divide the _trimmed_ region, so trimming and slicing
  compose.
- **Gain, Pan, Pitch** — the channel's level (0–150%), stereo position (hard left
  to hard right) and tuning (±12 semitones, applied via playback rate).

The waveform strip draws slice boundaries while slicing, marks the slice a step
is pointed at while a step is open, and runs a playhead during a hit.

### 5.2 Filter

Two cuts per channel, pictured as a response curve:

- **Low cut** (highpass), 20 Hz–20 kHz. At 20 Hz it is bypassed.
- **High cut** (lowpass), 20 Hz–20 kHz. At 20 kHz it is bypassed.
- **Resonance** for each, 0–1. At 0 the response is flat (Butterworth); at 1 the
  corner sings without tipping into self-oscillation.
- **Slope**, shared by both cuts: 12, 18 or 24 dB per octave.

While the transport runs, the curve and the knobs follow the hit currently
sounding — so a pattern that sweeps its cutoff hit by hit can be watched doing
it. Opening a step for editing pins them to that step instead.

### 5.3 Env

The amplitude envelope applied to every hit, pictured:

- **Attack** 0–0.5 s — at 0 the onset is instant.
- **Decay** 0.005–2 s — at 2 s the envelope is bypassed and the sample rings out.
- **Sustain** 0–1 — the level decay falls to instead of silence. At 0 it is
  bypassed and decay reaches silence on its own.
- **Release** 0.005–2 s — the fall from the sustain level to silence. Only heard
  once sustain is doing something.

All four default to their bypassed end, so an untouched channel plays the sample
as recorded.

### 5.4 LFO

One modulation source per channel, drawn as the wave it puts out:

- **Shape** — sine, triangle, saw, square, or random (sample-and-hold: a fresh
  value each cycle, held flat until the next).
- **Destination** — pitch (±12 semitones at full amount), volume, low cut or high
  cut (±4 octaves at full amount).
- **Rate** 0.1–20 Hz.
- **Amount** 0–1, as a fraction of the destination's range.
- **Retrigger** — on, every hit restarts the LFO from the top, so each one sweeps
  identically. Off, the channel runs one continuous LFO that hits tap wherever it
  has got to, so a slow shape drifts across the pattern.

The LFO belongs to the channel alone: no step can lock any part of it.

### 5.5 FX

Three send amounts, 0–1 each: **Delay**, **Reverb**, **Phaser**. Each taps a copy
of the channel into the matching master bus, and the buses return alongside the
dry mix. Sends start closed, so a fresh kit is dry.

---

## 6. The sequencer

Four tabs sharing one card.

### 6.1 Steps — the live grid

The selected channel's pattern, one button per step, with a playhead following
the transport.

- **Click** switches a step on or off.
- **Hold** (or **Shift + click**, or **Shift + Enter** on a focused step) opens
  the step for editing.
- **Drag up/down** on a step writes whatever the **Swipe** switch is pointed at:
  _Velocity_, _Pitch_, or _Position_ (the slice — offered only on sliced
  channels). The arrow keys do the same on a focused step.
- **Right-click** opens the step menu: clear, edit, copy, paste.

Switching a step off keeps everything dialled into it — velocity, locks, slice —
so toggling it back on returns the step you had.

### 6.2 Editing a step

Opening a step turns the editor into that step's view: the sliders read out what
the step is about to be played with, and moving one writes a **lock** — an
override standing in for the channel's setting on that step alone.

Fourteen parameters can be locked: volume, pan, pitch, both cutoffs and both
resonances, attack, decay, sustain, release, and the three sends. Choke and the
LFO cannot — one is routing between channels, the other has nothing per-step to
give. A knob's menu can also randomize a lock across every active step, or clear
that lock from the whole pattern at once.

A step also carries four things of its own:

- **Velocity** 5–100% — a fraction of the channel's volume. It only ever
  attenuates, and the floor sits above silence so a ghost note stays visible.
- **Probability** 0–100% — the chance it fires when its turn comes round, rolled
  each pass. Below 100% a fixed pattern varies loop to loop.
- **Repeat** ×1–×4 — retriggers within the step's own duration, splitting the gap
  to the next step evenly. Rolls and ratchets.
- **Timing** ±50 ms — nudges the hit itself off the grid, on top of tempo and
  swing. Held in milliseconds, so the feel stays the same size at any tempo.

### 6.3 Pattern controls

Under the grid, in three labelled groups plus the swipe switch:

- **Length** — 1 to 64 steps. The presets are 4, 8, 16, 32 and 64; anything
  between is typed into the field, which is what keeps deliberately odd lengths
  like 7 or 13 reachable. Shrinking a channel keeps whatever is programmed past
  the new end.
- **Fills** — Downbeat, Backbeat, Offbeat, 3 + 3 + 2 (tresillo), 8th, 16th. Each
  is a repeating cycle rather than a fixed list of steps, so it means the same
  rhythm at any length. A fill button stays lit while the pattern is still
  exactly what it wrote, so the row doubles as a readout of what is programmed.
- **Actions** — nudge earlier / later (it rotates, so it is always reversible),
  invert (its own undo), humanize (scatters the velocity of every hit by up to
  ±10%), and clear.
- **Swipe** — what a vertical drag on the grid means.

All of these write only the steps the channel actually plays; none of them reach
the pattern held past the end.

### 6.4 Patterns

Sixteen slots in the bank being browsed, labelled `A-1` … `A-16`. A slot holds
every channel's steps, length and mix — but **not the kit**, which is shared
across every pattern and bank. Click to load; right-click to save the live
machine into the slot or delete it. Mute and solo are deliberately not part of a
pattern; that is what scenes are for.

### 6.5 Banks

Sixteen banks, `A` through `P` — 256 pattern slots in all. Selecting a bank
changes which sixteen slots the Patterns tab shows.

### 6.6 All

Every channel's pattern at once, one row apiece, each with its own playhead.
Clicking a step toggles it on the row it landed on, so a pattern can be written
beside the ones around it.

---

## 7. Transport

- **Play / Stop** — the rail button, the header scope, or the space bar (unless
  you are typing).
- **BPM** — 40 to 200. While following an external MIDI clock, the tempo comes
  from the clock instead.
- **Swing** — 0 to 75%, how far the off-grid 16ths (the "e" and "a" of each beat)
  are pushed late. At 0 the grid is straight.

Playback uses the standard Web Audio lookahead: a coarse timer queues notes
slightly ahead against the sample-accurate audio clock, so it does not drift the
way `setInterval` playback would. Tempo and swing edits apply to the next step
queued rather than waiting for a restart. The transport counts an absolute tick,
and every channel wraps that tick by its own length.

---

## 8. Kits

Four entries in the picker:

| Kit       | Contents                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| **909**   | Kick, Snare, Low/Mid/High Tom, Rim Shot, Clap, Closed/Open Hihat, Crash, Ride — 11 channels. Bright and punchy. |
| **808**   | The same core plus Maracas, Shaker, Cowbell, Cymbal — 13 channels. Deep and round, with tails that ring on.     |
| **707**   | The same core plus Tambourine, Cowbell, Crash, Ride — 13 channels. Crisp digital hits.                          |
| **Empty** | Clears every channel — samples and patterns both. The one kit that takes away rather than loads.                |

A kit fills channels 1 to _n_ in kit order — kick, snare, toms, then everything
hit with a stick — and leaves the rest alone. 909 loads on startup.

---

## 9. Scenes

Eight slots in the left rail, holding one thing each: **which channels are
silent**. Not a mix — that is what the snapshot is for.

- **Alt + 1…8** recalls a scene; clicking a slot does the same.
- **Right-click** a slot to save the live mutes into it, rename it, or clear it.
- A slot lights when the live mutes match it exactly. That is derived rather than
  remembered: muting a channel by hand drops the light the moment the mix stops
  matching, and muting your way back into a scene's shape lights it again.

Solo is deliberately left out — it is a listening tool, reached for and dropped a
moment later. Recalling a scene changes what sits underneath a solo without
disturbing the solo itself.

---

## 10. The snapshot

One held mix, saved and recalled from the header — so it is reachable however far
the channel list has been scrolled.

**Save** captures every channel's parameters — level, pan, pitch, both filters,
the full envelope, the three sends, choke and the LFO — plus all six master
stages and the output fader. **Recall** puts them back.

What it deliberately does not touch: the steps, the lengths, the names, the
loaded samples, and the mutes. Recalling puts a sound back where it was without
undoing the writing you have done since.

---

## 11. Master effects

The right rail, in two tabs. Sends come first because their returns rejoin at the
master input — so the stages on the other tab are working on the repeats, the
tail and the sweep as well as on the dry channels. Each tab runs in signal-chain
order within itself.

### Send FX

**Delay** — a bus channels tap into.

- **Sync / Free** — synced, the time locks to a note value: 1/32, 1/16 T, 1/16,
  1/8 T, 1/16 D, 1/8, 1/4 T, 1/8 D, 1/4, 1/4 D, 1/2, 1/1. Free, it runs at
  0.02–2 s. Synced by default, at a dotted eighth.
- **Feedback** 0–90% — how much of each repeat feeds the next.
- **Ping-pong** — each repeat lands on the opposite side to the one before it.
  The bus is summed to mono and placed off to one side to start the alternation,
  so this trades the panning the sends arrive with rather than adding to it.
- **Tone** — a lowpass inside the feedback loop, so each repeat is darker than
  the last. Defaults to 8 kHz.
- **Level** — the return level, and the whole of the bypass.
- **Reverb send** — passes the repeats on into the reverb bus, taken after Level.

**Reverb** — noise shaped by a decay envelope, so no impulse response ships as a
binary asset. A dense, characterless space, which is what a drum bus generally
wants anyway.

- **Decay** 0.2–8 s. **Tone** — damping on the tail, default 6 kHz.
- **Level**, and a **Phaser send** that passes the tail on to be set moving.

**Phaser** — allpass stages swept by an LFO, summed with the dry signal.

- **Stages** 2, 4, 6 or 8 — one notch per pair, so these read as 1 to 4 notches.
  Fewer is the broad, obvious sweep; more is the dense, vocal one.
- **Rate** 0.02–8 Hz. **Depth** 0–1, scaled into a two-octave sweep across a
  200–1600 Hz band. **Feedback** 0–70%. **Level**.

### Master FX

Everything here is in the path of the whole mix.

**Drive** — saturation in four shapes: soft, tube, hard, fold. **Amount** 0–1 (at
0 the stage is linear, so only the level is heard), plus an output **Level**.

**Filter** — a low/high cut pair on the mix, after the drive so the harmonics
saturation adds are cut rather than fed back into it. **Ctrl + F** bypasses and
re-engages it. Starts bypassed and flat, so switching it in is silent until a
cutoff moves.

**Compressor** — threshold −60 to 0 dB, ratio 1:1 to 20:1, attack 0–200 ms,
release 10 ms–1 s, a fixed 6 dB knee, and makeup **Level**. A gain-reduction
meter shows how much is being taken off.

**Output** — the master fader, last before the destination. It sits downstream of
where the send returns rejoin, so it scales the whole mix — repeats and tail
included — without touching the delay's feedback gain. It is the one thing a
shared link never carries.

Drive, filter and compressor start bypassed but already dialled in, so switching
one on does something from the first hit. The three send buses start enabled with
every channel send closed, so raising a send is all it takes to hear them.

---

## 12. Sharing a beat

**Copy link** in the left rail packs the live machine into a URL fragment
(`#p=…`) and copies it. If the clipboard refuses, the link is shown, selected,
for you to copy by hand.

What travels: the steps, the lengths, the mix, every channel's sample edits, the
library sample each channel was playing, the names, the mutes and solos, the
tempo, the swing, and all six master stages.

What does not: **the output fader** — how loud a beat arrives is the listener's
business — and **uploaded samples**, which exist only as decoded buffers in the
page that decoded them. Those slots arrive empty and named for what is missing,
with their steps intact.

Opening a link replaces the whole machine. Unmentioned channels are emptied and
the effects rail is set from the link, so a beat cannot be heard through a
stranger's reverb. A notice says what arrived, and what could not. The fragment
is taken out of the address bar as it is read, so what is on screen from then on
is yours to change and a refresh does not hand the sent beat back. The button is
disabled while there is nothing worth sending — no sample loaded anywhere and no
step switched on.

The payload is deflated and base64url-encoded; a full kit with effects fits in
roughly 380 characters. The format is versioned: version 1 links still open, and
decode the master stages to their bypassed defaults.

---

## 13. MIDI

Available in browsers that implement Web MIDI — Chrome, Edge, Opera. The settings
dialog hides the MIDI tabs entirely where it is missing.

**Input device** — picked in Settings → MIDI, and remembered.

**Notes.** Notes 36–51 play channels 1–16. 36 is C1, where a kick sits in General
MIDI and in most drum racks, so a 16-pad controller lines up one pad per channel
with nothing to configure. Velocity attenuates the hit exactly as a step's own
velocity does. The MIDI channel is ignored: a controller sending on channel 10
works like one sending on channel 1.

**CC learn.** Right-click any knob or slider — or tap its MIDI badge — and pick
_Learn_; the next CC that arrives is bound to it. One CC drives one control, so a
second control learning the same number takes it over rather than both listening.
Bindings are listed in Settings → Mappings, where they can be cleared one at a
time or all at once, and they survive reloads. The mappable set is the machine's
whole parameter list rather than what happens to be on screen: a control on a
closed tab, or on a channel that is not selected, still answers to its CC.

**Clock in.** Set the clock source to _External_ and the transport follows an
incoming MIDI clock, its tempo estimated from a quarter note's worth of pulses by
a least-squares fit — long enough that pulse jitter washes out, short enough that
a tempo change is heard within a beat. Start, Stop and Continue drive the
transport.

**Clock out.** Pick an output device and the machine broadcasts 24 ppq clock plus
Start and Stop, aligned to the same instant the first step is scheduled at. The
broadcast clock is straight: swing is a feel applied to this machine's steps, not
something a slaved device should inherit.

---

## 14. Sound output

Settings → Sound picks which speakers, headphones or interface the machine plays
out of — worth having when it is one of several things making noise on the
computer.

This needs `AudioContext.setSinkId`, which today means Chrome and Edge; elsewhere
the panel says so and the machine plays out of the system default. Browsers
withhold device names until permission is granted, so the panel offers to ask.
The choice is remembered.

---

## 15. Themes

Settings → Theme, five palettes:

| Theme        |                                                                 |
| ------------ | --------------------------------------------------------------- |
| **Classic**  | Neutral greys and orange, following your system light/dark mode |
| **Neon**     | Indigo night, turquoise and magenta                             |
| **Tiki**     | Jungle teal, mango and hibiscus pink                            |
| **Carnival** | Cream midway, carnival red and cobalt blue                      |
| **Glitch**   | Black void, acid green and shock pink                           |

The theme is one attribute on `<html>` rather than React state, and an inline
script applies the saved one before the first paint, so the wrong colours are
never on screen.

---

## 16. Keyboard and pointer reference

Press `?` at any time to see this list in the app.

**Transport**

| Keys    |                                     |
| ------- | ----------------------------------- |
| `Space` | Play or stop, unless you are typing |

**Channels**

| Keys                     |                                              |
| ------------------------ | -------------------------------------------- |
| `Ctrl` + `1…8`           | Select channels 1 to 8                       |
| `Ctrl` + `Shift` + `1…8` | Select channels 9 to 16                      |
| `Alt` + click            | Audition a pad without running the transport |

**Scenes**

| Keys          |                                                         |
| ------------- | ------------------------------------------------------- |
| `Alt` + `1…8` | Recall a saved scene                                    |
| Right-click   | Save the live mutes into a slot, rename it, or clear it |

**Steps**

| Keys                     |                                         |
| ------------------------ | --------------------------------------- |
| Click                    | Switch a step on or off                 |
| Hold, or `Shift` + click | Open a step for editing                 |
| `Shift` + `Enter`        | Open the focused step                   |
| Drag ↑↓                  | Set what the Swipe switch is pointed at |
| `↑` `↓`                  | The same, on the focused step           |

**Master**

| Keys         |                                       |
| ------------ | ------------------------------------- |
| `Ctrl` + `F` | Bypass or re-engage the master filter |

**Knobs, sliders and trim handles**

| Keys                 |                                  |
| -------------------- | -------------------------------- |
| `↑` `↓` (or `←` `→`) | Move by one step                 |
| `Page ↑` `Page ↓`    | Move by ten                      |
| `Home` `End`         | Jump to either end of the travel |
| `Shift` + drag       | Fine adjustment                  |

**Menus and dialogs**

| Keys            |                                                                          |
| --------------- | ------------------------------------------------------------------------ |
| Right-click     | Open a menu — on pads, steps, pattern and scene slots, knobs and sliders |
| `Shift` + `F10` | The same, from the keyboard                                              |
| `↑` `↓`         | Move between menu items                                                  |
| `Esc`           | Close a menu or dialog                                                   |
| `?`             | Open the shortcut list                                                   |

---

## 17. What is saved, and where

Everything is in `localStorage` on your own machine. Nothing is sent anywhere: no
accounts, no analytics, no cookies.

| Key                                   | Holds                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `drum-machine-session`                | The live machine, autosaved: kit, steps, mix, tempo, swing, master FX, output level, the snapshot |
| `drum-machine-banks`                  | The 16 banks of 16 pattern slots                                                                  |
| `drum-machine-scenes`                 | The 8 scene slots                                                                                 |
| `drum-machine-theme`                  | The palette you picked                                                                            |
| `drum-machine-midi-input` / `-output` | The MIDI devices you chose                                                                        |
| `drum-machine-midi-cc-map`            | Controls you have mapped to a MIDI knob                                                           |
| `drum-machine-audio-output`           | The speakers you chose                                                                            |

Uploaded samples are the exception: they are decoded in the page and never
written to storage, so a reload restores the channel's settings and steps with
the slot empty.

Writes never throw. A full quota, or a private-browsing tab that refuses storage,
just means this reload will not be the one that comes back — the machine keeps
playing either way.

---

## 18. Offline and install

The app is a progressive web app: it can be installed from the browser and then
runs with no network at all, samples included. A service worker precaches the
page, the JS and CSS chunks, and the 909 kit on first open, so the default kit
works offline even if it was never loaded while online.

The worker is only registered in production builds, so `npm run dev` is never
served from a cache. To exercise it locally:

```bash
npm run build && npm run serve
```

`next start` cannot serve a static export, hence `npm run serve` — a small static
server on port 3001. Stopping it with the tab still open is the simplest way to
check the offline path.

---

## 19. Parameter reference

### Channel

| Parameter        | Range           | Default | Notes                              |
| ---------------- | --------------- | ------- | ---------------------------------- |
| Volume           | 0 – 1.5         | 1       | Linear gain                        |
| Pan              | −1 – +1         | 0       | Hard left to hard right            |
| Pitch            | −12 – +12 st    | 0       | Applied via playback rate          |
| Low cut          | 20 Hz – 20 kHz  | 20 Hz   | Bypassed at the minimum            |
| High cut         | 20 Hz – 20 kHz  | 20 kHz  | Bypassed at the maximum            |
| Resonance (each) | 0 – 1           | 0       | Flat at 0, up to 18 dB Q at 1      |
| Filter slope     | 12 / 18 / 24    | 12      | dB per octave, shared by both cuts |
| Attack           | 0 – 0.5 s       | 0       | Bypassed at 0                      |
| Decay            | 0.005 – 2 s     | 2 s     | Bypassed at the maximum            |
| Sustain          | 0 – 1           | 0       | Bypassed at 0                      |
| Release          | 0.005 – 2 s     | 0.005 s | Only heard once sustain is above 0 |
| Sends (each)     | 0 – 1           | 0       | Delay, reverb, phaser              |
| Steps            | 1 – 64          | 16      | Presets 4, 8, 16, 32, 64           |
| Sample trim      | 0 – 1 fractions | 0 – 1   | Minimum span 0.5% of the file      |
| Slice count      | 4 / 8 / 16 / 24 | 16      | Slicer mode only                   |

### Step

| Parameter   | Range        | Default |
| ----------- | ------------ | ------- |
| Velocity    | 5% – 100%    | 100%    |
| Probability | 0% – 100%    | 100%    |
| Repeat      | ×1 – ×4      | ×1      |
| Timing      | −50 – +50 ms | 0 ms    |
| Slice       | 0 – count−1  | 0       |

### LFO

| Parameter   | Range                                   | Default |
| ----------- | --------------------------------------- | ------- |
| Shape       | sine / triangle / saw / square / random | sine    |
| Destination | pitch / volume / low cut / high cut     | pitch   |
| Rate        | 0.1 – 20 Hz                             | 5 Hz    |
| Amount      | 0 – 1                                   | 0.35    |
| Retrigger   | on / off                                | on      |

Full-amount depth: ±12 semitones for pitch, ±4 octaves for either cutoff.

### Transport and master

| Parameter            | Range               | Default |
| -------------------- | ------------------- | ------- |
| BPM                  | 40 – 200            | 120     |
| Swing                | 0 – 75%             | 0       |
| Drive amount         | 0 – 1               | 0.35    |
| Drive type           | soft/tube/hard/fold | soft    |
| Delay time (free)    | 0.02 – 2 s          | 0.375 s |
| Delay division       | 1/32 – 1/1          | 1/8 D   |
| Delay feedback       | 0 – 90%             | 35%     |
| Delay tone           | 20 Hz – 20 kHz      | 8 kHz   |
| Reverb decay         | 0.2 – 8 s           | 2 s     |
| Reverb tone          | 20 Hz – 20 kHz      | 6 kHz   |
| Phaser stages        | 2 / 4 / 6 / 8       | 4       |
| Phaser rate          | 0.02 – 8 Hz         | 0.25 Hz |
| Phaser depth         | 0 – 1               | 0.7     |
| Phaser feedback      | 0 – 70%             | 35%     |
| Compressor threshold | −60 – 0 dB          | −18 dB  |
| Compressor ratio     | 1:1 – 20:1          | 4:1     |
| Compressor attack    | 0 – 200 ms          | 5 ms    |
| Compressor release   | 10 ms – 1 s         | 150 ms  |
| Output level         | 0 – 1.5             | 1       |

Every value that reaches the machine from outside — a slider, a MIDI CC, a URL
someone else wrote, a value read back out of storage — goes through the clamp
that owns it, and falls back to the parameter's own default rather than to the
range minimum.

---

## 20. For developers

### Stack

Next.js 16 (static export), React 19, TypeScript 5, Tailwind CSS 4. No audio
library: the Web Audio API directly. No state library: hooks and a handful of
external stores.

### Where things live

```
src/
├── app/                  Next.js pages, layout, manifest, sitemap, privacy
├── components/
│   ├── channel/          Pads, sample editor, graphs, step grid
│   ├── master/           Master FX controls, oscilloscope, GR meter
│   ├── patterns/         Pattern and bank grids, sequencer tabs
│   ├── session/          Kit picker, scenes, snapshot controls
│   ├── shell/            Sidebar, settings dialog, share panel, mobile nav
│   ├── transport/        Play, BPM, swing
│   └── ui/               Knobs, sliders, tabs, menus, modal
├── hooks/                Sequencer, sample bank, banks, scenes, MIDI, meters
└── lib/                  Pure logic: no React, no DOM
```

The important seam is `lib/`: nothing in it touches React, and `lib/sequencer.ts`
touches neither React nor Web Audio.

| Module                   | Owns                                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/sequencer.ts`       | The machine's vocabulary: every parameter, its range, its clamp, its curve, its readout. Organised by parameter rather than by kind, because a range that moved without its curve would put the knob's travel in the wrong place. |
| `lib/audioGraph.ts`      | The Web Audio graph: master chain, per-hit voice, LFO nodes, meters                                                                                                                                                               |
| `lib/patternShare.ts`    | The share wire format: capture, encode, decode, apply, URL hash                                                                                                                                                                   |
| `lib/patterns.ts`        | Pattern and bank types, capture and apply                                                                                                                                                                                         |
| `lib/scenes.ts`          | Scene type, capture, apply, and the derived active-slot check                                                                                                                                                                     |
| `lib/presets.ts`         | The four kits, as lists of library sample ids                                                                                                                                                                                     |
| `lib/sampleLibrary.ts`   | The bundled samples — the one place filenames are written down                                                                                                                                                                    |
| `lib/sessionAutosave.ts` | Session save/load, built on the share wire format                                                                                                                                                                                 |
| `lib/midi*.ts`           | Message parsing, clock maths, the CC map, the mappable parameter table                                                                                                                                                            |
| `lib/*Response.ts`       | Response curves for the filter, envelope, FX and LFO graphs                                                                                                                                                                       |
| `lib/persistedStore.ts`  | `useSyncExternalStore`-shaped localStorage stores                                                                                                                                                                                 |
| `lib/themes.ts`          | Palettes, the `<html>` attribute store, the pre-paint init script                                                                                                                                                                 |
| `lib/shortcuts.ts`       | Key handling helpers and the shortcut table the help panel renders                                                                                                                                                                |

`hooks/useSequencer` is the transport; `hooks/useSampleBank` owns the
`AudioContext`, the decoded buffers and every trigger; `components/DrumMachine`
wires the lot together.

### Data model

- **`Channel`** — the live channel: sample state, trim, mode, mix, filters,
  envelope, sends, routing, LFO, and a fixed 64-long `steps` array of which only
  the first `length` play.
- **`Step`** — `on`, velocity, probability, repeat count, slice, timing offset,
  and optional `locks`. `on` is kept apart from velocity so switching a step off
  never throws away what was dialled into it.
- **`ChannelSnapshot`** — how a channel _sounds_, and nothing about what it
  plays. The unit shared by patterns, snapshots, links and autosave.
- **`Pattern`** — a `ChannelSnapshot` per channel plus steps and length. No kit.
- **`Scene`** — a name and a list of muted channel ids. Nothing else.
- **`SharedBeat`** — a superset of `Pattern`: everything above, plus the kit,
  names, mutes/solos, tempo, swing and the six master stages.

### Audio graph

Voices are summed into a master input that feeds drive → filter → compressor →
output fader → destination. Each stage is crossfaded between a processed and a
clean path rather than reconnected, so bypassing is silent. Three send buses
(delay, reverb, phaser) run alongside and return upstream of the fader; the delay
can feed the reverb, and the reverb the phaser. Nodes are built once per context
and reused — the drive curve and the reverb impulse are only rebuilt when the
setting they were built for actually moves.

### Commands

```bash
npm install
npm run dev          # dev server on http://localhost:3000
npm run build        # production build (static export) + service worker
npm run serve        # serve the export on port 3001
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run format       # Prettier
npm run icons        # regenerate the app icons
```

### Conventions

- Discrete channel settings are `<select>` dropdowns with the label on top, not
  segmented buttons.
- Hooks hold state; components are presentational.
- Every value arriving from outside goes through its clamp.
- `FORMAT_VERSION` in `lib/patternShare.ts` is bumped when a field is added, and
  the decoder stays tolerant of older versions.
- Run `npm run lint`, `npm run typecheck` and `npm run format:check` before
  committing.
