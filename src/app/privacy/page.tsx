import type { Metadata } from "next";
import Link from "next/link";

import { PRIVACY_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // The title template in the layout turns this into "Privacy — Drum Machine".
  title: "Privacy",
  description: `How ${SITE_NAME} handles data: it does not. No accounts, no analytics, no cookies, and nothing that leaves your browser.`,
  alternates: { canonical: PRIVACY_URL },
  // A privacy notice nobody can find is not much of a notice, and a search
  // engine finding it is also how someone checks the claim before installing.
  robots: { index: true, follow: true },
};

/**
 * The date this text last changed. Written out rather than taken from the
 * build, which would push it forward on every unrelated deploy and quietly
 * claim a review that never happened.
 */
const LAST_UPDATED = "4 September 2026";

/** The storage this app writes, in the order someone would meet it. */
const STORED = [
  ["Patterns and banks you save", "drum-machine-banks"],
  ["The theme you picked", "drum-machine-theme"],
  ["Which MIDI input and output you chose", "drum-machine-midi-*"],
  ["Controls you have mapped to a MIDI knob", "drum-machine-midi-cc-map"],
  ["Which speakers you chose", "drum-machine-audio-output"],
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* The rail's band heading, so the page reads as part of the machine. */}
      <h2 className="text-muted text-[10px] font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A link off the site, which on this page is only ever to GitHub. */
function Outbound({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="decoration-edge hover:decoration-fg underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  );
}

export default function Privacy() {
  return (
    // `min-h-dvh` rather than the machine's fixed `h-dvh`: this is a document
    // and scrolls with the window, where the app scrolls its own panes.
    <main className="bg-surface text-fg min-h-dvh">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 text-sm leading-relaxed md:py-16">
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-muted hover:text-fg w-fit text-xs transition-colors"
          >
            ← Back to the machine
          </Link>
          <h1 className="text-2xl font-semibold">Privacy</h1>
          <p className="text-muted text-xs">Last updated {LAST_UPDATED}</p>
        </header>

        {/*
          The name is followed by punctuation rather than a space on purpose:
          a plain space between an expression and the text after it is dropped
          on the way through the compiler, and the sentence renders glued
          together. Prettier removes an explicit `{" "}` here, so the wording
          is what keeps this readable.
        */}
        <p>
          There is no server behind {SITE_NAME}. No accounts, no analytics, no
          advertising, no cookies and no third-party scripts — nothing you do
          here is sent anywhere, because there is nowhere for it to be sent.
          What follows is the detail, since &ldquo;we collect nothing&rdquo; is
          an easy sentence to write and a fair thing to want specifics about.
        </p>

        <Section title="What stays on your device">
          <p>
            Your browser remembers a few things so the machine is where you left
            it. All of it lives in your browser&rsquo;s own storage for this
            site, and none of it is transmitted:
          </p>
          <ul className="flex flex-col gap-1.5">
            {STORED.map(([what, key]) => (
              <li key={key} className="flex flex-wrap items-baseline gap-x-2">
                <span>{what}</span>
                <code className="text-muted text-xs">{key}</code>
              </li>
            ))}
          </ul>
          <p>
            None of it identifies you, and clearing this site&rsquo;s data in
            your browser settings removes all of it for good. There is no copy
            anywhere else.
          </p>
        </Section>

        <Section title="Samples you load">
          <p>
            A sound loaded from your own files is decoded in the browser and
            held in memory while the tab is open. It is not uploaded, not
            stored, and not carried by a shared link — reloading the page is
            enough to be rid of it.
          </p>
        </Section>

        <Section title="Links you share">
          <p>
            Copying a link packs the beat — the steps, the mix, the sample
            settings, the tempo and the effects — into the part of the URL after
            the <code className="text-muted text-xs">#</code>. Browsers never
            send that part to a server, so a beat travels in the link itself and
            nowhere else, to wherever you choose to paste it. Nothing is
            recorded here when you make a link, and nothing is recorded when
            someone opens one.
          </p>
        </Section>

        <Section title="Permissions your browser may ask for">
          <p>
            <span className="font-medium">MIDI.</span> Choosing a controller
            asks your browser for access to MIDI devices, which is used to play
            the machine and to keep or send clock. Nothing about your devices is
            kept beyond which one you picked.
          </p>
          <p>
            <span className="font-medium">Microphone.</span> Browsers hide the
            names of your audio outputs until audio access has been granted
            once, so the button that reveals them in Sound settings has to ask
            for the microphone. The stream is stopped the instant it arrives:
            nothing is recorded, heard or kept, and the recording indicator goes
            out with it. Declining is fine — the outputs are still listed, just
            numbered rather than named.
          </p>
        </Section>

        <Section title="Working offline">
          <p>
            The app installs a service worker that copies the page, its code and
            the preset kits into your browser&rsquo;s cache, which is what lets
            it run with no network at all. That cache sits on your device and
            clears with the rest of this site&rsquo;s data.
          </p>
        </Section>

        <Section title="Hosting">
          <p>
            The files are served by GitHub Pages. Like any web server, GitHub
            records the requests it answers, which includes your IP address and
            the browser you asked with. That is GitHub&rsquo;s own processing —
            this site neither controls it nor can see it — and it is described
            in the{" "}
            <Outbound href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement">
              GitHub Privacy Statement
            </Outbound>
            . No other service is contacted while the app runs.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If any of the above stops being true — analytics, accounts, anything
            at all that leaves your device — this page changes before the
            feature ships, and the date at the top changes with it.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, or something here that does not match what the app does:{" "}
            <Outbound href="https://github.com/ladobarnovi/drum-machine/issues">
              open an issue on GitHub
            </Outbound>
            .
          </p>
        </Section>
      </div>
    </main>
  );
}
