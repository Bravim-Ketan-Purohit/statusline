import { z } from "zod";
export const CONFIG_VERSION = 1;
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb");
const ColorRef = z.union([Hex, z.string().startsWith("palette:")]);
export const GradientSchema = z.object({ from: ColorRef, to: ColorRef });
export const TileStyleSchema = z.object({
    bg: ColorRef.optional(),
    fg: ColorRef.optional(),
    gradient: GradientSchema.nullable().default(null),
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
/**
 * Migration path stub. The spec says the schema WILL change, so the door is
 * open from v1: add `if (v === 1) { ...; v = 2; }` steps here.
 */
export function migrate(raw) {
    const obj = raw;
    const v = typeof obj?.version === "number" ? obj.version : CONFIG_VERSION;
    if (v > CONFIG_VERSION) {
        throw new Error(`config version ${v} is newer than this build supports (${CONFIG_VERSION}); upgrade the CLI`);
    }
    return raw;
}
export function parseConfig(raw) {
    return ConfigSchema.parse(migrate(raw));
}
export function safeParseConfig(raw) {
    return ConfigSchema.safeParse(migrate(raw));
}
