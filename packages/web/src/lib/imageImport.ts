import type { Fill, FillStop, CellMatrix } from "@statusline/core";

/**
 * Image and GIF import.
 *
 * Decoding happens here, in the browser, and only the *result* is written into
 * the config: a colour ramp, or a small cell matrix. The CLI therefore never
 * parses a raster and the config stays plain JSON.
 *
 * Two honest limits shape this. A status line is a handful of text rows, so a
 * literal image lands at roughly 120x8 pixels using half-blocks -- a colour
 * field, not a picture. And the bar's job is carrying text, so a busy image
 * destroys legibility. Extracting a ramp usually reads better than painting
 * the photo, which is why it is the default.
 */

export const MATRIX_W = 96;
export const MATRIX_H = 8;

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

function ctxFor(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d unavailable");
  return { c, ctx };
}

/** Average each column into one stop: the image's horizontal colour story. */
export function stopsFromBitmap(bmp: ImageBitmap | HTMLImageElement, count = 8): FillStop[] {
  const n = Math.max(2, Math.min(16, count));
  const { ctx } = ctxFor(n, 16);
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, n, 16);
  const d = ctx.getImageData(0, 0, n, 16).data;
  const stops: FillStop[] = [];
  for (let x = 0; x < n; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let y = 0; y < 16; y++) {
      const i = (y * n + x) * 4;
      const w = d[i + 3]! / 255;
      r += d[i]! * w; g += d[i + 1]! * w; b += d[i + 2]! * w; a += w;
    }
    const k = a || 1;
    stops.push({ color: hex(r / k, g / k, b / k), pos: n === 1 ? 0 : x / (n - 1) });
  }
  return stops;
}

/** Downsample to the cell grid the terminal can actually paint. */
export function matrixFromBitmap(bmp: ImageBitmap | HTMLImageElement,
                                 w = MATRIX_W, h = MATRIX_H): CellMatrix {
  const { ctx } = ctxFor(w, h);
  ctx.drawImage(bmp as CanvasImageSource, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const data: string[] = [];
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    data.push(hex(d[o]!, d[o + 1]!, d[o + 2]!));
  }
  return { w, h, data };
}

async function bitmapOf(file: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

/**
 * Animated GIF -> a rotating set of palettes. Playing the frames literally is
 * pointless at the terminal's one-redraw-per-second floor, but a ramp derived
 * per frame drifts beautifully at that rate.
 *
 * ImageDecoder is Chromium-only; elsewhere we fall back to the first frame and
 * the caller reports that rather than pretending it animated.
 */
export async function framesFromGif(file: Blob, max = 12): Promise<{ stops: FillStop[][]; animated: boolean }> {
  const AnyWin = window as unknown as { ImageDecoder?: any };
  if (!AnyWin.ImageDecoder) {
    return { stops: [stopsFromBitmap(await bitmapOf(file))], animated: false };
  }
  try {
    const dec = new AnyWin.ImageDecoder({ data: await file.arrayBuffer(), type: file.type || "image/gif" });
    await dec.completed;
    const total: number = dec.tracks.selectedTrack?.frameCount ?? 1;
    const take = Math.min(max, total);
    const step = Math.max(1, Math.floor(total / take));
    const out: FillStop[][] = [];
    for (let i = 0; i < total && out.length < take; i += step) {
      const { image } = await dec.decode({ frameIndex: i });
      const { c, ctx } = ctxFor(image.displayWidth, image.displayHeight);
      ctx.drawImage(image, 0, 0);
      out.push(stopsFromBitmap(await createImageBitmap(c)));
      image.close?.();
    }
    return { stops: out, animated: out.length > 1 };
  } catch {
    return { stops: [stopsFromBitmap(await bitmapOf(file))], animated: false };
  }
}

export interface ImportResult {
  fill: Fill;
  note: string;
}

/** Build a fill from an already-cropped canvas, skipping the decode step. */
export async function fillFromCanvas(
  canvas: HTMLCanvasElement, style: "ramp" | "image", base: Fill
): Promise<ImportResult> {
  const bmp = await createImageBitmap(canvas);
  if (style === "image") {
    return {
      fill: { ...base, kind: "image", cells: matrixFromBitmap(bmp), rotate: undefined },
      note: `Baked your crop to ${MATRIX_W}x${MATRIX_H} cells.`,
    };
  }
  return {
    fill: { ...base, kind: "gradient", stops: stopsFromBitmap(bmp), cells: undefined, rotate: undefined },
    note: "Extracted an 8-stop ramp from your crop.",
  };
}

export const isGifFile = (file: File) => /gif/i.test(file.type) || /\.gif$/i.test(file.name);

export async function fillFromFile(
  file: File, style: "ramp" | "image", base: Fill
): Promise<ImportResult> {
  const isGif = isGifFile(file);

  if (isGif) {
    const { stops, animated } = await framesFromGif(file);
    return {
      fill: {
        ...base, kind: "gradient", stops: stops[0]!, animated: true,
        rotate: stops.length > 1 ? { palettes: stops, every: "session" } : undefined,
        cells: undefined,
      },
      note: animated
        ? `Read ${stops.length} frames into a rotating palette set.`
        : "This browser cannot decode GIF frames, so only the first frame was read.",
    };
  }

  const bmp = await bitmapOf(file);
  if (style === "image") {
    return {
      fill: { ...base, kind: "image", cells: matrixFromBitmap(bmp), rotate: undefined },
      note: `Baked to ${MATRIX_W}x${MATRIX_H} cells. A terminal row is two pixels tall, so this is a colour field, not a photograph.`,
    };
  }
  return {
    fill: { ...base, kind: "gradient", stops: stopsFromBitmap(bmp), cells: undefined, rotate: undefined },
    note: "Extracted an 8-stop ramp from the image's colours.",
  };
}
