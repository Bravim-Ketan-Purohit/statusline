import { z } from "zod";
export declare const CONFIG_VERSION = 1;
export declare const GradientSchema: z.ZodObject<{
    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>;
export declare const TileStyleSchema: z.ZodObject<{
    bg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    fg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    gradient: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
    }, {
        from: string;
        to: string;
    }>>>;
    glyph: z.ZodDefault<z.ZodString>;
    label: z.ZodDefault<z.ZodString>;
    labelDim: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    gradient: {
        from: string;
        to: string;
    } | null;
    glyph: string;
    label: string;
    labelDim: boolean;
    bg?: string | undefined;
    fg?: string | undefined;
}, {
    bg?: string | undefined;
    fg?: string | undefined;
    gradient?: {
        from: string;
        to: string;
    } | null | undefined;
    glyph?: string | undefined;
    label?: string | undefined;
    labelDim?: boolean | undefined;
}>;
/** Sparse per-breakpoint override: only what differs from the next smaller bp. */
export declare const ResponsiveOverrideSchema: z.ZodObject<{
    hidden: z.ZodOptional<z.ZodBoolean>;
    compact: z.ZodOptional<z.ZodBoolean>;
    style: z.ZodOptional<z.ZodObject<{
        bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
        fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
        gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
            from: z.ZodUnion<[z.ZodString, z.ZodString]>;
            to: z.ZodUnion<[z.ZodString, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
        }, {
            from: string;
            to: string;
        }>>>>;
        glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    }, {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    hidden?: boolean | undefined;
    compact?: boolean | undefined;
    style?: {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    } | undefined;
}, {
    hidden?: boolean | undefined;
    compact?: boolean | undefined;
    style?: {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    } | undefined;
}>;
export declare const TileSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    style: z.ZodDefault<z.ZodObject<{
        bg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        fg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        gradient: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            from: z.ZodUnion<[z.ZodString, z.ZodString]>;
            to: z.ZodUnion<[z.ZodString, z.ZodString]>;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
        }, {
            from: string;
            to: string;
        }>>>;
        glyph: z.ZodDefault<z.ZodString>;
        label: z.ZodDefault<z.ZodString>;
        labelDim: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        gradient: {
            from: string;
            to: string;
        } | null;
        glyph: string;
        label: string;
        labelDim: boolean;
        bg?: string | undefined;
        fg?: string | undefined;
    }, {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    }>>;
    /**
     * tmux passes this through `#{mouse_status_range}`, which is capped at
     * 15 bytes. Validated here rather than at render time, per the spec.
     */
    action: z.ZodEffects<z.ZodDefault<z.ZodNullable<z.ZodString>>, string | null, string | null | undefined>;
    flex: z.ZodDefault<z.ZodBoolean>;
    /**
     * `priority` sits alongside breakpoint-id keys, so the catchall has to
     * admit both shapes. effectiveOverride() ignores anything non-object.
     */
    responsive: z.ZodDefault<z.ZodObject<{
        priority: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodUnion<[z.ZodObject<{
        hidden: z.ZodOptional<z.ZodBoolean>;
        compact: z.ZodOptional<z.ZodBoolean>;
        style: z.ZodOptional<z.ZodObject<{
            bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                to: z.ZodUnion<[z.ZodString, z.ZodString]>;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
            }, {
                from: string;
                to: string;
            }>>>>;
            glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }>, z.ZodNumber]>, z.objectOutputType<{
        priority: z.ZodDefault<z.ZodNumber>;
    }, z.ZodUnion<[z.ZodObject<{
        hidden: z.ZodOptional<z.ZodBoolean>;
        compact: z.ZodOptional<z.ZodBoolean>;
        style: z.ZodOptional<z.ZodObject<{
            bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                to: z.ZodUnion<[z.ZodString, z.ZodString]>;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
            }, {
                from: string;
                to: string;
            }>>>>;
            glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }>, z.ZodNumber]>, "strip">, z.objectInputType<{
        priority: z.ZodDefault<z.ZodNumber>;
    }, z.ZodUnion<[z.ZodObject<{
        hidden: z.ZodOptional<z.ZodBoolean>;
        compact: z.ZodOptional<z.ZodBoolean>;
        style: z.ZodOptional<z.ZodObject<{
            bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                to: z.ZodUnion<[z.ZodString, z.ZodString]>;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
            }, {
                from: string;
                to: string;
            }>>>>;
            glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }>, z.ZodNumber]>, "strip">>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    style: {
        gradient: {
            from: string;
            to: string;
        } | null;
        glyph: string;
        label: string;
        labelDim: boolean;
        bg?: string | undefined;
        fg?: string | undefined;
    };
    id: string;
    props: Record<string, unknown>;
    action: string | null;
    flex: boolean;
    responsive: {
        priority: number;
    } & {
        [k: string]: number | {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        };
    };
}, {
    type: string;
    id: string;
    style?: {
        bg?: string | undefined;
        fg?: string | undefined;
        gradient?: {
            from: string;
            to: string;
        } | null | undefined;
        glyph?: string | undefined;
        label?: string | undefined;
        labelDim?: boolean | undefined;
    } | undefined;
    props?: Record<string, unknown> | undefined;
    action?: string | null | undefined;
    flex?: boolean | undefined;
    responsive?: z.objectInputType<{
        priority: z.ZodDefault<z.ZodNumber>;
    }, z.ZodUnion<[z.ZodObject<{
        hidden: z.ZodOptional<z.ZodBoolean>;
        compact: z.ZodOptional<z.ZodBoolean>;
        style: z.ZodOptional<z.ZodObject<{
            bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
            gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                to: z.ZodUnion<[z.ZodString, z.ZodString]>;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
            }, {
                from: string;
                to: string;
            }>>>>;
            glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
            labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }, {
        hidden?: boolean | undefined;
        compact?: boolean | undefined;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
    }>, z.ZodNumber]>, "strip"> | undefined;
}>;
export declare const RowSchema: z.ZodObject<{
    id: z.ZodString;
    tiles: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        style: z.ZodDefault<z.ZodObject<{
            bg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            fg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
            gradient: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                to: z.ZodUnion<[z.ZodString, z.ZodString]>;
            }, "strip", z.ZodTypeAny, {
                from: string;
                to: string;
            }, {
                from: string;
                to: string;
            }>>>;
            glyph: z.ZodDefault<z.ZodString>;
            label: z.ZodDefault<z.ZodString>;
            labelDim: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            gradient: {
                from: string;
                to: string;
            } | null;
            glyph: string;
            label: string;
            labelDim: boolean;
            bg?: string | undefined;
            fg?: string | undefined;
        }, {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        }>>;
        /**
         * tmux passes this through `#{mouse_status_range}`, which is capped at
         * 15 bytes. Validated here rather than at render time, per the spec.
         */
        action: z.ZodEffects<z.ZodDefault<z.ZodNullable<z.ZodString>>, string | null, string | null | undefined>;
        flex: z.ZodDefault<z.ZodBoolean>;
        /**
         * `priority` sits alongside breakpoint-id keys, so the catchall has to
         * admit both shapes. effectiveOverride() ignores anything non-object.
         */
        responsive: z.ZodDefault<z.ZodObject<{
            priority: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodUnion<[z.ZodObject<{
            hidden: z.ZodOptional<z.ZodBoolean>;
            compact: z.ZodOptional<z.ZodBoolean>;
            style: z.ZodOptional<z.ZodObject<{
                bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>>;
                glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }>, z.ZodNumber]>, z.objectOutputType<{
            priority: z.ZodDefault<z.ZodNumber>;
        }, z.ZodUnion<[z.ZodObject<{
            hidden: z.ZodOptional<z.ZodBoolean>;
            compact: z.ZodOptional<z.ZodBoolean>;
            style: z.ZodOptional<z.ZodObject<{
                bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>>;
                glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }>, z.ZodNumber]>, "strip">, z.objectInputType<{
            priority: z.ZodDefault<z.ZodNumber>;
        }, z.ZodUnion<[z.ZodObject<{
            hidden: z.ZodOptional<z.ZodBoolean>;
            compact: z.ZodOptional<z.ZodBoolean>;
            style: z.ZodOptional<z.ZodObject<{
                bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>>;
                glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }>, z.ZodNumber]>, "strip">>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        style: {
            gradient: {
                from: string;
                to: string;
            } | null;
            glyph: string;
            label: string;
            labelDim: boolean;
            bg?: string | undefined;
            fg?: string | undefined;
        };
        id: string;
        props: Record<string, unknown>;
        action: string | null;
        flex: boolean;
        responsive: {
            priority: number;
        } & {
            [k: string]: number | {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            };
        };
    }, {
        type: string;
        id: string;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
        props?: Record<string, unknown> | undefined;
        action?: string | null | undefined;
        flex?: boolean | undefined;
        responsive?: z.objectInputType<{
            priority: z.ZodDefault<z.ZodNumber>;
        }, z.ZodUnion<[z.ZodObject<{
            hidden: z.ZodOptional<z.ZodBoolean>;
            compact: z.ZodOptional<z.ZodBoolean>;
            style: z.ZodOptional<z.ZodObject<{
                bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>>;
                glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }>, z.ZodNumber]>, "strip"> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    tiles: {
        type: string;
        style: {
            gradient: {
                from: string;
                to: string;
            } | null;
            glyph: string;
            label: string;
            labelDim: boolean;
            bg?: string | undefined;
            fg?: string | undefined;
        };
        id: string;
        props: Record<string, unknown>;
        action: string | null;
        flex: boolean;
        responsive: {
            priority: number;
        } & {
            [k: string]: number | {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            };
        };
    }[];
}, {
    id: string;
    tiles?: {
        type: string;
        id: string;
        style?: {
            bg?: string | undefined;
            fg?: string | undefined;
            gradient?: {
                from: string;
                to: string;
            } | null | undefined;
            glyph?: string | undefined;
            label?: string | undefined;
            labelDim?: boolean | undefined;
        } | undefined;
        props?: Record<string, unknown> | undefined;
        action?: string | null | undefined;
        flex?: boolean | undefined;
        responsive?: z.objectInputType<{
            priority: z.ZodDefault<z.ZodNumber>;
        }, z.ZodUnion<[z.ZodObject<{
            hidden: z.ZodOptional<z.ZodBoolean>;
            compact: z.ZodOptional<z.ZodBoolean>;
            style: z.ZodOptional<z.ZodObject<{
                bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>>;
                glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
            }, "strip", z.ZodTypeAny, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }, {
            hidden?: boolean | undefined;
            compact?: boolean | undefined;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
        }>, z.ZodNumber]>, "strip"> | undefined;
    }[] | undefined;
}>;
export declare const BreakpointSchema: z.ZodObject<{
    id: z.ZodString;
    minCols: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    minCols: number;
}, {
    id: string;
    minCols: number;
}>;
export declare const ConfigSchema: z.ZodObject<{
    version: z.ZodNumber;
    meta: z.ZodDefault<z.ZodObject<{
        name: z.ZodDefault<z.ZodString>;
        cellWidth: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        cellWidth: number;
    }, {
        name?: string | undefined;
        cellWidth?: number | undefined;
    }>>;
    theme: z.ZodDefault<z.ZodObject<{
        terminalBg: z.ZodDefault<z.ZodString>;
        palette: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        colorMode: z.ZodDefault<z.ZodEnum<["ansi16", "ansi256", "truecolor"]>>;
        font: z.ZodDefault<z.ZodObject<{
            nerdFont: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            nerdFont: boolean;
        }, {
            nerdFont?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        terminalBg: string;
        palette: Record<string, string>;
        colorMode: "ansi16" | "ansi256" | "truecolor";
        font: {
            nerdFont: boolean;
        };
    }, {
        terminalBg?: string | undefined;
        palette?: Record<string, string> | undefined;
        colorMode?: "ansi16" | "ansi256" | "truecolor" | undefined;
        font?: {
            nerdFont?: boolean | undefined;
        } | undefined;
    }>>;
    breakpoints: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        minCols: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        minCols: number;
    }, {
        id: string;
        minCols: number;
    }>, "many">;
    rows: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tiles: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            props: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            style: z.ZodDefault<z.ZodObject<{
                bg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
                fg: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
                gradient: z.ZodDefault<z.ZodNullable<z.ZodObject<{
                    from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                }, "strip", z.ZodTypeAny, {
                    from: string;
                    to: string;
                }, {
                    from: string;
                    to: string;
                }>>>;
                glyph: z.ZodDefault<z.ZodString>;
                label: z.ZodDefault<z.ZodString>;
                labelDim: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                gradient: {
                    from: string;
                    to: string;
                } | null;
                glyph: string;
                label: string;
                labelDim: boolean;
                bg?: string | undefined;
                fg?: string | undefined;
            }, {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            }>>;
            /**
             * tmux passes this through `#{mouse_status_range}`, which is capped at
             * 15 bytes. Validated here rather than at render time, per the spec.
             */
            action: z.ZodEffects<z.ZodDefault<z.ZodNullable<z.ZodString>>, string | null, string | null | undefined>;
            flex: z.ZodDefault<z.ZodBoolean>;
            /**
             * `priority` sits alongside breakpoint-id keys, so the catchall has to
             * admit both shapes. effectiveOverride() ignores anything non-object.
             */
            responsive: z.ZodDefault<z.ZodObject<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, z.objectOutputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip">, z.objectInputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip">>>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            style: {
                gradient: {
                    from: string;
                    to: string;
                } | null;
                glyph: string;
                label: string;
                labelDim: boolean;
                bg?: string | undefined;
                fg?: string | undefined;
            };
            id: string;
            props: Record<string, unknown>;
            action: string | null;
            flex: boolean;
            responsive: {
                priority: number;
            } & {
                [k: string]: number | {
                    hidden?: boolean | undefined;
                    compact?: boolean | undefined;
                    style?: {
                        bg?: string | undefined;
                        fg?: string | undefined;
                        gradient?: {
                            from: string;
                            to: string;
                        } | null | undefined;
                        glyph?: string | undefined;
                        label?: string | undefined;
                        labelDim?: boolean | undefined;
                    } | undefined;
                };
            };
        }, {
            type: string;
            id: string;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
            props?: Record<string, unknown> | undefined;
            action?: string | null | undefined;
            flex?: boolean | undefined;
            responsive?: z.objectInputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip"> | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tiles: {
            type: string;
            style: {
                gradient: {
                    from: string;
                    to: string;
                } | null;
                glyph: string;
                label: string;
                labelDim: boolean;
                bg?: string | undefined;
                fg?: string | undefined;
            };
            id: string;
            props: Record<string, unknown>;
            action: string | null;
            flex: boolean;
            responsive: {
                priority: number;
            } & {
                [k: string]: number | {
                    hidden?: boolean | undefined;
                    compact?: boolean | undefined;
                    style?: {
                        bg?: string | undefined;
                        fg?: string | undefined;
                        gradient?: {
                            from: string;
                            to: string;
                        } | null | undefined;
                        glyph?: string | undefined;
                        label?: string | undefined;
                        labelDim?: boolean | undefined;
                    } | undefined;
                };
            };
        }[];
    }, {
        id: string;
        tiles?: {
            type: string;
            id: string;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
            props?: Record<string, unknown> | undefined;
            action?: string | null | undefined;
            flex?: boolean | undefined;
            responsive?: z.objectInputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip"> | undefined;
        }[] | undefined;
    }>, "many">>;
    targets: z.ZodDefault<z.ZodObject<{
        claudeCode: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxRows: z.ZodDefault<z.ZodNumber>;
            style: z.ZodDefault<z.ZodEnum<["pills", "powerline", "plain"]>>;
        }, "strip", z.ZodTypeAny, {
            style: "pills" | "powerline" | "plain";
            enabled: boolean;
            maxRows: number;
        }, {
            style?: "pills" | "powerline" | "plain" | undefined;
            enabled?: boolean | undefined;
            maxRows?: number | undefined;
        }>>;
        tmux: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            side: z.ZodDefault<z.ZodEnum<["left", "right"]>>;
            maxWidth: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            side: "left" | "right";
            maxWidth: number;
        }, {
            enabled?: boolean | undefined;
            side?: "left" | "right" | undefined;
            maxWidth?: number | undefined;
        }>>;
        web: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
        }, {
            enabled?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        claudeCode: {
            style: "pills" | "powerline" | "plain";
            enabled: boolean;
            maxRows: number;
        };
        tmux: {
            enabled: boolean;
            side: "left" | "right";
            maxWidth: number;
        };
        web: {
            enabled: boolean;
        };
    }, {
        claudeCode?: {
            style?: "pills" | "powerline" | "plain" | undefined;
            enabled?: boolean | undefined;
            maxRows?: number | undefined;
        } | undefined;
        tmux?: {
            enabled?: boolean | undefined;
            side?: "left" | "right" | undefined;
            maxWidth?: number | undefined;
        } | undefined;
        web?: {
            enabled?: boolean | undefined;
        } | undefined;
    }>>;
    daemon: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        port: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        port: number;
    }, {
        enabled?: boolean | undefined;
        port?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: number;
    meta: {
        name: string;
        cellWidth: number;
    };
    theme: {
        terminalBg: string;
        palette: Record<string, string>;
        colorMode: "ansi16" | "ansi256" | "truecolor";
        font: {
            nerdFont: boolean;
        };
    };
    breakpoints: {
        id: string;
        minCols: number;
    }[];
    rows: {
        id: string;
        tiles: {
            type: string;
            style: {
                gradient: {
                    from: string;
                    to: string;
                } | null;
                glyph: string;
                label: string;
                labelDim: boolean;
                bg?: string | undefined;
                fg?: string | undefined;
            };
            id: string;
            props: Record<string, unknown>;
            action: string | null;
            flex: boolean;
            responsive: {
                priority: number;
            } & {
                [k: string]: number | {
                    hidden?: boolean | undefined;
                    compact?: boolean | undefined;
                    style?: {
                        bg?: string | undefined;
                        fg?: string | undefined;
                        gradient?: {
                            from: string;
                            to: string;
                        } | null | undefined;
                        glyph?: string | undefined;
                        label?: string | undefined;
                        labelDim?: boolean | undefined;
                    } | undefined;
                };
            };
        }[];
    }[];
    targets: {
        claudeCode: {
            style: "pills" | "powerline" | "plain";
            enabled: boolean;
            maxRows: number;
        };
        tmux: {
            enabled: boolean;
            side: "left" | "right";
            maxWidth: number;
        };
        web: {
            enabled: boolean;
        };
    };
    daemon: {
        enabled: boolean;
        port: number;
    };
}, {
    version: number;
    breakpoints: {
        id: string;
        minCols: number;
    }[];
    meta?: {
        name?: string | undefined;
        cellWidth?: number | undefined;
    } | undefined;
    theme?: {
        terminalBg?: string | undefined;
        palette?: Record<string, string> | undefined;
        colorMode?: "ansi16" | "ansi256" | "truecolor" | undefined;
        font?: {
            nerdFont?: boolean | undefined;
        } | undefined;
    } | undefined;
    rows?: {
        id: string;
        tiles?: {
            type: string;
            id: string;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
            props?: Record<string, unknown> | undefined;
            action?: string | null | undefined;
            flex?: boolean | undefined;
            responsive?: z.objectInputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip"> | undefined;
        }[] | undefined;
    }[] | undefined;
    targets?: {
        claudeCode?: {
            style?: "pills" | "powerline" | "plain" | undefined;
            enabled?: boolean | undefined;
            maxRows?: number | undefined;
        } | undefined;
        tmux?: {
            enabled?: boolean | undefined;
            side?: "left" | "right" | undefined;
            maxWidth?: number | undefined;
        } | undefined;
        web?: {
            enabled?: boolean | undefined;
        } | undefined;
    } | undefined;
    daemon?: {
        enabled?: boolean | undefined;
        port?: number | undefined;
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
export type Tile = z.infer<typeof TileSchema>;
export type Row = z.infer<typeof RowSchema>;
export type Breakpoint = z.infer<typeof BreakpointSchema>;
export type TileStyle = z.infer<typeof TileStyleSchema>;
/**
 * Migration path stub. The spec says the schema WILL change, so the door is
 * open from v1: add `if (v === 1) { ...; v = 2; }` steps here.
 */
export declare function migrate(raw: unknown): unknown;
export declare function parseConfig(raw: unknown): Config;
export declare function safeParseConfig(raw: unknown): z.SafeParseReturnType<{
    version: number;
    breakpoints: {
        id: string;
        minCols: number;
    }[];
    meta?: {
        name?: string | undefined;
        cellWidth?: number | undefined;
    } | undefined;
    theme?: {
        terminalBg?: string | undefined;
        palette?: Record<string, string> | undefined;
        colorMode?: "ansi16" | "ansi256" | "truecolor" | undefined;
        font?: {
            nerdFont?: boolean | undefined;
        } | undefined;
    } | undefined;
    rows?: {
        id: string;
        tiles?: {
            type: string;
            id: string;
            style?: {
                bg?: string | undefined;
                fg?: string | undefined;
                gradient?: {
                    from: string;
                    to: string;
                } | null | undefined;
                glyph?: string | undefined;
                label?: string | undefined;
                labelDim?: boolean | undefined;
            } | undefined;
            props?: Record<string, unknown> | undefined;
            action?: string | null | undefined;
            flex?: boolean | undefined;
            responsive?: z.objectInputType<{
                priority: z.ZodDefault<z.ZodNumber>;
            }, z.ZodUnion<[z.ZodObject<{
                hidden: z.ZodOptional<z.ZodBoolean>;
                compact: z.ZodOptional<z.ZodBoolean>;
                style: z.ZodOptional<z.ZodObject<{
                    bg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    fg: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
                    gradient: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodObject<{
                        from: z.ZodUnion<[z.ZodString, z.ZodString]>;
                        to: z.ZodUnion<[z.ZodString, z.ZodString]>;
                    }, "strip", z.ZodTypeAny, {
                        from: string;
                        to: string;
                    }, {
                        from: string;
                        to: string;
                    }>>>>;
                    glyph: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    label: z.ZodOptional<z.ZodDefault<z.ZodString>>;
                    labelDim: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
                }, "strip", z.ZodTypeAny, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }, {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }, {
                hidden?: boolean | undefined;
                compact?: boolean | undefined;
                style?: {
                    bg?: string | undefined;
                    fg?: string | undefined;
                    gradient?: {
                        from: string;
                        to: string;
                    } | null | undefined;
                    glyph?: string | undefined;
                    label?: string | undefined;
                    labelDim?: boolean | undefined;
                } | undefined;
            }>, z.ZodNumber]>, "strip"> | undefined;
        }[] | undefined;
    }[] | undefined;
    targets?: {
        claudeCode?: {
            style?: "pills" | "powerline" | "plain" | undefined;
            enabled?: boolean | undefined;
            maxRows?: number | undefined;
        } | undefined;
        tmux?: {
            enabled?: boolean | undefined;
            side?: "left" | "right" | undefined;
            maxWidth?: number | undefined;
        } | undefined;
        web?: {
            enabled?: boolean | undefined;
        } | undefined;
    } | undefined;
    daemon?: {
        enabled?: boolean | undefined;
        port?: number | undefined;
    } | undefined;
}, {
    version: number;
    meta: {
        name: string;
        cellWidth: number;
    };
    theme: {
        terminalBg: string;
        palette: Record<string, string>;
        colorMode: "ansi16" | "ansi256" | "truecolor";
        font: {
            nerdFont: boolean;
        };
    };
    breakpoints: {
        id: string;
        minCols: number;
    }[];
    rows: {
        id: string;
        tiles: {
            type: string;
            style: {
                gradient: {
                    from: string;
                    to: string;
                } | null;
                glyph: string;
                label: string;
                labelDim: boolean;
                bg?: string | undefined;
                fg?: string | undefined;
            };
            id: string;
            props: Record<string, unknown>;
            action: string | null;
            flex: boolean;
            responsive: {
                priority: number;
            } & {
                [k: string]: number | {
                    hidden?: boolean | undefined;
                    compact?: boolean | undefined;
                    style?: {
                        bg?: string | undefined;
                        fg?: string | undefined;
                        gradient?: {
                            from: string;
                            to: string;
                        } | null | undefined;
                        glyph?: string | undefined;
                        label?: string | undefined;
                        labelDim?: boolean | undefined;
                    } | undefined;
                };
            };
        }[];
    }[];
    targets: {
        claudeCode: {
            style: "pills" | "powerline" | "plain";
            enabled: boolean;
            maxRows: number;
        };
        tmux: {
            enabled: boolean;
            side: "left" | "right";
            maxWidth: number;
        };
        web: {
            enabled: boolean;
        };
    };
    daemon: {
        enabled: boolean;
        port: number;
    };
}>;
