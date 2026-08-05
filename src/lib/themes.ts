/**
 * The palettes the machine can wear. An id is written to `data-theme` on
 * `<html>`, where the matching block of tokens in `globals.css` picks it up —
 * so switching theme is one attribute rather than a re-render of anything that
 * has a colour on it.
 *
 * The swatch colours are copied from that stylesheet rather than read back off
 * the page, because the picker has to draw a theme that is *not* the one in
 * force: the tokens only ever hold the active palette. Keep the two in step.
 */

export type ThemeId = "classic" | "neon" | "tiki" | "carnival" | "glitch";

export type Theme = {
  id: ThemeId;
  /** Shown in the picker, and read out as the button's label. */
  name: string;
  /** One line under the picker saying what the palette is. */
  description: string;
  swatch: {
    /** The page colour the swatch is filled with. */
    surface: string;
    /**
     * A second page colour, for a theme that has more than one face. Only
     * Classic does — it follows the system — and the swatch is split between
     * the two to say so.
     */
    surfaceAlt?: string;
    /** What an active step is painted with, shown as a bar across the swatch. */
    accent: string;
    /** The swatch's own outline, so a pale theme still reads as a tile. */
    edge: string;
  };
};

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Neutral greys and orange, following your system setting.",
    swatch: {
      surface: "#ffffff",
      surfaceAlt: "#171717",
      accent: "#f97316",
      edge: "#a3a3a3",
    },
  },
  {
    id: "neon",
    name: "Neon",
    description: "Indigo night, turquoise and magenta.",
    swatch: {
      surface: "#0d0b1f",
      accent: "#22e2d2",
      edge: "#372f74",
    },
  },
  {
    id: "tiki",
    name: "Tiki",
    description: "Jungle teal, mango and hibiscus pink.",
    swatch: {
      surface: "#0b2b27",
      accent: "#ff8a3d",
      edge: "#1e5a51",
    },
  },
  {
    id: "carnival",
    name: "Carnival",
    description: "Cream midway, carnival red and cobalt blue.",
    swatch: {
      surface: "#fffaf0",
      accent: "#ff3b57",
      edge: "#e6cb95",
    },
  },
  {
    id: "glitch",
    name: "Glitch",
    description: "Black void, acid green and shock pink, fighting it out.",
    swatch: {
      surface: "#050507",
      accent: "#e8ff00",
      edge: "#302f3d",
    },
  },
];

/** The palette used until something else is chosen, and the one `<html>` ships with. */
export const DEFAULT_THEME_ID: ThemeId = "classic";

export const THEME_STORAGE_KEY = "drum-machine-theme";

const THEME_IDS: string[] = THEMES.map((theme) => theme.id);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value);
}

export function themeById(id: ThemeId): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/*
 * The theme lives on `<html>` rather than in React state, because that is where
 * it already is: the inline script below writes it before React has loaded, and
 * the stylesheet reads it from there. Wrapping the attribute as an external
 * store lets the picker subscribe to the real thing instead of keeping a second
 * copy that has to be kept in step with it.
 */

const listeners = new Set<() => void>();

export function subscribeToTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getThemeSnapshot(): ThemeId {
  const applied = document.documentElement.dataset.theme;
  return isThemeId(applied) ? applied : DEFAULT_THEME_ID;
}

/**
 * What the server rendered, and — because React reads this one while hydrating
 * rather than the live snapshot — what keeps the first client render matching
 * the HTML even when a different theme is already applied.
 */
export function getServerThemeSnapshot(): ThemeId {
  return DEFAULT_THEME_ID;
}

export function setTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Some privacy modes refuse storage outright. The theme still applies for
    // this visit; it just won't be waiting next time.
  }

  for (const listener of listeners) listener();
}

/**
 * Runs in the document head, synchronously, before anything is painted: the
 * server has no way of knowing which theme was last picked, so it renders the
 * default and this puts the saved one back before the wrong colours are ever
 * on screen.
 *
 * Written as a string of ES5 because it is inlined as-is, and it swallows its
 * own errors because `localStorage` throws outright in some privacy modes —
 * losing the saved theme is a fair price, taking the page down with it is not.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(
  THEME_IDS,
)}.indexOf(t)>-1)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
