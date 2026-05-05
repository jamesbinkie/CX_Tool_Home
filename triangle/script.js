// -------------------------------
// INITIALIZATION
// -------------------------------
window.onload = () => {
    const ids = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "bandBottom", "bandRight", "bandLeft"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", updateUI);
            if (el.tagName === "INPUT") {
                el.addEventListener("input", updateUI);
                el.addEventListener("blur", validateAndClamp);
            }
        }
    });
    updateUI();
};

function updateUI() {
    const type = document.getElementById("type").value;
    const isSym = document.getElementById("isSymmetric").checked;
    
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSym) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSym) ? "flex" : "none";

    refreshHintsAndWarnings();
    drawTriangle();
}

function validateAndClamp() {
    const type = document.getElementById("type").value;
    const isSym = document.getElementById("isSymmetric").checked;
    const minVal = 200;
    const maxW = 2400;
    const maxH = 1200;
    const minRatio = Math.tan(30 * Math.PI / 180); // ~0.577

    if (type !== "standard" || isSym) {
        const wIn = document.getElementById("W");
        const hIn = document.getElementById("H");
        let w = parseFloat(wIn.value) || minVal;
        let h = parseFloat(hIn.value) || minVal;

        // 1. Initial Sheet Boundary Cap
        w = Math.max(minVal, Math.min(w, maxW));
        h = Math.max(minVal, Math.min(h, maxH));

        // 2. Angle Rule Check: atan(H/W) >= 30 and atan(W/H) >= 30
        // This requires H >= W*0.577 AND W >= H*0.577
        
        if (h < w * minRatio) {
            // Height is too small for this Width. 
            // Try to increase Height first.
            h = Math.ceil(w * minRatio);
            // If Height now exceeds sheet limit, we MUST cap Height and reduce Width.
            if (h > maxH) {
                h = maxH;
                w = Math.floor(h / minRatio);
            }
        }
        
        if (w < h * minRatio) {
            // Width is too small for this Height.
            w = Math.ceil(h * minRatio);
            // If Width now exceeds sheet limit, cap Width and reduce Height.
            if (w > maxW) {
                w = maxW;
                h = Math.floor(w / minRatio);
            }
        }

        wIn.value = w;
        hIn.value = h;
    } else {
        const aIn = document.getElementById("sideA");
        const bIn = document.getElementById("sideB");
        const cIn = document.getElementById("sideC");
        let a = parseFloat(aIn.value) || minVal;
        let b = parseFloat(bIn.value) || minVal;
        let c = parseFloat(cIn.value) || minVal;

        a = Math.max(minVal, a);
        b = Math.max(minVal, b);
        c = Math.max(minVal, Math.min(c, maxW));

        // Basic Triangle Inequality Fix: Ensure it remains a drawable triangle
        if (a + b <= c) {
            const needed = c + 10;
            const current = a + b;
            const factor = needed / current;
            a = Math.round(a * factor);
            b = Math.round(b * factor);
        }

        aIn.value = a;
        bIn.value = b;
        cIn.value = c;
    }
    updateUI();
}

function refreshHintsAndWarnings() {
    const pts = getPoints();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);

    // Sheet Warning (Internal geometry check)
    document.getElementById("sheetWarning").style.display = (w > 2400 || h > 1200) ? "block" : "none";

    // Angle Warning
    const angles = calculateAngles(pts);
    const isBanding = document.getElementById("bandBottom").checked || 
                     document.getElementById("bandRight").checked || 
                     document.getElementById("bandLeft").checked;
    document.getElementById("safetyWarning").style.display = (angles.some(a => a < 30) && isBanding) ? "block" : "none";
}

// -------------------------------
// GEOMETRY & RENDERING
// -------------------------------
function getPoints() {
    const type = document.getElementById("type").value;
    const W = parseFloat(document.getElementById("W").value) || 200;
    const H = parseFloat(document.getElementById("H").value) || 200;
    const isSym = document.getElementById("isSymmetric").checked;

    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    if (isSym) return [[0, H], [W, H], [W / 2, 0]];

    const a = parseFloat(document.getElementById("sideA").value) || 200;
    const b = parseFloat(document.getElementById("sideB").value) || 200;
    const c = parseFloat(document.getElementById("sideC").value) || 200;

    if (a + b <= c) return [[0, 100], [c, 100], [c/2, 0]];

    const x = (a * a + c * c - b * b) / (2 * c);
    const y = Math.sqrt(Math.max(0, a * a - x * x));
    return [[0, y], [c, y], [x, 0]];
}

function calculateAngles(pts) {
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p0 = pts[(i + 2) % 3], p2 = pts[(i + 1) % 3];
        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] }, v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag = Math.sqrt(v1.x**2 + v1.y**2) * Math.sqrt(v2.x**2 + v2.y**2);
        angles.push(Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * (180 / Math.PI));
    }
    return angles;
}

function drawTriangle() {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const pts = getPoints();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const shapeW = maxX - minX, shapeH = maxY - minY;

    const margin = 150;
    const scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - minX * scale;
    const offY = (canvas.height - shapeH * scale) / 2 - minY * scale;

    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.stroke();

    const offsetPx = 12;
    const poly = computeOffsetPolygonEdges(pts, scale, offX, offY, offsetPx);
    ctx.lineWidth = 3; ctx.strokeStyle = "red";
    
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

function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const link = document.createElement("a");
    link.download = (document.getElementById("fileName").value || "triangle") + ".png";
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
    link.download = (document.getElementById("fileName").value || "triangle") + ".dxf";
    link.click();
}
