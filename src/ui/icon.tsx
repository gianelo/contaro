import type { ReactElement } from "react";

type Drawing = {
  /** The shapes the icon is made of, on the one 24x24 grid below. */
  readonly draw: ReactElement;
  /** Only where the common weight reads wrong; see `COMMON_WEIGHT`. */
  readonly strokeWidth?: number;
};

/**
 * Every icon the design canvas draws, as geometry rather than as a file.
 *
 * They are written by hand and not installed: each one is two or three lines on
 * the same grid, and a package to hold seventeen of them would weigh more than
 * the rest of the interface. Written once here so a screen names an icon
 * instead of pasting a path -- the same path pasted twice is two paths that
 * will eventually differ.
 */
const icons = {
  calendar: {
    draw: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
  },
  // A second calendar, and not a variant of the one above: shorter, more
  // rounded, and carrying a stroke inside the grid. That stroke is the whole
  // difference -- it is what makes the drawing read as a month with a day in it
  // rather than as an empty box. Named for what it draws and not for the tab it
  // happens to sit in, so a second screen can reach for it without the name
  // lying.
  "calendar-day": {
    draw: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 10h18M8 15h3" />
      </>
    ),
  },
  list: {
    draw: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  users: {
    draw: (
      <>
        <path d="M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M22 20v-2a4 4 0 0 0-3-3.9" />
      </>
    ),
  },
  target: {
    draw: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  plus: {
    draw: <path d="M12 5v14M5 12h14" />,
  },
  person: {
    draw: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  backspace: {
    // Thinner than the rest: at weight 2 the notch where the arrow meets the
    // key closes up into a blob.
    strokeWidth: 1.8,
    draw: (
      <>
        <path d="M21 5H9.5L3.5 12l6 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
        <path d="M17 9.5l-5 5M12 9.5l5 5" />
      </>
    ),
  },
  check: {
    // Thicker than the rest: two strokes and nothing else, so at weight 2 it
    // reads as lighter than the row of text it marks.
    strokeWidth: 2.6,
    draw: <path d="M4 12.5l5 5L20 6.5" />,
  },
  close: {
    draw: <path d="M18 6L6 18M6 6l12 12" />,
  },
  "chevron-down": {
    draw: <path d="M6 9l6 6 6-6" />,
  },
  "alert-circle": {
    draw: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16v.01" />
      </>
    ),
  },
  "alert-triangle": {
    draw: (
      <>
        <path d="M12 3L2 20h20L12 3z" />
        <path d="M12 10v4M12 17v.01" />
      </>
    ),
  },
  cart: {
    draw: (
      <>
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.6 12h11l2.4-8H6" />
      </>
    ),
  },
  car: {
    draw: (
      <>
        <path d="M5 17h14l-1.5-6.5H6.5L5 17z" />
        <circle cx="8" cy="18.5" r="1.5" />
        <circle cx="16" cy="18.5" r="1.5" />
      </>
    ),
  },
  "arrow-up": {
    draw: <path d="M12 19V5M5 12l7-7 7 7" />,
  },
  rotate: {
    draw: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>
    ),
  },
} satisfies Record<string, Drawing>;

export type IconName = keyof typeof icons;

/** Every icon there is, for a gallery or a test that wants to walk them all. */
export const iconNames = Object.keys(icons) as readonly IconName[];

/**
 * The weight all but two of them are drawn at.
 *
 * Precedence, so the two rules never have to argue: what a screen asks for
 * beats an icon's own exception below, which beats this. That is the answer for
 * a `check` drawn small -- the screen that shrank it is the one that knows.
 */
const COMMON_WEIGHT = 2;

/** The grid every icon is written on, and the size it comes out at unasked. */
const GRID = 24;

export type IconProps = {
  name: IconName;
  /** Both width and height, in pixels: the shapes scale, they do not redraw. */
  size?: number;
  /**
   * The stroke width to draw it at, where the screen around it knows better
   * than the icon does.
   *
   * The canvas compensates optically: the smaller an icon comes out, the
   * heavier its line, so a 13px glyph does not fade beside the text it sits in.
   * The same `plus` is drawn at 2.2 at 18px and at 2.4 at 26px. That is a fact
   * about the screen and not about the drawing, which is why it is asked for
   * here rather than derived from `size` -- four samples are not a curve, and a
   * curve would have to argue with the per-icon exceptions below.
   *
   * Leave it off and the icon draws itself: its own exception, or the common
   * weight.
   */
  weight?: number;
  /**
   * What a screen reader should say. Leave it off wherever the text beside the
   * icon already says it -- a tab labelled "Presupuesto" whose icon also says
   * "calendario" is read out twice and means once.
   */
  label?: string;
};

/**
 * One of the drawings above, at a size, in the colour of whatever text it sits
 * in.
 *
 * It carries no colour of its own on purpose: `currentColor` is what lets the
 * same icon sit on a light screen and a dark one, and go grey in an inactive
 * tab and green in the active one, without anything asking which theme it is.
 */
export function Icon({ name, size = GRID, weight, label }: IconProps) {
  // Read back as a Drawing rather than as its own literal type: `satisfies`
  // keeps each entry exactly as written, so the ones drawn at the common
  // weight have no strokeWidth property to default at all.
  const { draw, strokeWidth = COMMON_WEIGHT }: Drawing = icons[name];
  const stroke = weight ?? strokeWidth;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      // Round caps and nothing else. The canvas sets no stroke-linejoin
      // anywhere, so its corners are SVG's default mitre: rounding them here
      // would blunt the point of the alert triangle and the tick of the check
      // against the drawing they are copied from.
      strokeLinecap="round"
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    >
      {draw}
    </svg>
  );
}
