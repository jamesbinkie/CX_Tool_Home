// -------------------------------
// INPUT VALIDATION + LIVE LOGIC
// -------------------------------

function setupInputs() {
  const A = document.getElementById("A");
  const B = document.getElementById("B");
  const C = document.getElementById("C");
  const D = document.getElementById("D");
  const type = document.getElementById("type");

  function clampOnBlur(input, min, max) {
    input.addEventListener("blur", () => {
      if (input.value === "") input.value = min;
      input.value = clamp(input.value, min, max);
      updateDynamicLimits();
      drawTrapezium();
    });
  }

  clampOnBlur(A, 100, 2440);
  clampOnBlur(B, 50, 1220);

  C.addEventListener("blur", () => {
    const maxC = Math.max(20, Number(B.value) - 1);
    let val = Number(C.value);
    if (isNaN(val) || val === "") val = 20;
    val = Math.max(20, Math.min(val, maxC));
    C.value = val;
    updateDynamicLimits();
    drawTrapezium();
  });

  D.addEventListener("blur", () => {
    const maxD = Math.max(0, Number(B.value) - Number(C.value));
    let val = Number(D.value);
    if (isNaN(val) || val === "") val = 0;
    val = Math.max(0, Math.min(val, maxD));
    D.value = val;
    updateDynamicLimits();
    drawTrapezium();
  });

  type.addEventListener("change", () => {
    const Dlabel = document.getElementById("Dlabel");
    Dlabel.style.display = type.value === "irregular" ? "flex" : "none";
    updateDynamicLimits();
    drawTrapezium();
  });

  document.querySelectorAll("#bandTop,#bandRight,#bandBottom,#bandLeft")
    .forEach(cb => cb.addEventListener("change", drawTrapezium));

  B.addEventListener("input", () => {
    updateDynamicLimits();
    drawTrapezium();
  });

  updateDynamicLimits();
  drawTrapezium();
}

function clamp(value, min, max) {
  value = Number(value);
  if (isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function updateDynamicLimits() {
  const Bv = Number(document.getElementById("B").value);
  const C = document.getElementById("C");
  const D = document.getElementById("D");

  const maxC = Math.max(20, Bv - 1);
  let Cv = Number(C.value);
  if (isNaN(Cv) || Cv === "") Cv = 20;
  Cv = Math.max(20, Math.min(Cv, maxC));
  C.value = Cv;
  document.getElementById("CmaxLabel").textContent = maxC;

  const maxD = Math.max(0, Bv - Cv);
  let Dv = Number(D.value);
  if (isNaN(Dv) || D.value === "") Dv = 0;
  Dv = Math.max(0, Math.min(Dv, maxD));
  D.value = Dv;
  document.getElementById("DmaxLabel").textContent = maxD;
}

window.onload = setupInputs;

// -------------------------------
// DRAWING (accepts optional canvas for exporting)
// -------------------------------

function drawTrapezium(targetCanvas = null) {
  const canvas = targetCanvas || document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const type = document.getElementById("type").value;
  const A = Number(document.getElementById("A").value);
  const B = Number(document.getElementById("B").value);
  const C = Number(document.getElementById("C").value);
  const D = Number(document.getElementById("D").value);

  let pts;
  if (type === "regular") {
    const offset = (B - C) / 2;
    pts = [[offset, 0], [offset + C, 0], [B, A], [0, A]];
  } else if (type === "right") {
    pts = [[0, 0], [C, 0], [B, A], [0, A]];
  } else {
    pts = [[D, 0], [D + C, 0], [B, A], [0, A]];
  }

  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // compute extents & scale
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const shapeWidth = maxX - minX, shapeHeight = maxY - minY;

  const margin = Math.max(150, canvas.height * 0.25);
  const safeShapeWidth = shapeWidth === 0 ? 1 : shapeWidth;
  const safeShapeHeight = shapeHeight === 0 ? 1 : shapeHeight;

  const scaleX = (canvas.width - margin * 2) / safeShapeWidth;
  const scaleY = (canvas.height - margin * 2) / safeShapeHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (canvas.width - safeShapeWidth * scale) / 2 - minX * scale;
  const offsetY = (canvas.height - safeShapeHeight * scale) / 2 - minY * scale;

  // draw trapezium
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * scale + offsetX, pts[0][1] * scale + offsetY);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0] * scale + offsetX, pts[i][1] * scale + offsetY);
  }
  ctx.closePath();
  ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900));
  ctx.strokeStyle = "#000";
  ctx.stroke();

  // draw dimensions and banding
  drawDimensions(ctx, pts, scale, offsetX, offsetY);
  drawBanding(ctx, pts, scale, offsetX, offsetY);
}

// -------------------------------
// DIMENSIONS
// -------------------------------

function drawDimensions(ctx, pts, scale, offsetX, offsetY) {
  const TL = pts[0], TR = pts[1], BR = pts[2], BL = pts[3];

  // Top
  drawDimLine(
    ctx,
    TL[0] * scale + offsetX, TL[1] * scale + offsetY,
    TR[0] * scale + offsetX, TR[1] * scale + offsetY,
    `${Number((TR[0] - TL[0]).toFixed(2))} mm`,
    "above"
  );

  // Bottom
  drawDimLine(
    ctx,
    BL[0] * scale + offsetX, BL[1] * scale + offsetY,
    BR[0] * scale + offsetX, BR[1] * scale + offsetY,
    `${Number((BR[0] - BL[0]).toFixed(2))} mm`,
    "below"
  );

  // Left or right (height) — choose side dynamically
  const TLs = TL[0] * scale + offsetX;
  const TRs = TR[0] * scale + offsetX;
  const BLs = BL[0] * scale + offsetX;
  const BRs = BR[0] * scale + offsetX;
  
  const shapeLeft = Math.min(TLs, BLs);
  const shapeRight = Math.max(TRs, BRs);
  
  const scaleFactor = ctx.canvas.width / 900;
  const dimOffset = 20 * scaleFactor;
  
  // Distances to canvas edges
  const spaceLeft = shapeLeft; 
  const spaceRight = ctx.canvas.width - shapeRight;
  
  // Choose side with more space
  let dimX;
  let position = "left";
  
  if (spaceRight > spaceLeft) {
    dimX = shapeRight + dimOffset;
    position = "right";
  } else {
    dimX = shapeLeft - dimOffset;
    position = "left";
  }
  
  drawDimLine(
    ctx,
    dimX, TL[1] * scale + offsetY,
    dimX, BL[1] * scale + offsetY,
    `${Number((BL[1] - TL[1]).toFixed(2))} mm`,
    position
  );
}

function drawDimLine(ctx, x1, y1, x2, y2, label, position) {
  const scaleFactor = ctx.canvas.width / 900;

  const offset = 20 * scaleFactor;
  const textOffset = 12 * scaleFactor;
  ctx.font = Math.max(10, 18 * scaleFactor) + "px Arial";

  let lineX1 = x1, lineY1 = y1;
  let lineX2 = x2, lineY2 = y2;

  if (position === "above") { lineY1 -= offset; lineY2 -= offset; }
  else if (position === "below") { lineY1 += offset; lineY2 += offset; }
  else if (position === "left") { lineX1 -= offset; lineX2 -= offset; }

  ctx.beginPath();
  ctx.moveTo(lineX1, lineY1);
  ctx.lineTo(lineX2, lineY2);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = Math.max(1, 1.2 * scaleFactor);
  ctx.stroke();

  drawArrow(ctx, lineX1, lineY1, lineX2, lineY2);
  drawArrow(ctx, lineX2, lineY2, lineX1, lineY1);

  const midX = (lineX1 + lineX2) / 2;
  const midY = (lineY1 + lineY2) / 2;

  ctx.textAlign = position === "left" ? "right" : "center";
  ctx.textBaseline = position === "below" ? "top" : "middle";

  let textX = midX;
  let textY = midY;

  if (position === "above") textY -= textOffset;
  else if (position === "below") textY += textOffset;
  else if (position === "left") textX -= textOffset;

  ctx.fillStyle = "#000";
  ctx.fillText(label, textX, textY);
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const scaleFactor = ctx.canvas.width / 900;
  const size = 8 * scaleFactor;
  const arrowOffset = 6 * scaleFactor;

  const angle = Math.atan2(y2 - y1, x2 - x1);

  const tipX = x2 + arrowOffset * Math.cos(angle);
  const tipY = y2 + arrowOffset * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - size * Math.cos(angle - Math.PI / 6),
    tipY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    tipX - size * Math.cos(angle + Math.PI / 6),
    tipY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = "#000";
  ctx.fill();
}

// -------------------------------
// EDGE BANDING
// -------------------------------

function drawBanding(ctx, pts, scale, offsetX, offsetY) {
  const offsetPx = Math.max(8, Math.min(ctx.canvas.width, ctx.canvas.height) / 120);

  const poly = computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx);
  if (!poly || poly.length !== 4) return;

  const bandTop = document.getElementById("bandTop").checked;
  const bandRight = document.getElementById("bandRight").checked;
  const bandBottom = document.getElementById("bandBottom").checked;
  const bandLeft = document.getElementById("bandLeft").checked;

  ctx.strokeStyle = "red";
  ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900));

  if (bandTop) {
    ctx.beginPath();
    ctx.moveTo(poly[3].x, poly[3].y);
    ctx.lineTo(poly[0].x, poly[0].y);
    ctx.stroke();
  }

  if (bandRight) {
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    ctx.lineTo(poly[1].x, poly[1].y);
    ctx.stroke();
  }

  if (bandBottom) {
    ctx.beginPath();
    ctx.moveTo(poly[1].x, poly[1].y);
    ctx.lineTo(poly[2].x, poly[2].y);
    ctx.stroke();
  }

  if (bandLeft) {
    ctx.beginPath();
    ctx.moveTo(poly[2].x, poly[2].y);
    ctx.lineTo(poly[3].x, poly[3].y);
    ctx.stroke();
  }
}

function computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx) {
  const n = pts.length;
  const edges = [];

  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];

    const x1 = p1[0] * scale + offsetX;
    const y1 = p1[1] * scale + offsetY;
    const x2 = p2[0] * scale + offsetX;
    const y2 = p2[1] * scale + offsetY;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const cx = pts.reduce((sum, p) => sum + p[0], 0) / n * scale + offsetX;
    const cy = pts.reduce((sum, p) => sum + p[1], 0) / n * scale + offsetY;
    const testX = midX + nx * 10;
    const testY = midY + ny * 10;
    if (Math.hypot(testX - cx, testY - cy) < Math.hypot(midX - cx, midY - cy)) {
      nx = -nx;
      ny = -ny;
    }

    edges.push({
      x1: x1 + nx * offsetPx,
      y1: y1 + ny * offsetPx,
      x2: x2 + nx * offsetPx,
      y2: y2 + ny * offsetPx
    });
  }

  const poly = [];
  for (let i = 0; i < n; i++) {
    poly.push(intersectLines(edges[i], edges[(i + 1) % n]));
  }
  return poly;
}

function intersectLines(e1, e2) {
  const { x1, y1, x2, y2 } = e1;
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = e2;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return { x: x2, y: y2 };
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  return { x: px, y: py };
}

// -------------------------------
// EXPORT FUNCTIONS
// -------------------------------

// High-res PNG export: dynamic ultra-resolution, max 4K, 10% padding, no clipping
function downloadPNG() {
  const name = document.getElementById("fileName").value || "trapezium";

  const screenCanvas = document.getElementById("canvas");
  const baseW = screenCanvas.width;
  const baseH = screenCanvas.height;

  const maxDim = 4096;
  const scaleFactor = Math.max(1, maxDim / Math.max(baseW, baseH));

  const exportW = Math.round(baseW * scaleFactor);
  const exportH = Math.round(baseH * scaleFactor);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = exportW;
  tempCanvas.height = exportH;

  const tctx = tempCanvas.getContext("2d");
  tctx.clearRect(0, 0, exportW, exportH);

  drawTrapezium(tempCanvas);

  const bbox = getCanvasBoundingBox(tempCanvas);

  const padX = Math.round(bbox.w * 0.10);
  const padY = Math.round(bbox.h * 0.10);

  const finalW = bbox.w + padX * 2;
  const finalH = bbox.h + padY * 2;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = finalW;
  finalCanvas.height = finalH;
  const fctx = finalCanvas.getContext("2d");

  fctx.fillStyle = "#f3efe3";
  fctx.fillRect(0, 0, finalW, finalH);

  fctx.drawImage(
    tempCanvas,
    bbox.x, bbox.y, bbox.w, bbox.h,
    padX, padY, bbox.w, bbox.h
  );

  const link = document.createElement("a");
  link.download = name + ".png";
  link.href = finalCanvas.toDataURL("image/png");
  link.click();
}

// Bounding box helper: finds non-transparent extents
function getCanvasBoundingBox(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] !== 0) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: width, h: height };

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

// DXF export (unchanged)
function downloadDXF() {
  const name = document.getElementById("fileName").value || "trapezium";
  const type = document.getElementById("type").value;
  const A = Number(document.getElementById("A").value);
  const B = Number(document.getElementById("B").value);
  const C = Number(document.getElementById("C").value);
  const D = Number(document.getElementById("D").value);

  let pts;
  if (type === "regular") {
    const offset = (B - C) / 2;
    pts = [[offset, 0], [offset + C, 0], [B, A], [0, A]];
  } else if (type === "right") {
    pts = [[0, 0], [C, 0], [B, A], [0, A]];
  } else {
    pts = [[D, 0], [D + C, 0], [B, A], [0, A]];
  }

  const maxY = Math.max(...pts.map(p => p[1]));
  const maxX = Math.max(...pts.map(p => p[0]));

  // Illustrator is extremely sensitive to the leading space " 0" vs "0"
  // and the specific order of the header variables.
  let dxfLines = [
    "  0", "SECTION",
    "  2", "HEADER",
    "  9", "$ACADVER",
    "  1", "AC1009",
    "  9", "$EXTMIN",
    " 10", "0",
    " 20", "0",
    "  9", "$EXTMAX",
    " 10", maxX.toString(),
    " 20", maxY.toString(),
    "  0", "ENDSEC",
    "  0", "SECTION",
    "  2", "ENTITIES",
    "  0", "POLYLINE",
    "  8", "0",
    " 62", "7",
    " 70", "1", // 1 = Closed polyline
    " 66", "1"
  ];

  pts.forEach(p => {
    const x = p[0];
    const y = maxY - p[1];
    dxfLines.push(
      "  0", "VERTEX",
      "  8", "0",
      " 10", x.toFixed(6),
      " 20", y.toFixed(6),
      " 70", "0"
    );
  });

  dxfLines.push(
    "  0", "SEQEND",
    "  8", "0",
    "  0", "ENDSEC",
    "  0", "EOF"
  );

  // Join with CRLF and ensure a final newline
  const dxfString = dxfLines.join("\r\n") + "\r\n";

  const blob = new Blob([dxfString], { type: "application/dxf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name + ".dxf";
  link.click();
}
