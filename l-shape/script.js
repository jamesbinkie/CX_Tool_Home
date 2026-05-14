let highlightedCorner = -1;
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];

function getEdgeNames() {
    const isLeft = document.getElementById("type").value === "left";
    return isLeft ? ["Bottom", "Left Leg", "Inner Top", "Inner Right", "Top", "Right Side"] : ["Bottom", "Right Leg", "Inner Top", "Inner Left", "Top", "Left Side"];
}

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT" && el.type === "number") {
                el.addEventListener("input", () => { drawLShape(); });
                el.addEventListener("blur", (e) => { validateAndClamp(e); updateUI(); });
            } else {
                el.addEventListener("change", () => { validateAndClamp(null); updateUI(); });
            }
        }
    });
    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawLShape(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawLShape(); });
    });
    window.addEventListener("resize", drawLShape);
    updateUI();
};

function updateUI() { refreshHintsAndWarnings(); updateBandingUI(getRadii()); validateRadii(); drawLShape(); }

function validateAndClamp(e = null) {
    const minVal = 200, sheetW = 2400, sheetH = 1200, twIn = document.getElementById("totalW"), thIn = document.getElementById("totalH"), lwIn = document.getElementById("legW"), lhIn = document.getElementById("legH");
    let tw = parseFloat(twIn.value) || minVal, th = parseFloat(thIn.value) || minVal, lw = parseFloat(lwIn.value) || minVal, lh = parseFloat(lhIn.value) || minVal;
    tw = Math.max(minVal, Math.min(tw, sheetW)); th = Math.max(minVal, Math.min(th, sheetW));
    if (tw > sheetH) th = Math.min(th, sheetH); else if (th > sheetH) tw = Math.min(tw, sheetH);
    lw = Math.max(minVal, Math.min(lw, tw - 50)); lh = Math.max(minVal, Math.min(lh, th - 50));
    twIn.value = Math.round(tw); thIn.value = Math.round(th); lwIn.value = Math.round(lw); lhIn.value = Math.round(lh);

    const sideLengths = [tw, lh, (tw - lw), (th - lh), lw, th]; let conflict = false;
    for (let i = 0; i < 6; i++) {
        const r1In = document.getElementById(`rad${i}`), r2In = document.getElementById(`rad${(i + 1) % 6}`);
        let r1 = parseFloat(r1In.value) || 0, r2 = parseFloat(r2In.value) || 0;
        if ((r1 + r2) > sideLengths[i]) {
            conflict = true;
            if (e && e.target === r1In) { r1In.value = Math.max(0, Math.floor(sideLengths[i] - r2)); } 
            else if (e && e.target === r2In) { r2In.value = Math.max(0, Math.floor(sideLengths[i] - r1)); } 
            else { const factor = sideLengths[i] / (r1 + r2 + 0.1); r1In.value = Math.floor(r1 * factor); r2In.value = Math.floor(r2 * factor); }
        }
    }
    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
}

function getRadii() { return [parseFloat(document.getElementById("rad0").value) || 0, parseFloat(document.getElementById("rad1").value) || 0, parseFloat(document.getElementById("rad2").value) || 0, parseFloat(document.getElementById("rad3").value) || 0, parseFloat(document.getElementById("rad4").value) || 0, parseFloat(document.getElementById("rad5").value) || 0]; }

function validateRadii() {
    let conflict = false; const radii = getRadii();
    for (let i = 0; i < 6; i++) {
        let rEl = document.getElementById(`rad${i}`), val = parseFloat(rEl.value) || 0;
        if (val === 0) continue;
        let isBanded = false;
        currentSections.forEach((sec, sIdx) => { const cb = document.getElementById(`bandSec${sIdx}`); if (cb && cb.checked && (sec.includes(i) || sec.includes((i + 5) % 6))) isBanded = true; });
        if (isBanded && val > 0 && val < 50) { rEl.value = 50; conflict = true; }
    }
    if (conflict) { document.getElementById("radiusWarning").style.display = "block"; validateAndClamp(); }
}

function refreshHintsAndWarnings() {
    const A = parseFloat(document.getElementById("totalW").value) || 200, B = parseFloat(document.getElementById("totalH").value) || 200;
    document.getElementById("sheetWarning").style.display = (Math.max(A, B) > 2400 || Math.min(A, B) > 1200) ? "block" : "none";
    document.getElementById("rangeA").textContent = `Min 200 — Max ${B > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeB").textContent = `Min 200 — Max ${A > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeC").textContent = `Min 200 — Max ${A - 50} mm`;
    document.getElementById("rangeD").textContent = `Min 200 — Max ${B - 50} mm`;
}

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000, B = parseFloat(document.getElementById("totalH").value) || 800, C = parseFloat(document.getElementById("legW").value) || 300, D = parseFloat(document.getElementById("legH").value) || 300, isLeft = document.getElementById("type").value === "left";
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

function intersectLines(l1, l2) {
    const denom = (l1.x1 - l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 - l2.x2);
    if (Math.abs(denom) < 0.0001) return { x: l1.x2, y: l1.y2 };
    return { x: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.x1 - l2.x2) - (l1.x1 - l1.x2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom, y: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom };
}

function generatePathData(pts, offset, radii, scale, offX, offY, B_height) {
    const n = pts.length; let area = 0;
    const cPts = pts.map(p => ({ x: p[0] * scale + offX, y: (B_height - p[1]) * scale + offY }));
    for (let i = 0; i < n; i++) area += cPts[i].x * cPts[(i + 1) % n].y - cPts[(i + 1) % n].x * cPts[i].y;
    const CW = area > 0 ? 1 : -1, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = cPts[i], p2 = cPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({ vx, vy, nx, ny, offL: { x1: p1.x + nx * offset, y1: p1.y + ny * offset, x2: p2.x + nx * offset, y2: p2.y + ny * offset } });
    }
    const corners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i], C_off = intersectLines(ePrev.offL, eNext.offL), r = radii[i] * scale;
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, isConvex = (cross * CW) > 0, R_off = isConvex ? r + offset : r - offset;
        R_off = Math.max(0, R_off); if (r === 0) R_off = 0;
        let d = 0;
        if (R_off > 0) { let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy, alpha = Math.atan2(cross, dot); d = R_off * Math.abs(Math.tan(alpha / 2)); }
        let arcStart = { x: C_off.x - ePrev.vx * d, y: C_off.y - ePrev.vy * d }, arcEnd = { x: C_off.x + eNext.vx * d, y: C_off.y + eNext.vy * d };
        corners.push({ C_off, R_off, r_orig: radii[i], arcStart, arcEnd });
    }
    return { corners, edges };
}

function updateBandingUI(radii) {
    const n = radii.length; let startIdx = 0;
    for (let i = 0; i < n; i++) if (radii[i] === 0) { startIdx = i; break; }
    let sections = []; let currSec = [];
    for (let step = 0; step < n; step++) {
        let edgeIdx = (startIdx + step) % n; currSec.push(edgeIdx);
        let nextCorner = (edgeIdx + 1) % n;
        if (radii[nextCorner] === 0 || step === n - 1) { sections.push(currSec); currSec = []; }
    }
    const container = document.getElementById("dynamic-banding-controls");
    if (JSON.stringify(currentSections) === JSON.stringify(sections) && container.children.length > 0) return;
    let oldEdgeBanded = new Array(n).fill(true);
    if (currentSections.length > 0 && container.children.length > 0) {
        currentSections.forEach((sec, sIdx) => { const cb = document.getElementById(`bandSec${sIdx}`); let isChecked = cb ? cb.checked : true; sec.forEach(edge => oldEdgeBanded[edge] = isChecked); });
    }
    currentSections = sections; const edgeNames = getEdgeNames();
    let html = `<label style="display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length], names = sec.map(e => edgeNames[e]).join(" + "), shouldCheck = sec.some(edge => oldEdgeBanded[edge]);
        html += `<label style="display: flex; align-items: center; gap: 5px; border-left: 4px solid ${color}; padding-left: 8px;"><input type="checkbox" class="band-sec" id="bandSec${idx}" ${shouldCheck ? "checked" : ""}> ${names}</label>`;
    });
    container.innerHTML = html;
    const allCb = document.getElementById("bandAll"), secCbs = document.querySelectorAll(".band-sec");
    allCb.checked = Array.from(secCbs).every(c => c.checked);
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawLShape(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawLShape(); }); });
}

function drawLShape(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) { canvas.width = rect.width; canvas.height = rect.height; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const pts = getPoints(), radii = getRadii(), A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value);
    const margin = Math.min(canvas.width, canvas.height) * 0.15, scale = Math.min((canvas.width - margin * 2) / A, (canvas.height - margin * 2) / B), offX = (canvas.width - A * scale) / 2, offY = (canvas.height - B * scale) / 2, n = 6;
    const baseData = generatePathData(pts, 0, radii, scale, offX, offY, B), crns = baseData.corners;

    ctx.beginPath(); ctx.moveTo(crns[0].arcStart.x, crns[0].arcStart.y);
    for (let i = 0; i < n; i++) {
        let c = crns[i];
        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y);
        ctx.lineTo(crns[(i + 1) % n].arcStart.x, crns[(i + 1) % n].arcStart.y);
    }
    ctx.closePath(); ctx.lineWidth = Math.max(2, 3 * (canvas.width / 1200)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bandData = generatePathData(pts, 12 * (canvas.width / 1200), radii, scale, offX, offY, B), bCrns = bandData.corners;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath(); ctx.strokeStyle = bandingColors[sIdx % bandingColors.length]; ctx.lineWidth = 5 * (canvas.width / 1200);
                if (sec.length === n) {
                    ctx.moveTo(bCrns[0].arcStart.x, bCrns[0].arcStart.y);
                    for (let i = 0; i < n; i++) {
                        let c = bCrns[i];
                        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y);
                        ctx.lineTo(bCrns[(i + 1) % n].arcStart.x, bCrns[(i + 1) % n].arcStart.y);
                    }
                    ctx.closePath();
                } else {
                    let firstEdge = sec[0]; ctx.moveTo(bCrns[firstEdge].arcEnd.x, bCrns[firstEdge].arcEnd.y);
                    sec.forEach((edgeIdx, idx) => {
                        let c = bCrns[(edgeIdx + 1) % n];
                        ctx.lineTo(c.arcStart.x, c.arcStart.y);
                        if (idx < sec.length - 1) { if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y); }
                    });
                }
                ctx.stroke();
            }
        });
    }
    drawLDimensions(ctx, scale, offX, offY, B);
    if (highlightedCorner !== -1 && !targetCanvas) {
        const cp = crns[highlightedCorner]; ctx.beginPath(); ctx.arc(cp.C_off.x, cp.C_off.y, 20, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function drawLDimensions(ctx, scale, offX, offY, th) {
    const scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1;
    ctx.font = `bold ${Math.max(12, 16 * scaleFactor)}px Segoe UI, Arial`; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value), C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value), isLeft = document.getElementById("type").value === "left";
    
    const drawDim = (x1, y1, x2, y2, label) => {
        const angle = Math.atan2(y2 - y1, x2 - x1), textWidth = ctx.measureText(label).width + (15 * scaleFactor), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx - Math.cos(angle)*(textWidth/2), my - Math.sin(angle)*(textWidth/2)); ctx.moveTo(mx + Math.cos(angle)*(textWidth/2), my + Math.sin(angle)*(textWidth/2)); ctx.lineTo(x2, y2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5 * scaleFactor; ctx.stroke();
        const s = 10 * scaleFactor; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s*Math.cos(angle-Math.PI/6), y2 - s*Math.sin(angle-Math.PI/6)); ctx.lineTo(x2 - s*Math.cos(angle+Math.PI/6), y2 - s*Math.sin(angle+Math.PI/6)); ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
        ctx.fillText(label, mx, my + (5 * scaleFactor));
    };
    
    const off = 55 * scaleFactor;
    drawDim(offX, offY + th*scale + off, offX + A*scale, offY + th*scale + off, `A: ${A}mm`);
    const bX = isLeft ? offX + A*scale + (55 * scaleFactor) : offX - (55 * scaleFactor);
    drawDim(bX, offY + th*scale, bX, offY, `B: ${B}mm`);
    const cX = isLeft ? offX + A*scale : offX, cX2 = isLeft ? offX + A*scale - C*scale : offX + C*scale;
    drawDim(cX, offY - (25 * scaleFactor), cX2, offY - (25 * scaleFactor), `C: ${C}mm`);
    const dX = isLeft ? offX - (55 * scaleFactor) : offX + A*scale + (55 * scaleFactor);
    drawDim(dX, offY + th*scale, dX, offY + th*scale - D*scale, `D: ${D}mm`);
}

function getDXFPolyline(layer, vertices, isClosed) {
    let dxf = ["  0", "POLYLINE", "  8", layer, " 66", "1", " 70", isClosed ? "1" : "0"];
    vertices.forEach(p => { dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(4), " 20", p.y.toFixed(4), " 42", (p.bulge || 0).toFixed(8)); });
    dxf.push("  0", "SEQEND", "  8", layer); return dxf;
}

function computeDXFVertices(pts, radii, offset = 0) {
    const n = pts.length, dxfCorners = [];
    let area = 0; for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
    const CW = area > 0 ? 1 : -1, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({ vx, vy, nx, ny, offL: { x1: p1.x + nx * offset, y1: p1.y + ny * offset, x2: p2.x + nx * offset, y2: p2.y + ny * offset } });
    }
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i], C_off = intersectLines(ePrev.offL, eNext.offL), r = radii[i];
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy, alpha = Math.atan2(cross, dot), isConvex = (cross * CW) > 0, R_off = isConvex ? r + offset : r - offset;
        R_off = Math.max(0, R_off); if (r === 0) R_off = 0;
        if (R_off > 0) {
            let d = R_off * Math.abs(Math.tan(alpha / 2)), bulge = Math.tan(alpha / 4);
            if (!isConvex) bulge = -bulge;
            dxfCorners.push({ start: { x: C_off.x - ePrev.vx * d, y: C_off.y - ePrev.vy * d, bulge: bulge }, end: { x: C_off.x + eNext.vx * d, y: C_off.y + eNext.vy * d, bulge: 0 } });
        } else { dxfCorners.push({ start: { x: C_off.x, y: C_off.y, bulge: 0 }, end: { x: C_off.x, y: C_off.y, bulge: 0 } }); }
    }
    return dxfCorners;
}

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); 
    tempCanvas.width = 3840; tempCanvas.height = 2160;
    const tctx = tempCanvas.getContext("2d"); 
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawLShape(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "l_shape") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints(), radii = getRadii(), maxY = Math.max(...rawPts.map(p => p[1])), pts = rawPts.map(p => ({ x: p[0], y: maxY - p[1] })), n = pts.length;
    const baseCorners = computeDXFVertices(pts, radii, 0), bandCorners = computeDXFVertices(pts, radii, 12);
    let shapePts = [];
    baseCorners.forEach(c => { shapePts.push(c.start); if (c.start.x !== c.end.x || c.start.y !== c.end.y) shapePts.push(c.end); });
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "TABLES", "  0", "TABLE", "  2", "LAYER", " 70", "2", "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"];
    dxf = dxf.concat(getDXFPolyline("Shape", shapePts, true));
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked) {
            if (sec.length === n) { 
                let bPts = []; bandCorners.forEach(c => { bPts.push(c.start); if (c.start.x !== c.end.x || c.start.y !== c.end.y) bPts.push(c.end); });
                dxf = dxf.concat(getDXFPolyline("Edge_Banding", bPts, true)); 
            } else {
                let secPts = [], firstEdge = sec[0], prevCorner = (firstEdge + n - 1) % n;
                secPts.push(bandCorners[prevCorner].end);
                for (let i = 0; i < sec.length; i++) {
                    let nextCorner = (sec[i] + 1) % n, c = bandCorners[nextCorner];
                    secPts.push(c.start);
                    if (i < sec.length - 1 && (c.start.x !== c.end.x || c.start.y !== c.end.y)) secPts.push(c.end);
                }
                dxf = dxf.concat(getDXFPolyline("Edge_Banding", secPts, false));
            }
        }
    });
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
