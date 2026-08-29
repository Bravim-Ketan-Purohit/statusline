import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Crop before bake.
 *
 * A status line is extremely wide and only a few rows tall, so any image
 * dropped into it is going to be cropped hard. Choosing that crop is the
 * user's decision, not a centre-crop we make silently. The frame is locked to
 * the destination's real aspect, so what is inside it is exactly what lands
 * in the terminal.
 */
export function ImageCropper({
  file, aspect, onCancel, onConfirm,
}: {
  file: File;
  /** width / height of the destination, e.g. 96/8 = 12 */
  aspect: number;
  onCancel: () => void;
  onConfirm: (cropped: HTMLCanvasElement) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const VIEW_W = 460;
  const FRAME_W = 420;
  const FRAME_H = Math.max(24, Math.round(FRAME_W / aspect));
  const VIEW_H = Math.max(200, FRAME_H + 120);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      // Start at the zoom that just covers the frame, centred.
      const cover = Math.max(FRAME_W / im.width, FRAME_H / im.height);
      setZoom(cover);
      setPan({ x: 0, y: 0 });
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, FRAME_W, FRAME_H]);

  const draw = useCallback(() => {
    const c = canvasRef.current, ctx = c?.getContext("2d");
    if (!c || !ctx || !img) return;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#1a1a17";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const w = img.width * zoom, h = img.height * zoom;
    const cx = VIEW_W / 2 + pan.x, cy = VIEW_H / 2 + pan.y;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);

    // Scrim everything outside the frame so the crop reads immediately.
    const fx = (VIEW_W - FRAME_W) / 2, fy = (VIEW_H - FRAME_H) / 2;
    ctx.fillStyle = "rgba(20,20,18,0.72)";
    ctx.fillRect(0, 0, VIEW_W, fy);
    ctx.fillRect(0, fy + FRAME_H, VIEW_W, VIEW_H - fy - FRAME_H);
    ctx.fillRect(0, fy, fx, FRAME_H);
    ctx.fillRect(fx + FRAME_W, fy, VIEW_W - fx - FRAME_W, FRAME_H);

    ctx.strokeStyle = "#e6e0d2";
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, FRAME_W - 1, FRAME_H - 1);
    // thirds, the usual crop guide
    ctx.strokeStyle = "rgba(230,224,210,0.28)";
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(fx + (FRAME_W / 3) * i, fy); ctx.lineTo(fx + (FRAME_W / 3) * i, fy + FRAME_H);
      ctx.moveTo(fx, fy + (FRAME_H / 3) * i); ctx.lineTo(fx + FRAME_W, fy + (FRAME_H / 3) * i);
      ctx.stroke();
    }
  }, [img, zoom, pan, VIEW_W, VIEW_H, FRAME_W, FRAME_H]);

  useEffect(() => { draw(); }, [draw]);

  const confirm = () => {
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = 512;
    out.height = Math.max(1, Math.round(512 / aspect));
    const ctx = out.getContext("2d")!;
    // Map the on-screen frame back into source pixels.
    const w = img.width * zoom, h = img.height * zoom;
    const cx = VIEW_W / 2 + pan.x, cy = VIEW_H / 2 + pan.y;
    const fx = (VIEW_W - FRAME_W) / 2, fy = (VIEW_H - FRAME_H) / 2;
    const sx = (fx - (cx - w / 2)) / zoom;
    const sy = (fy - (cy - h / 2)) / zoom;
    ctx.drawImage(img, sx, sy, FRAME_W / zoom, FRAME_H / zoom, 0, 0, out.width, out.height);
    onConfirm(out);
  };

  return (
    <div className="cropper-scrim" role="dialog" aria-label="Choose the crop"
         onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cropper">
        <h2 className="region-head">Choose the crop<span className="n">{aspect.toFixed(1)}:1</span></h2>
        <canvas
          ref={canvasRef} width={VIEW_W} height={VIEW_H} className="cropper-canvas"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
            (e.target as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPan({ x: drag.current.ox + (e.clientX - drag.current.x),
                     y: drag.current.oy + (e.clientY - drag.current.y) });
          }}
          onPointerUp={() => { drag.current = null; }}
          onWheel={(e) => setZoom((z) => Math.max(0.05, Math.min(12, z * (e.deltaY < 0 ? 1.08 : 0.93))))}
        />
        <div className="field-row">
          <label htmlFor="crop-zoom">Zoom</label>
          <input id="crop-zoom" type="range" min={0.05} max={6} step={0.01}
                 value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </div>
        <div className="field-row">
          <div className="cap-note">
            <span>Drag to move, scroll or use the slider to zoom. The frame is the
                  destination's real shape, so what you see inside it is what the
                  terminal gets.</span>
          </div>
        </div>
        <div className="cropper-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-pen" onClick={confirm} disabled={!img}>Use this crop</button>
        </div>
      </div>
    </div>
  );
}
