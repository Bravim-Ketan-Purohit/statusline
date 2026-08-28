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
}

export type RenderMode = "full" | "compact";

export const span = (text: string, rest: Omit<Span, "text"> = {}): Span => ({ text, ...rest });
