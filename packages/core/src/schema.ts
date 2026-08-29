import { z } from "zod";

export const CONFIG_VERSION = 2;

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb");
const ColorRef = z.union([Hex, z.string().startsWith("palette:")]);

export const FillStopSchema = z.object({ color: Hex, pos: z.number().min(0).max(1) });

export const FillModeSchema = z.enum([
  "linear", "radial", "conic", "diamond", "wave", "ripple", "spiral",
  "barber", "comet", "scan", "plasma", "pulse", "breathe", "rainbow", "strobe",
]);

export const CellMatrixSchema = z.object({
  w: z.number().int().min(1).max(256),
  h: z.number().int().min(1).max(64),
  data: z.array(Hex).max(256 * 64),
});

export const FillSchema = z.object({
  kind: z.enum(["none", "gradient", "image"]).default("none"),
  stops: z.array(FillStopSchema).min(1).max(16)
    .default([{ color: "#2b0b52", pos: 0 }, { color: "#7b2ff7", pos: 1 }]),
  mode: FillModeSchema.default("linear"),
  angle: z.number().min(-360).max(360).default(0),
  origin: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).default([0.5, 0.5]),
  animated: z.boolean().default(false),
  speed: z.number().min(0.01).max(4).default(0.25),
  scale: z.number().min(0.05).max(12).default(1),
  cells: CellMatrixSchema.optional(),
  rotate: z.object({
    palettes: z.array(z.array(FillStopSchema).min(1).max(16)).max(24),
    every: z.enum(["session", "hourly", "daily"]).default("daily"),
  }).optional(),
});

export const GradientSchema = z.object({
  from: ColorRef,
  to: ColorRef,
  /**
   * A flowing gradient. The phase advances with wall-clock time, so the band
   * travels across the tile on every render.
   *
   * In a terminal that means one step per render: Claude Code's refreshInterval
   * floor is 1 second, so this is a slow pulse there, not a smooth flow. The
   * web preview animates it properly. The capability matrix says so.
   */
  animated: z.boolean().default(false),
  /** Cycles per second. 0.2 = one full traverse every five seconds. */
  speed: z.number().min(0.01).max(4).default(0.25),
});

export const BorderSchema = z.object({
  edge: z.enum(["none", "thin", "block", "bracket", "round", "angle", "powerline"]).default("none"),
  line: z.enum(["none", "under", "over", "both"]).default("none"),
  color: ColorRef.optional(),
});

export const BlinkSchema = z.object({
  target: z.enum(["border", "bg", "fg"]).default("border"),
  color: ColorRef,
  /** The terminal's redraw rate is the real ceiling; see the capability note. */
  hz: z.number().min(0.05).max(4).default(0.5),
});

export const SignalSchema = z.enum([
  "ci.failing", "ci.passing", "ci.running",
  "pr.approved", "pr.changes", "pr.pending", "pr.open",
  "context.above", "fivehour.above", "sevenday.above",
  "git.conflict", "git.dirty", "git.ahead", "git.behind", "git.clean",
  "cost.above", "battery.below", "review.waiting",
  "cpu.above", "mem.above", "swap.above", "disk.above",
  "load.above", "gpu.above", "vram.above",
  "always",
]);

export const RuleSchema = z.object({
  signal: SignalSchema,
  threshold: z.number().optional(),
  /** While firing, this rule overrides hideWhen and showOnlyWhen. */
  escalate: z.boolean().optional(),
  fg: ColorRef.optional(),
  bg: ColorRef.optional(),
  border: BorderSchema.optional(),
  blink: BlinkSchema.optional(),
});

export const TileStyleSchema = z.object({
  bg: ColorRef.optional(),
  fg: ColorRef.optional(),
  gradient: GradientSchema.nullable().default(null),
  /** Richer than `gradient`: modes, multi-stop ramps, baked images. */
  fill: FillSchema.optional(),
  /** Steady border. Rules may override it while they fire. */
  border: BorderSchema.optional(),
  /** Conditional styling; later rules win. */
  rules: z.array(RuleSchema).max(12).optional(),
  /**
   * Attention management. `hideWhen` removes the tile while any listed signal
   * holds; `showOnlyWhen` is the inverse and is the common case -- CI visible
   * only when it is failing. Both reuse the rules engine's signal set rather
   * than introducing a second condition language.
   */
  hideWhen: z.array(z.object({
    signal: SignalSchema, threshold: z.number().optional(),
  })).max(8).optional(),
  showOnlyWhen: z.array(z.object({
    signal: SignalSchema, threshold: z.number().optional(),
  })).max(8).optional(),
  glyph: z.string().default(""),
  label: z.string().default(""),
  labelDim: z.boolean().default(true),
});

/** Sparse per-breakpoint override: only what differs from the next smaller bp. */
export const ResponsiveOverrideSchema = z.object({
  hidden: z.boolean().optional(),
  compact: z.boolean().optional(),
  style: TileStyleSchema.partial().optional(),
});

export const TileSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.unknown()).default({}),
  style: TileStyleSchema.default({}),
  /**
   * tmux passes this through `#{mouse_status_range}`, which is capped at
   * 15 bytes. Validated here rather than at render time, per the spec.
   */
  action: z
    .string()
    .nullable()
    .default(null)
    .refine((v) => v === null || Buffer.byteLength(v, "utf8") <= 15, {
      message: "action id must be <= 15 bytes (tmux range=user| limit)",
    }),
  flex: z.boolean().default(false),
  /**
   * `priority` sits alongside breakpoint-id keys, so the catchall has to
   * admit both shapes. effectiveOverride() ignores anything non-object.
   */
  responsive: z
    .object({ priority: z.number().int().default(5) })
    .catchall(z.union([ResponsiveOverrideSchema, z.number()]))
    .default({ priority: 5 }),
});

export const RowSchema = z.object({
  id: z.string().min(1),
  tiles: z.array(TileSchema).default([]),
}).refine((r) => r.tiles.filter((t) => t.flex).length <= 1, {
  message: "a row may mark at most one tile flex; two would each claim the same slack",
  path: ["tiles"],
});

export const BreakpointSchema = z.object({
  id: z.string().min(1),
  minCols: z.number().int().min(0),
});

export const ConfigSchema = z.object({
  version: z.number().int(),
  meta: z
    .object({ name: z.string().default("untitled"), cellWidth: z.number().positive().default(8.4) })
    .default({}),
  theme: z
    .object({
      terminalBg: Hex.default("#16181c"),
      /** Name segments that mean production. A safety tile reddens on a match. */
      dangerPatterns: z.array(z.string()).default(["prod", "production", "prd", "live"]),
      dangerColor: ColorRef.default("#ff5f5f"),
      /** Branches the protected-branch tile warns about. */
      protectedBranches: z.array(z.string()).default(["main", "master", "release"]),
      /** Optional gradient behind the whole bar, same rules as a tile's. */
      terminalGradient: GradientSchema.nullable().default(null),
      /** The whole-bar fill. Supersedes terminalGradient; v1 configs migrate. */
      terminalFill: FillSchema.optional(),
      palette: z.record(Hex).default({}),
      colorMode: z.enum(["ansi16", "ansi256", "truecolor"]).default("truecolor"),
      font: z.object({ nerdFont: z.boolean().default(false) }).default({}),
    })
    .default({}),
  breakpoints: z.array(BreakpointSchema).min(1),
  rows: z.array(RowSchema).default([]),
  targets: z
    .object({
      claudeCode: z
        .object({
          enabled: z.boolean().default(true),
          maxRows: z.number().int().min(1).default(5),
          style: z.enum(["pills", "powerline", "plain"]).default("pills"),
        })
        .default({}),
      tmux: z
        .object({
          enabled: z.boolean().default(false),
          side: z.enum(["left", "right"]).default("right"),
          maxWidth: z.number().int().positive().default(120),
        })
        .default({}),
      web: z.object({ enabled: z.boolean().default(true) }).default({}),
    })
    .default({}),
  daemon: z
    .object({ enabled: z.boolean().default(false), port: z.number().int().default(7717) })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Tile = z.infer<typeof TileSchema>;
export type Row = z.infer<typeof RowSchema>;
export type Breakpoint = z.infer<typeof BreakpointSchema>;
export type TileStyle = z.infer<typeof TileStyleSchema>;

/**
 * Migration path stub. The spec says the schema WILL change, so the door is
 * open from v1: add `if (v === 1) { ...; v = 2; }` steps here.
 */
const toFill = (g: { from: string; to: string; animated?: boolean; speed?: number } | null | undefined) =>
  g ? {
    kind: "gradient" as const,
    stops: [{ color: g.from, pos: 0 }, { color: g.to, pos: 1 }],
    mode: "linear" as const, angle: 0, origin: [0.5, 0.5] as [number, number],
    animated: !!g.animated, speed: g.speed ?? 0.25, scale: 1,
  } : undefined;

export function migrate(raw: unknown): unknown {
  const obj = raw as Record<string, any>;
  let v = typeof obj?.version === "number" ? obj.version : CONFIG_VERSION;
  if (v > CONFIG_VERSION) {
    throw new Error(
      `config version ${v} is newer than this build supports (${CONFIG_VERSION}); upgrade the CLI`
    );
  }
  if (v === 1) {
    // v2 replaces the two-stop `gradient` with a full `fill`. The old key is
    // left in place so a v1 CLI reading the same file still renders.
    const next: Record<string, any> = { ...obj, version: 2 };
    const tf = toFill(obj?.theme?.terminalGradient);
    if (tf) next.theme = { ...obj.theme, terminalFill: tf };
    next.rows = (obj.rows ?? []).map((r: any) => ({
      ...r,
      tiles: (r.tiles ?? []).map((t: any) => {
        const f = toFill(t?.style?.gradient);
        return f ? { ...t, style: { ...t.style, fill: f } } : t;
      }),
    }));
    v = 2;
    return next;
  }
  return raw;
}

export function parseConfig(raw: unknown): Config {
  return ConfigSchema.parse(migrate(raw));
}

export function safeParseConfig(raw: unknown) {
  return ConfigSchema.safeParse(migrate(raw));
}
