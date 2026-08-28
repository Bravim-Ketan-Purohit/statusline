import { span } from "../spans.js";
/** Tier 1: zoneinfo only, no subprocess. */
export const clockTile = {
    id: "clock",
    displayName: "Clock",
    category: "environment",
    tier: 1,
    capabilities: [],
    defaultProps: { tz: "America/Chicago", hour12: true, showZone: true },
    render(props, { local }, mode) {
        const now = local.now ?? new Date();
        let time;
        let zone = "";
        try {
            time = new Intl.DateTimeFormat("en-US", {
                timeZone: props.tz,
                hour: "numeric",
                minute: "2-digit",
                hour12: props.hour12,
            }).format(now);
            if (props.showZone && mode === "full") {
                const parts = new Intl.DateTimeFormat("en-US", {
                    timeZone: props.tz,
                    timeZoneName: "short",
                }).formatToParts(now);
                zone = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
            }
        }
        catch {
            // Invalid IANA zone -> fall back to local rather than crashing the row.
            time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        }
        const out = [span(time)];
        if (zone)
            out.push(span(` ${zone}`, { dim: true }));
        return out;
    },
};
