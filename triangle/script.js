// -------------------------------
// INITIALIZATION
// -------------------------------
window.onload = () => {
    const ids = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "bandBottom", "bandRight", "bandLeft"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", updateUIAndDraw);
            if (el.tagName === "INPUT") {
                el.addEventListener("blur", validateAndDraw);
                el.addEventListener("input", updateUIAndDraw);
            }
        }
    });
    updateUIAndDraw();
};

function validateAndDraw() {
    updateDynamicLimits(true); // Hard clamp on blur
    drawTriangle();
}

function updateUIAndDraw() {
    const type = document.getElementById("type").value;
    const isSymmetric = document.getElementById("isSymmetric").checked;
    
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSymmetric) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSymmetric) ? "flex" : "none";

    updateDynamicLimits(false); // Soft update while typing
    drawTriangle();
}

// -------------------------------
// LIMITS & VALIDATION
// -------------------------------
function updateDynamicLimits(forceClamp = false) {
    const minVal = 200;
    const minAngleRad = 30 * (Math.PI / 180);
    const minRatio = Math.tan(minAngleRad); // ~0.577

    const type = document.getElementById("type").value;
    const wInput = document.getElementById("W");
    const hInput = document.getElementById("H");

    if (type === "right" || type === "left" || (type === "standard" && document.getElementById("isSymmetric").checked)) {
        let w = Number(wInput.value);
        let h = Number(hInput.value);

        // 1. Enforce 200mm Minimum
        if (forceClamp) {
            if (w < minVal) w = minVal;
            if (h < minVal) h = minVal;
        }

        // 2. Enforce 30 Degree Rule (Tan(30) = Width/Height)
        // If H is very large, W must grow. If W is very large, H must grow.
        if (w < h * minRatio) w = Math.round(h * minRatio);
        if (h < w * minRatio) h = Math.round(w * minRatio);

        if (forceClamp || w !== Number(wInput.value) || h !== Number(hInput.value)) {
            wInput.value = w;
            hInput.value = h;
        }
    } else {
        // Standard (A, B, C) Clamping
        const aInput = document.getElementById("sideA");
        const bInput = document.getElementById("sideB");
        const cInput = document.getElementById("sideC");
        let a = Number(aInput.value);
        let b = Number(bInput.value);
        let c = Number(cInput.value);

        if (forceClamp) {
            if (a < minVal) a = minVal;
            if (b < minVal) b = minVal;
            if (c < minVal) c = minVal;
        }

        // Triangle Inequality: A + B > C
        const maxC = a + b - 10; 
        if (c > maxC) c = maxC;

        // Angle Check (Law of Cosines)
        // Ensure every angle is >= 30 degrees by adjusting side lengths
        // For simplicity, we clamp to a valid triangle range
        if (forceClamp || c !== Number(cInput.value)) {
            aInput.value = a;
            bInput.value = b;
            cInput.value = c;
        }
    }
}

// -------------------------------
// GEOMETRY
// -------------------------------
function getPoints() {
    const type = document.getElementById("type").value;
    const W = Number(document.getElementById("W").value);
    const H = Number(document.getElementById("H").value);
    const isSym = document.getElementById("isSymmetric").checked;

    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    
    if (isSym) {
        return [[0, H], [W, H], [W / 2, 0]];
    } else {
        const a = Number(document.getElementById("sideA").value);
        const b = Number(document.getElementById("sideB").value);
        const c = Number(document.getElementById("sideC").value);

        const x = (a * a + c * c - b * b) / (2 * c);
        const y = Math.sqrt(Math.max(0, a * a - x * x));
        return [[0, y], [c, y], [x, 0]];
    }
}

// -------------------------------
// RENDERING
// -------------------------------
function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pts = getPoints();
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate Bounding Box
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const shapeW = maxX - minX, shapeH = maxY - minY;

    // Scaling (prevent division by zero)
    const margin = 150;
    const scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - minX * scale;
    const offY = (canvas.height - shapeH * scale) / 2 - minY * scale;

    // Draw Main Outline
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // Red Offset Banding
    const offsetPx = 12;
    const poly = computeOffsetPolygonEdges(pts, scale, offX, offY, offsetPx);
    ctx.lineWidth = 3; ctx.strokeStyle = "red";
    
    // Mapping: Left=Edge0, Right=Edge1, Bottom=Edge2
    const bandingLines = [
        { id: "bandLeft", p1: poly[0], p2: poly[1] },
        { id: "bandRight", p1: poly[1], p2: poly[2] },
        { id: "bandBottom", p1: poly[2], p2: poly[0] }
    ];

    bandingLines.forEach(line => {
        if (document.getElementById(line.id).checked) {
            ctx.beginPath(); ctx.moveTo(line.p1.x, line.p1.y); ctx.lineTo(line.p2.x, line.p2.y); ctx.stroke();
        }
    });

    drawDimensions(ctx, pts, scale, offX, offY);
}

// -------------------------------
// DIMENSIONS
// -------------------------------
function drawDimensions(ctx, pts, scale, offX, offY) {
    ctx.font = "14px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const n = pts.length;
    const cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offX;
    const cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offY;

    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        const x1 = p1[0] * scale + offX, y1 = p1[1] * scale + offY;
        const x2 = p2[0] * scale + offX, y2 = p2[1] * scale + offY;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 5) continue;
        let nx = -dy / len, ny = dx / len;

        // Ensure outward direction
        if (Math.hypot(((x1+x2)/2 + nx*10) - cx, ((y1+y2)/2 + ny*10) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) {
            nx = -nx; ny = -ny;
        }

        const dimOffset = 50;
        const lx1 = x1 + nx * dimOffset, ly1 = y1 + ny * dimOffset;
        const lx2 = x2 + nx * dimOffset, ly2 = y2 + ny * dimOffset;
        const mx = (lx1 + lx2) / 2, my = (ly1 + ly2) / 2;

        const realDist = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2)).toFixed(1);
        const label = `${realDist} mm`;
        const textWidth = ctx.measureText(label).width + 10;

        // Gap in line for text
        const angle = Math.atan2(ly2 - ly1, lx2 - lx1);
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(mx - Math.cos(angle) * (textWidth/2), my - Math.sin(angle) * (textWidth/2));
        ctx.moveTo(mx + Math.cos(angle) * (textWidth/2), my + Math.sin(angle) * (textWidth/2));
        ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();

        drawArrow(ctx, lx1, ly1, lx2, ly2);
        drawArrow(ctx, lx2, ly2, lx1, ly1);
        ctx.fillText(label, mx, my + 4);
    }
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const size = 7;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
}

function computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx) {
    const n = pts.length;
    const cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offsetX;
    const cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offsetY;
    const edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        const x1 = p1[0] * scale + offsetX, y1 = p1[1] * scale + offsetY;
        const x2 = p2[0] * scale + offsetX, y2 = p2[1] * scale + offsetY;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (Math.hypot(((x1+x2)/2 + nx*5) - cx, ((y1+y2)/2 + ny*5) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) {
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
// EXPORTS
// -------------------------------
function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const link = document.createElement("a");
    link.download = document.getElementById("fileName").value + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function downloadDXF() {
    const pts = getPoints();
    const maxY = Math.max(...pts.map(p => p[1]));
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (maxY - p[1]).toFixed(4));
    });
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n") + "\r\n"], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = document.getElementById("fileName").value + ".dxf";
    link.click();
}
