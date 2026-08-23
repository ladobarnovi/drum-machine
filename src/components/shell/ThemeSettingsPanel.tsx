"use client";

import { useSyncExternalStore } from "react";

import {
  THEMES,
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeToTheme,
  themeById,
  type Theme,
} from "@/lib/themes";

/**
 * Fills a swatch with the theme it stands for. Classic is the only one with two
 * faces — it takes the system's — so its tile is split corner to corner rather
 * than picking one of them to show.
 */
function swatchBackground(theme: Theme): string {
  const { surface, surfaceAlt } = theme.swatch;
  if (!surfaceAlt) return surface;
  return `linear-gradient(135deg, ${surface} 0 50%, ${surfaceAlt} 50% 100%)`;
}

/**
 * Picks the palette. The appearance half of `SettingsDialog`, alongside the
 * pickers for what the machine is plugged into: it is a preference about the
 * page rather than a control on the instrument, and it is set about as often
 * as the gear is — which is to say once, and then left alone. It used to sit
 * at the foot of the controls rail, where it took a permanent share of the
 * space reachable while playing to say something nobody reaches for mid-bar.
 *
 * Swatches rather than a list, because the names mean nothing on their own —
 * the point of a theme is what it looks like, so each button is a sample of
 * itself, drawn in its own colours whether or not it is the one in force.
 *
 * The choice is read from `<html>` rather than held here, and the inline script
 * in the layout puts it back from `localStorage` on the way in, so it survives
 * a reload without the wrong colours flashing up first.
 */
export default function ThemeSettingsPanel() {
  const themeId = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  return (
    <>
      <div className="grid grid-cols-5 gap-1.5">
        {THEMES.map((theme) => {
          const isActive = theme.id === themeId;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setTheme(theme.id)}
              aria-pressed={isActive}
              aria-label={theme.name}
              title={theme.name}
              // The ring is drawn in the *current* theme's selection colour,
              // like every other selected thing on the page; the tile inside it
              // is drawn in its own.
              className={`relative aspect-square cursor-pointer rounded-md border transition ${
                isActive
                  ? "ring-select ring-offset-surface ring-2 ring-offset-2"
                  : "hover:ring-edge hover:ring-offset-surface hover:ring-2 hover:ring-offset-2"
              }`}
              style={{
                background: swatchBackground(theme),
                borderColor: theme.swatch.edge,
              }}
            >
              {/* A lit step, which is the thing the accent is most often on. */}
              <span
                aria-hidden
                className="absolute inset-x-1.5 bottom-1.5 h-1 rounded-full"
                style={{ background: theme.swatch.accent }}
              />
            </button>
          );
        })}
      </div>

      <p className="text-muted text-xs">{themeById(themeId).description}</p>
    </>
  );
}
