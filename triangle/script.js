// -------------------------------
// INITIALIZATION & INPUT CLAMPING
// -------------------------------
window.onload = () => {
    const ids = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "bandBottom", "bandRight", "bandLeft"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener("change", updateUIAndDraw);
        if (el.tagName === "INPUT") {
            el.addEventListener("blur", validateAndDraw);
            el.addEventListener("input", updateUIAndDraw);
        }
    });
    updateUIAndDraw();
};

function validateAndDraw() {
    updateDynamicLimits();
    drawTriangle();
}

function updateUIAndDraw() {
    const type = document.getElementById("type").value;
    const isSymmetric = document.getElementById("isSymmetric").checked;
    
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSymmetric) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSymmetric) ? "flex" : "none";

    updateDynamicLimits();
    drawTriangle();
}

function updateDynamicLimits() {
    const aInput = document.getElementById("sideA");
    const bInput = document.getElementById("sideB");
    const cInput = document.getElementById("sideC");

    let a = Number(aInput.value);
    let b = Number(bInput.value);
    let c = Number(cInput.value);

    // Dynamic capping to ensure a valid triangle (A + B > C)
    const maxC = Math.max(1, a + b - 1);
    const maxA = Math.max(1, b + c - 1);
    const maxB = Math.max(1, a + c - 1);

    document.getElementById("maxA").textContent = maxA;
    document.getElementById("maxB").textContent = maxB;
    document.getElementById("maxC").textContent = maxC;

    // We only clamp on blur to avoid fighting the user while they type
    if (document.activeElement !== aInput && a > maxA) aInput.value = maxA;
    if (document.activeElement !== bInput && b > maxB) bInput.value = maxB;
    if (document.activeElement !== cInput && c > maxC) cInput.value = maxC;
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

        // Law of Cosines for Tip coordinate
        const cosC = (a * a + b * b - c * c) / (2 * a * b); 
        // We use C as base for naming consistency
        const x = (a * a + c * c - b * b) / (2 * c);
        const y = Math.sqrt(Math.max(0, a * a - x * x));
        return [[0, y], [c, y], [x, 0]];
    }
}

// -------------------------------
// DRAWING
// -------------------------------
function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const pts = getPoints();
    
    // Calculate angles for safety check
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p0 = pts[(i + 2) % 3], p2 = pts[(i + 1) % 3];
        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] }, v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag = Math.sqrt(v1.x**2 + v1.y**2) * Math.sqrt(v2.x**2 + v2.y**2);
        angles.push(Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * (180 / Math.PI));
    }

    const isBanding = document.getElementById("bandBottom").checked || document.getElementById("bandRight").checked || document.getElementById("bandLeft").checked;
    document.getElementById("safetyWarning").style.display = (angles.some(a => a < 30) && isBanding) ? "block" : "none";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const margin = 140;
    const scale = Math.min((canvas.width - margin * 2) / (maxX - minX || 1), (canvas.height - margin * 2) / (maxY - minY || 1));
    const offX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    // Main Shape
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.stroke();

    // Corrected Mapping: Left edge is Bottom, Bottom is Left
    // Edge 0: Bottom-Left to Bottom-Right (pts[0] to pts[1])
    // Edge 1: Bottom-Right to Tip (pts[1] to pts[2])
    // Edge 2: Tip to Bottom-Left (pts[2] to pts[0])
    const offsetPx = 10;
    const poly = computeOffsetPolygonEdges(pts, scale, offX, offY, offsetPx);
    
    ctx.lineWidth = 3; ctx.strokeStyle = "red";
    const bandingLines = [
        { id: "bandLeft", p1: poly[0], p2: poly[1] },   // Segment 0: User wants this to be "Left"
        { id: "bandRight", p1: poly[1], p2: poly[2] },  // Segment 1: User says this is correct
        { id: "bandBottom", p1: poly[2], p2: poly[0] }  // Segment 2: User wants this to be "Bottom"
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

// -------------------------------
// DIMENSIONS WITH TEXT BREAK
// -------------------------------
function drawDimensions(ctx, pts, scale, offX, offY) {
    ctx.font = "14px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const n = pts.length;
    const cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offX;
    const cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offY;

    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % 3];
        const x1 = p1[0] * scale + offX, y1 = p1[1] * scale + offY;
        const x2 = p2[0] * scale + offX, y2 = p2[1] * scale + offY;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        let nx = -dy / len, ny = dx / len;

        // Push outward
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

        // Draw dimension line with a gap for the text
        const angle = Math.atan2(ly2 - ly1, lx2 - lx1);
        const gap = textWidth / 2;
        
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(mx - Math.cos(angle) * gap, my - Math.sin(angle) * gap);
        ctx.moveTo(mx + Math.cos(angle) * gap, my + Math.sin(angle) * gap);
        ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();

        drawArrow(ctx, lx1, ly1, lx2, ly2);
        drawArrow(ctx, lx2, ly2, lx1, ly1);

        ctx.fillText(label, mx, my);
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
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = (document.getElementById("fileName").value || "triangle") + ".dxf";
    link.click();
}
