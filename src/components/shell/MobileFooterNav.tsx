"use client";

export type MobilePage = "settings" | "main" | "fx";

type MobileFooterNavProps = {
  page: MobilePage;
  onChange: (page: MobilePage) => void;
};

type TabDef = {
  id: MobilePage;
  label: string;
  icon: React.ReactNode;
};

const COG_ICON = (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-5"
  >
    <circle cx="10" cy="10" r="2.5" />
    <circle cx="10" cy="10" r="6" />
    <path d="M10 2.2v1.6M10 16.2v1.6M17.8 10h-1.6M3.8 10H2.2M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1M15.5 15.5l-1.1-1.1M5.6 5.6L4.5 4.5" />
  </svg>
);

// Four pads rather than a play glyph: the header already has a play/pause
// button on it (the compact scope), and reusing that shape here would read as
// a second transport control rather than a way back to the channel grid.
const PADS_ICON = (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-5"
  >
    <rect x="2.5" y="2.5" width="6" height="6" rx="1.25" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1.25" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1.25" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1.25" />
  </svg>
);

// A styled wordmark instead of an icon: "FX" said in the page's own font
// reads as an abbreviation, in a heavier italic face it reads as a label for
// what the tab is.
const FX_ICON = (
  <span
    aria-hidden="true"
    className="font-serif text-base leading-none font-black tracking-tight italic"
  >
    FX
  </span>
);

const TABS: TabDef[] = [
  { id: "settings", label: "Settings", icon: COG_ICON },
  { id: "main", label: "Main", icon: PADS_ICON },
  { id: "fx", label: "FX", icon: FX_ICON },
];

/**
 * The phone's way between the three pages the machine shows one at a time
 * below `lg` — what it plays with, the pattern itself, and what it's put
 * through — in place of the sliding drawers `Sidebar` used to open over the
 * content. Its own row at the bottom of the app shell rather than
 * `position: fixed`, so nothing above it needs bottom padding to clear it:
 * the flex column above simply has that much less height to lay out in.
 *
 * Switching pages here never touches the transport. The sequencer runs off
 * state held in `DrumMachine` itself, entirely independent of which page is
 * on screen, so a pattern started on Main keeps running for as long as
 * Settings or FX is being looked at.
 */
export default function MobileFooterNav({
  page,
  onChange,
}: MobileFooterNavProps) {
  return (
    <nav
      aria-label="Pages"
      className="border-line bg-surface shrink-0 border-t lg:hidden"
    >
      <div className="grid grid-cols-3">
        {TABS.map((tab) => {
          const isActive = tab.id === page;

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                isActive ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
