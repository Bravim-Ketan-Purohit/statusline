/** The one currency between core and every adapter. */
export interface Span {
  text: string;
  /** hex "#rrggbb", or "palette:accent" to resolve against theme.palette */
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  /** OSC 8 target (terminal) / href (web). tmux ignores it. */
  link?: string;
  /**
   * Forces the theme's danger colour and bold, overriding every other colour
   * in every adapter. This is the one place a tile is allowed to shout.
   */
  danger?: boolean;
}

export type RenderMode = "full" | "compact";

export const span = (text: string, rest: Omit<Span, "text"> = {}): Span => ({ text, ...rest });
