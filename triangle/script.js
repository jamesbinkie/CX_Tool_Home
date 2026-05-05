// -------------------------------
// GEOMETRY CALCULATION
// -------------------------------
function getPoints() {
    const type = document.getElementById("type").value;
    const W = Math.max(1, Number(document.getElementById("W").value));
    const H = Math.max(1, Number(document.getElementById("H").value));
    const isSymmetric = document.getElementById("isSymmetric").checked;

    // Returns points in Counter-Clockwise order
    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    
    if (isSymmetric) {
        return [[0, H], [W, H], [W / 2, 0]];
    } else {
        const a = Math.max(1, Number(document.getElementById("sideA").value));
        const b = Math.max(1, Number(document.getElementById("sideB").value));
        const c = Math.max(1, Number(document.getElementById("sideC").value));
        
        // Triangle Inequality Check: If impossible, return a default safe triangle
        if (a + b <= c || a + c <= b || b + c <= a) return [[0, 100], [100, 100], [50, 0]]; 

        const x = (b * b + c * c - a * a) / (2 * c);
        const y = Math.sqrt(Math.max(0, b * b - x * x));
        // Points: Bottom-Left, Bottom-Right, Tip
        return [[0, y], [c, y], [c - x, 0]];
    }
}

function calculateAngles(pts) {
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p0 = pts[(i + 2) % 3], p2 = pts[(i + 1) % 3];
        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] };
        const v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        angles.push(Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * (180 / Math.PI));
    }
    return angles;
}

// -------------------------------
// DRAWING LOGIC
// -------------------------------
function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pts = getPoints();
    const angles = calculateAngles(pts);
    const isAnyBanding = document.getElementById("bandBottom").checked || 
                         document.getElementById("bandRight").checked || 
                         document.getElementById("bandLeft").checked;

    // Safety Warning
    const safetyWarning = document.getElementById("safetyWarning");
    if (safetyWarning) {
        safetyWarning.style.display = (angles.some(a => a < 30) && isAnyBanding) ? "block" : "none";
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate Scale and Centering
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const margin = 140;
    const scale = Math.min((canvas.width - margin * 2) / (maxX - minX || 1), (canvas.height - margin * 2) / (maxY - minY || 1));
    const offX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    // Draw Main Shape
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // Offset Banding (Red Lines)
    const offsetPx = 10;
    const poly = computeOffsetPolygonEdges(pts, scale, offX, offY, offsetPx);
    ctx.strokeStyle = "red"; ctx.lineWidth = 3;
    const bands = [
        { id: "bandBottom", p1: poly[0], p2: poly[1] },
        { id: "bandRight", p1: poly[1], p2: poly[2] },
        { id: "bandLeft", p1: poly[2], p2: poly[0] }
    ];
    bands.forEach(band => {
        if (document.getElementById(band.id).checked) {
            ctx.beginPath(); ctx.moveTo(band.p1.x, band.p1.y); ctx.lineTo(band.p2.x, band.p2.y); ctx.stroke();
        }
    });

    // Highlight Sharp Corners
    if (isAnyBanding) {
        angles.forEach((a, i) => {
            if (a < 30) {
                ctx.beginPath(); ctx.arc(pts[i][0] * scale + offX, pts[i][1] * scale + offY, 15, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 0, 0, 0.3)"; ctx.fill();
            }
        });
    }

    drawDimensions(ctx, pts, scale, offX, offY);
}

// Helper to compute outward-offset points for banding
function computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx) {
    const n = pts.length;
    const edges = [];
    const cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offsetX;
    const cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offsetY;

    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        const x1 = p1[0] * scale + offsetX, y1 = p1[1] * scale + offsetY;
        const x2 = p2[0] * scale + offsetX, y2 = p2[1] * scale + offsetY;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len, ny = dx / len;

        // Ensure normal points away from centroid
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
// DIMENSIONS
// -------------------------------
function drawDimensions(ctx, pts, scale, offX, offY) {
    ctx.font = "14px Arial"; ctx.fillStyle = "#000";
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

        // Centroid check for dimensions
        if (Math.hypot(((x1+x2)/2 + nx*10) - cx, ((y1+y2)/2 + ny*10) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) {
            nx = -nx; ny = -ny;
        }

        const dimOffset = 40;
        const lx1 = x1 + nx * dimOffset, ly1 = y1 + ny * dimOffset;
        const lx2 = x2 + nx * dimOffset, ly2 = y2 + ny * dimOffset;

        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(lx2, ly2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
        drawArrow(ctx, lx1, ly1, lx2, ly2);
        drawArrow(ctx, lx2, ly2, lx1, ly1);

        const realDist = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2));
        ctx.save();
        ctx.translate((lx1 + lx2) / 2 + nx * 18, (ly1 + ly2) / 2 + ny * 18);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`${realDist.toFixed(1)} mm`, 0, 0);
        ctx.restore();
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

// -------------------------------
// EXPORT
// -------------------------------
function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const name = document.getElementById("fileName").value || "triangle";
    const link = document.createElement("a");
    link.download = name + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function downloadDXF() {
    const pts = getPoints();
    const name = document.getElementById("fileName").value || "triangle";
    const maxY = Math.max(...pts.map(p => p[1]));
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (maxY - p[1]).toFixed(4));
    });
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n") + "\r\n"], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name + ".dxf";
    link.click();
}
