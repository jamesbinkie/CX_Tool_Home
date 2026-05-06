window.onload = () => {
    const ids = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "bandBottom", "bandRight", "bandLeft"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => { updateUI(); });
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => { updateUI(); }); // Draw only, no value changes
                el.addEventListener("blur", validateAndClamp);      // Hard fix on click-out
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
    const minVal = 200, sheetW = 2400, sheetH = 1200;

    if (type !== "standard" || isSym) {
        const wIn = document.getElementById("W"), hIn = document.getElementById("H");
        let w = parseFloat(wIn.value) || minVal, h = parseFloat(hIn.value) || minVal;

        // Strict Sheet Boundaries ONLY
        w = Math.max(minVal, Math.min(w, sheetW));
        h = Math.max(minVal, Math.min(h, sheetW));
        if (w > sheetH) h = Math.min(h, sheetH);
        else if (h > sheetH) w = Math.min(w, sheetH);

        wIn.value = Math.round(w); hIn.value = Math.round(h);
    } else {
        const aIn = document.getElementById("sideA"), bIn = document.getElementById("sideB"), cIn = document.getElementById("sideC");
        let a = parseFloat(aIn.value) || minVal, b = parseFloat(bIn.value) || minVal, c = parseFloat(cIn.value) || minVal;
        a = Math.max(minVal, a); b = Math.max(minVal, b); c = Math.max(minVal, Math.min(c, sheetW));
        if (a + b <= c) { a = Math.round(c * 0.6); b = Math.round(c * 0.6); }
        aIn.value = a; bIn.value = b; cIn.value = c;
    }
    updateUI();
}

function refreshHintsAndWarnings() {
    const pts = getPoints();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);

    const wVal = parseFloat(document.getElementById("W").value), hVal = parseFloat(document.getElementById("H").value);
    if (document.getElementById("rangeW")) {
        document.getElementById("rangeW").textContent = `Min 200 — Max ${hVal > 1200 ? 1200 : 2400} mm`;
        document.getElementById("rangeH").textContent = `Min 200 — Max ${wVal > 1200 ? 1200 : 2400} mm`;
    }

    document.getElementById("sheetWarning").style.display = (Math.max(w, h) > 2400 || Math.min(w, h) > 1200) ? "block" : "none";
    const angles = calculateAngles(pts);
    const isBanding = document.getElementById("bandBottom").checked || document.getElementById("bandRight").checked || document.getElementById("bandLeft").checked;
    document.getElementById("safetyWarning").style.display = (angles.some(a => a < 30) && isBanding) ? "block" : "none";
}

function getPoints() {
    const type = document.getElementById("type").value, W = parseFloat(document.getElementById("W").value) || 200, H = parseFloat(document.getElementById("H").value) || 200, isSym = document.getElementById("isSymmetric").checked;
    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    if (isSym) return [[0, H], [W, H], [W/2, 0]];
    const a = parseFloat(document.getElementById("sideA").value) || 200, b = parseFloat(document.getElementById("sideB").value) || 200, c = parseFloat(document.getElementById("sideC").value) || 200;
    if (a + b <= c) return [[0, 100], [c, 100], [c/2, 0]];
    const x = (a * a + c * c - b * b) / (2 * c), y = Math.sqrt(Math.max(0, a * a - x * x));
    return [[0, y], [c, y], [x, 0]];
}

function calculateAngles(pts) {
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p0 = pts[(i + 2) % 3], p2 = pts[(i + 1) % 3];
        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] }, v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };
        const dot = v1.x * v2.x + v1.y * v2.y, mag = Math.sqrt(v1.x**2 + v1.y**2) * Math.sqrt(v2.x**2 + v2.y**2);
        angles.push(Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * (180 / Math.PI));
    }
    return angles;
}

function drawTriangle() {
    const canvas = document.getElementById("canvas"), ctx = canvas.getContext("2d"), pts = getPoints();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const shapeW = maxX - minX, shapeH = maxY - minY, margin = 150;
    const scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - minX * scale, offY = (canvas.height - shapeH * scale) / 2 - minY * scale;
    ctx.beginPath(); ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath(); ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.stroke();
    const poly = computeOffsetPolygonEdges(pts, scale, offX, offY, 12);
    ctx.lineWidth = 3; ctx.strokeStyle = "red";
    const bands = [{ id: "bandRight", p1: poly[0], p2: poly[1] }, { id: "bandLeft", p1: poly[1], p2: poly[2] }, { id: "bandBottom", p1: poly[2], p2: poly[0] }];
    bands.forEach(line => { if (document.getElementById(line.id).checked) { ctx.beginPath(); ctx.moveTo(line.p1.x, line.p1.y); ctx.lineTo(line.p2.x, line.p2.y); ctx.stroke(); } });
    drawDimensions(ctx, pts, scale, offX, offY, maxY);
}

function computeOffsetPolygonEdges(pts, scale, offsetX, offsetY, offsetPx) {
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offsetX, cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offsetY, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n], x1 = p1[0] * scale + offsetX, y1 = p1[1] * scale + offsetY, x2 = p2[0] * scale + offsetX, y2 = p2[1] * scale + offsetY;
        const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len, ny = dx / len;
        if (Math.hypot(((x1+x2)/2 + nx*5) - cx, ((y1+y2)/2 + ny*5) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) { nx = -nx; ny = -ny; }
        edges.push({ x1: x1 + nx * offsetPx, y1: y1 + ny * offsetPx, x2: x2 + nx * offsetPx, y2: y2 + ny * offsetPx });
    }
    return edges.map((e, i) => intersectLines(e, edges[(i + 1) % n]));
}

function intersectLines(e1, e2) {
    const { x1, y1, x2, y2 } = e1, { x1: x3, y1: y3, x2: x4, y2: y4 } = e2, denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return { x: x2, y: y2 };
    return { x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom, y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom };
}

function drawDimensions(ctx, pts, scale, offX, offY) {
    ctx.font = "14px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offX, cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offY;
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n], x1 = p1[0] * scale + offX, y1 = p1[1] * scale + offY, x2 = p2[0] * scale + offX, y2 = p2[1] * scale + offY;
        const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 5) continue;
        let nx = -dy / len, ny = dx / len;
        if (Math.hypot(((x1+x2)/2 + nx*10) - cx, ((y1+y2)/2 + ny*10) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) { nx = -nx; ny = -ny; }
        const dimOffset = 60, lx1 = x1 + nx * dimOffset, ly1 = y1 + ny * dimOffset, lx2 = x2 + nx * dimOffset, ly2 = y2 + ny * dimOffset, mx = (lx1 + lx2) / 2, my = (ly1 + ly2) / 2;
        const label = `${Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2)).toFixed(1)} mm`, textWidth = ctx.measureText(label).width + 15, angle = Math.atan2(ly2 - ly1, lx2 - lx1);
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(mx - Math.cos(angle) * (textWidth/2), my - Math.sin(angle) * (textWidth/2)); ctx.moveTo(mx + Math.cos(angle) * (textWidth/2), my + Math.sin(angle) * (textWidth/2)); ctx.lineTo(lx2, ly2); ctx.strokeStyle = "#444"; ctx.lineWidth = 1.2; ctx.stroke();
        const size = 8; ctx.beginPath(); ctx.moveTo(lx2, ly2); ctx.lineTo(lx2 - size * Math.cos(angle - Math.PI / 6), ly2 - size * Math.sin(angle - Math.PI / 6)); ctx.lineTo(lx2 - size * Math.cos(angle + Math.PI / 6), ly2 - size * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
        ctx.fillText(label, mx, my + 4);
    }
}

function downloadPNG() {
    const canvas = document.getElementById("canvas"), tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext("2d"); tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tctx.drawImage(canvas, 0, 0);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "triangle") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const pts = getPoints(), maxY = Math.max(...pts.map(p => p[1]));
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (maxY - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n") + "\r\n"], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "triangle") + ".dxf"; link.click();
}
