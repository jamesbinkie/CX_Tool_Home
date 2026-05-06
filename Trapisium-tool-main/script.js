// -------------------------------
// INITIALIZATION
// -------------------------------
function setupInputs() {
  const ids = ["A", "B", "C", "D", "type", "bandTop", "bandRight", "bandBottom", "bandLeft"];
  ids.forEach(id => {
      const el = document.getElementById(id);
      if (el.tagName === "INPUT" && el.type === "number") {
          // Input event only updates the visual labels and the drawing
          el.addEventListener("input", () => { 
            refreshMaxLabels(); 
            drawTrapezium(); 
          });
          // Blur event performs the hard safety clamping in the text boxes
          el.addEventListener("blur", validateAndClamp);
      } else {
          el.addEventListener("change", () => { 
            refreshMaxLabels(); 
            drawTrapezium(); 
          });
      }
  });
  refreshMaxLabels(); 
  drawTrapezium();
}

/**
 * Updates the "Max X mm" text under the inputs based on current values.
 */
function refreshMaxLabels() {
    const Bv = parseFloat(document.getElementById("B").value) || 50;
    const Cv = parseFloat(document.getElementById("C").value) || 20;
    const Av = parseFloat(document.getElementById("A").value) || 100;

    // Update dynamic UI labels
    document.getElementById("CmaxLabel").textContent = Math.max(20, Bv - 1);
    document.getElementById("DmaxLabel").textContent = Math.max(0, Bv - Cv);
}

/**
 * Performs strict sheet size and geometry validation.
 * Runs only when the user clicks out of a text box.
 */
function validateAndClamp() {
    const sheetW = 2400;
    const sheetH = 1200;
    
    const aIn = document.getElementById("A");
    const bIn = document.getElementById("B");
    const cIn = document.getElementById("C");
    const dIn = document.getElementById("D");

    let a = parseFloat(aIn.value) || 100;
    let b = parseFloat(bIn.value) || 50;
    let c = parseFloat(cIn.value) || 20;
    let d = parseFloat(dIn.value) || 0;

    // 1. Enforce Sheet Limits (2400 x 1200)
    // Either A or B can be 2400, but if one exceeds 1200, the other must stay at 1200
    a = Math.max(100, Math.min(a, sheetW));
    b = Math.max(50, Math.min(b, sheetW));

    if (a > sheetH) b = Math.min(b, sheetH);
    else if (b > sheetH) a = Math.min(a, sheetH);

    // 2. Enforce Trapezium Geometry
    c = Math.max(20, Math.min(c, b - 1));
    d = Math.max(0, Math.min(d, b - c));

    // Update the actual text box values
    aIn.value = Math.round(a);
    bIn.value = Math.round(b);
    cIn.value = Math.round(c);
    dIn.value = Math.round(d);

    refreshMaxLabels(); 
    drawTrapezium();
}

window.onload = setupInputs;

// -------------------------------
// DRAWING LOGIC
// -------------------------------
function drawTrapezium(targetCanvas = null) {
  const canvas = targetCanvas || document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const type = document.getElementById("type").value;
  const A = parseFloat(document.getElementById("A").value) || 100;
  const B = parseFloat(document.getElementById("B").value) || 50;
  const C = parseFloat(document.getElementById("C").value) || 20;
  const D = parseFloat(document.getElementById("D").value) || 0;

  let pts;
  if (type === "regular") {
    const offset = (B - C) / 2;
    pts = [[offset, 0], [offset + C, 0], [B, A], [0, A]];
  } else if (type === "right") {
    pts = [[0, 0], [C, 0], [B, A], [0, A]];
  } else {
    pts = [[D, 0], [D + C, 0], [B, A], [0, A]];
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const shapeWidth = maxX - minX, shapeHeight = maxY - minY;

  const margin = Math.max(150, canvas.height * 0.25);
  const scaleX = (canvas.width - margin * 2) / (shapeWidth || 1);
  const scaleY = (canvas.height - margin * 2) / (shapeHeight || 1);
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (canvas.width - shapeWidth * scale) / 2 - minX * scale;
  const offsetY = (canvas.height - shapeHeight * scale) / 2 - minY * scale;

  // Draw Outline
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * scale + offsetX, pts[0][1] * scale + offsetY);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0] * scale + offsetX, pts[i][1] * scale + offsetY);
  }
  ctx.closePath();
  ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900));
  ctx.strokeStyle = "#000";
  ctx.stroke();

  drawDimensions(ctx, pts, scale, offsetX, offsetY);
  drawBanding(ctx, pts, scale, offsetX, offsetY);
}

// -------------------------------
// DIMENSIONS
// -------------------------------
function drawDimensions(ctx, pts, scale, offsetX, offsetY) {
  const TL = pts[0], TR = pts[1], BR = pts[2], BL = pts[3];

  drawDimLine(
    ctx,
    TL[0] * scale + offsetX, TL[1] * scale + offsetY,
    TR[0] * scale + offsetX, TR[1] * scale + offsetY,
    `${Number((TR[0] - TL[0]).toFixed(2))} mm`,
    "above"
  );

  drawDimLine(
    ctx,
    BL[0] * scale + offsetX, BL[1] * scale + offsetY,
    BR[0] * scale + offsetX, BR[1] * scale + offsetY,
    `${Number((BR[0] - BL[0]).toFixed(2))} mm`,
    "below"
  );

  const TLs = TL[0] * scale + offsetX;
  const BLs = BL[0] * scale + offsetX;
  const shapeLeft = Math.min(TLs, BLs);
  
  const scaleFactor = ctx.canvas.width / 900;
  const dimOffset = 20 * scaleFactor;
  const spaceLeft = shapeLeft; 
  const spaceRight = ctx.canvas.width - Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX);
  
  let dimX;
  let position = (spaceRight > spaceLeft) ? "right" : "left";
  dimX = (position === "right") ? Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX) + dimOffset : shapeLeft - dimOffset;
  
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

  let lineX1 = x1, lineY1 = y1, lineX2 = x2, lineY2 = y2;
  if (position === "above") { lineY1 -= offset; lineY2 -= offset; }
  else if (position === "below") { lineY1 += offset; lineY2 += offset; }
  else if (position === "left") { lineX1 -= offset; lineX2 -= offset; }
  else if (position === "right") { lineX1 += offset; lineX2 += offset; }

  ctx.beginPath();
  ctx.moveTo(lineX1, lineY1);
  ctx.lineTo(lineX2, lineY2);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = Math.max(1, 1.2 * scaleFactor);
  ctx.stroke();

  drawArrow(ctx, lineX1, lineY1, lineX2, lineY2);
  drawArrow(ctx, lineX2, lineY2, lineX1, lineY1);

  ctx.textAlign = (position === "left") ? "right" : (position === "right" ? "left" : "center");
  ctx.textBaseline = (position === "below") ? "top" : (position === "above" ? "bottom" : "middle");

  let textX = (lineX1 + lineX2) / 2;
  let textY = (lineY1 + lineY2) / 2;
  if (position === "above") textY -= textOffset;
  else if (position === "below") textY += textOffset;
  else if (position === "left") textX -= textOffset;
  else if (position === "right") textX += textOffset;

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
  ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6));
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

  const bands = [
    { id: "bandTop", p1: poly[3], p2: poly[0] },
    { id: "bandRight", p1: poly[0], p2: poly[1] },
    { id: "bandBottom", p1: poly[1], p2: poly[2] },
    { id: "bandLeft", p1: poly[2], p2: poly[3] }
  ];

  ctx.strokeStyle = "red";
  ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900));

  bands.forEach(band => {
    if (document.getElementById(band.id).checked) {
      ctx.beginPath();
      ctx.moveTo(band.p1.x, band.p1.y);
      ctx.lineTo(band.p2.x, band.p2.y);
      ctx.stroke();
    }
  });
}

function computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx) {
  const n = pts.length;
  const edges = [];
  for (let i = 0; i < n; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const x1 = p1[0] * scale + offsetX, y1 = p1[1] * scale + offsetY;
    const x2 = p2[0] * scale + offsetX, y2 = p2[1] * scale + offsetY;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = -dy / len, ny = dx / len;
    const cx = pts.reduce((sum, p) => sum + p[0], 0) / n * scale + offsetX;
    const cy = pts.reduce((sum, p) => sum + p[1], 0) / n * scale + offsetY;
    if (Math.hypot(((x1 + x2) / 2 + nx * 10) - cx, ((y1 + y2) / 2 + ny * 10) - cy) < Math.hypot((x1 + x2) / 2 - cx, (y1 + y2) / 2 - cy)) {
      nx = -nx; ny = -ny;
    }
    edges.push({ x1: x1 + nx * offsetPx, y1: y1 + ny * offsetPx, x2: x2 + nx * offsetPx, y2: y2 + ny * offsetPx });
  }
  return edges.map((e, i) => intersectLines(e, edges[(i + 1) % n]));
}

function intersectLines(e1, e2) {
  const { x1, y1, x2, y2 } = e1, { x1: x3, y1: y3, x2: x4, y2: y4 } = e2;
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return { x: x2, y: y2 };
  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
  };
}

// -------------------------------
// EXPORT FUNCTIONS
// -------------------------------
function downloadPNG() {
  const name = document.getElementById("fileName").value || "trapezium";
  const screenCanvas = document.getElementById("canvas");
  const scaleFactor = Math.max(1, 4096 / Math.max(screenCanvas.width, screenCanvas.height));
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = screenCanvas.width * scaleFactor;
  tempCanvas.height = screenCanvas.height * scaleFactor;
  
  drawTrapezium(tempCanvas);
  const bbox = getCanvasBoundingBox(tempCanvas);
  const padX = Math.round(bbox.w * 0.1), padY = Math.round(bbox.h * 0.1);
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = bbox.w + padX * 2; finalCanvas.height = bbox.h + padY * 2;
  const fctx = finalCanvas.getContext("2d");

  // PURE WHITE BACKGROUND
  fctx.fillStyle = "#ffffff"; 
  fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  
  fctx.drawImage(tempCanvas, bbox.x, bbox.y, bbox.w, bbox.h, padX, padY, bbox.w, bbox.h);
  const link = document.createElement("a");
  link.download = name + ".png"; link.href = finalCanvas.toDataURL("image/png"); link.click();
}

function getCanvasBoundingBox(canvas) {
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] !== 0) {
        found = true; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : { x: 0, y: 0, w: canvas.width, h: canvas.height };
}

function downloadDXF() {
  const name = document.getElementById("fileName").value || "trapezium";
  const type = document.getElementById("type").value;
  const A = Number(document.getElementById("A").value), B = Number(document.getElementById("B").value), C = Number(document.getElementById("C").value), D = Number(document.getElementById("D").value);
  let pts = (type === "regular") ? [[(B - C) / 2, 0], [(B - C) / 2 + C, 0], [B, A], [0, A]] : (type === "right" ? [[0, 0], [C, 0], [B, A], [0, A]] : [[D, 0], [D + C, 0], [B, A], [0, A]]);
  const maxY = Math.max(...pts.map(p => p[1])), maxX = Math.max(...pts.map(p => p[0]));
  let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 62", "7", " 70", "1", " 66", "1"];
  pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(6), " 20", (maxY - p[1]).toFixed(6), " 70", "0"));
  dxf.push("  0", "SEQEND", "  8", "0", "  0", "ENDSEC", "  0", "EOF");
  const blob = new Blob([dxf.join("\r\n") + "\r\n"], { type: "application/dxf" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = name + ".dxf"; link.click();
}
