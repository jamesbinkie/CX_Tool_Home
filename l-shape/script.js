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
                el.addEventListener("blur", (e) => { validateAndClamp(); updateUI(); });
            } else {
                el.addEventListener("change", () => { validateAndClamp(); updateUI(); });
            }
        }
    });
    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawLShape(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawLShape(); });
    });
    
    new ResizeObserver(() => {
        requestAnimationFrame(() => drawLShape());
    }).observe(document.getElementById("canvas"));
    
    updateUI();
};

function updateUI() { refreshHintsAndWarnings(); updateBandingUI(getRadii()); validateRadii(); drawLShape(); }

function validateAndClamp() {
    const minVal = 200, sheetW = 2400, sheetH = 1200, twIn = document.getElementById("totalW"), thIn = document.getElementById("totalH"), lwIn = document.getElementById("legW"), lhIn = document.getElementById("legH");
    let tw = parseFloat(twIn.value) || minVal, th = parseFloat(thIn.value) || minVal, lw = parseFloat(lwIn.value) || minVal, lh = parseFloat(lhIn.value) || minVal;
    tw = Math.max(minVal, Math.min(tw, sheetW)); th = Math.max(minVal, Math.min(th, sheetW));
    if (tw > sheetH) th = Math.min(th, sheetH); else if (th > sheetH) tw = Math.min(tw, sheetH);
    lw = Math.max(minVal, Math.min(lw, tw - 50)); lh = Math.max(minVal, Math.min(lh, th - 50));
    twIn.value = Math.round(tw); thIn.value = Math.round(th); lwIn.value = Math.round(lw); lhIn.value = Math.round(lh);
}

function getRadii() { return [parseFloat(document.getElementById("rad0").value) || 0, parseFloat(document.getElementById("rad1").value) || 0, parseFloat(document.getElementById("rad2").value) || 0, parseFloat(document.getElementById("rad3").value) || 0, parseFloat(document.getElementById("rad4").value) || 0, parseFloat(document.getElementById("rad5").value) || 0]; }

function validateRadii() {
    let conflict = false; 
    const radii = getRadii();
    const pts = getPoints();
    const n = pts.length;
    let changed = false;

    let edges = [];
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    const CW = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        let vx = p2[0] - p1[0], vy = p2[1] - p1[1], len = Math.hypot(vx, vy) || 1;
        edges.push({ vx: vx/len, vy: vy/len, len });
    }

    let alphas = [];
    for (let i = 0; i < n; i++) {
        let ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
        alphas.push(Math.abs(Math.tan(Math.atan2(cross, dot) / 2)));
    }

    for (let iter = 0; iter < 10; iter++) {
        let clamped = false;
        for (let i = 0; i < n; i++) {
            let r1 = radii[i], r2 = radii[(i + 1) % n];
            let d1 = r1 * alphas[i], d2 = r2 * alphas[(i + 1) % n];
            let len = edges[i].len;
            if (d1 + d2 > len) {
                let factor = len / (d1 + d2 + 0.1);
                radii[i] *= factor; radii[(i + 1) % n] *= factor;
                clamped = true; changed = true;
            }
        }
        if (!clamped) break;
    }

    if (changed) {
        for (let i = 0; i < n; i++) document.getElementById(`rad${i}`).value = Math.floor(radii[i]);
    }

    const finalRadii = getRadii();
    for (let i = 0; i < n; i++) {
        let val = finalRadii[i];
        if (val === 0) continue;
        let isBanded = false;
        currentSections.forEach((sec, sIdx) => { 
            const cb = document.getElementById(`bandSec${sIdx}`); 
            if (cb && cb.checked && (sec.includes(i) || sec.includes((i + n - 1) % n))) isBanded = true; 
        });
        if (isBanded && val > 0 && val < 50) { 
            document.getElementById(`rad${i}`).value = 50; 
            conflict = true; 
        }
    }
    document.getElementById("radiusWarning").style.display = (conflict || changed) ? "block" : "none";
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
        let d = 0, arcMid = { x: C_off.x, y: C_off.y }, arcStart = C_off, arcEnd = C_off;
        if (R_off > 0) { 
            let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy, alpha = Math.atan2(cross, dot); 
            d = R_off * Math.abs(Math.tan(alpha / 2)); 
            arcStart = { x: C_off.x - ePrev.vx * d, y: C_off.y - ePrev.vy * d };
            arcEnd = { x: C_off.x + eNext.vx * d, y: C_off.y + eNext.vy * d };
            let sign = Math.sign(cross) || 1, nx = -ePrev.vy * sign, ny = ePrev.vx * sign;
            let cx = arcStart.x + nx * R_off, cy = arcStart.y + ny * R_off;
            let vX = C_off.x - cx, vY = C_off.y - cy, vLen = Math.hypot(vX, vY) || 1;
            arcMid = { x: cx + (vX / vLen) * R_off, y: cy + (vY / vLen) * R_off };
        }
        corners.push({ C_off, R_off, r_orig: radii[i], arcStart, arcEnd, arcMid });
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
    
    let html = `<label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    
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
        const cp = crns[highlightedCorner]; ctx.beginPath(); ctx.arc(cp.arcMid.x, cp.arcMid.y, 20, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
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

function getDXFEntities(pts, radii, offset, layer, isClosed, edgeMask) {
    const n = pts.length; let area = 0;
    for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
    const CW = area > 0 ? 1 : -1, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({ vx, vy, nx, ny, offL: { x1: p1.x + nx * offset, y1: p1.y + ny * offset, x2: p2.x + nx * offset, y2: p2.y + ny * offset } });
    }
    let corners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        const C_off = intersectLines(ePrev.offL, eNext.offL), r = radii[i];
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy, alpha = Math.atan2(cross, dot), isConvex = (cross * CW) > 0, R_off = isConvex ? r + offset : r - offset;
        R_off = Math.max(0, R_off); if (r === 0) R_off = 0;
        let arcStart = C_off, arcEnd = C_off, d = 0;
        if (R_off > 0) {
            d = R_off * Math.abs(Math.tan(alpha / 2));
            arcStart = { x: C_off.x - ePrev.vx * d, y: C_off.y - ePrev.vy * d };
            arcEnd = { x: C_off.x + eNext.vx * d, y: C_off.y + eNext.vy * d };
        }
        corners.push({ C_off, R_off, arcStart, arcEnd, cross });
    }
    let dxf = [];
    const pushLine = (p1, p2) => {
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) < 0.0001) return;
        dxf.push("  0", "LINE", "  8", layer, " 10", p1.x.toFixed(4), " 20", p1.y.toFixed(4), " 11", p2.x.toFixed(4), " 21", p2.y.toFixed(4));
    };
    const pushArc = (cIdx) => {
        let corner = corners[cIdx];
        if (corner.R_off <= 0.0001) return;
        let p1 = corner.arcStart, p2 = corner.arcEnd;
        let ePrev = edges[(cIdx + n - 1) % n], n1 = { x1: p1.x, y1: p1.y, x2: p1.x - ePrev.vy, y2: p1.y + ePrev.vx };
        let eNext = edges[cIdx], n2 = { x1: p2.x, y1: p2.y, x2: p2.x - eNext.vy, y2: p2.y + eNext.vx };
        let center = intersectLines(n1, n2);
        let startAng = Math.atan2(p1.y - center.y, p1.x - center.x) * 180 / Math.PI, endAng = Math.atan2(p2.y - center.y, p2.x - center.x) * 180 / Math.PI;
        if (startAng < 0) startAng += 360; if (endAng < 0) endAng += 360;
        let a1 = startAng, a2 = endAng;
        if (corner.cross < 0) { a1 = endAng; a2 = startAng; }
        dxf.push("  0", "ARC", "  8", layer, " 10", center.x.toFixed(4), " 20", center.y.toFixed(4), " 40", corner.R_off.toFixed(4), " 50", a1.toFixed(4), " 51", a2.toFixed(4));
    };
    if (isClosed) {
        for (let i = 0; i < n; i++) { pushLine(corners[i].arcEnd, corners[(i + 1) % n].arcStart); pushArc((i + 1) % n); }
    } else {
        for (let i = 0; i < edgeMask.length; i++) {
            let edgeIdx = edgeMask[i]; pushLine(corners[edgeIdx].arcEnd, corners[(edgeIdx + 1) % n].arcStart);
            if (i < edgeMask.length - 1) pushArc((edgeIdx + 1) % n);
        }
    }
    return dxf;
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
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "TABLES", "  0", "TABLE", "  2", "LAYER", " 70", "2", "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"];
    
    dxf = dxf.concat(getDXFEntities(pts, radii, 0, "Shape", true, null));
    
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked) {
            if (sec.length === n) { 
                dxf = dxf.concat(getDXFEntities(pts, radii, 12, "Edge_Banding", true, null)); 
            } else {
                dxf = dxf.concat(getDXFEntities(pts, radii, 12, "Edge_Banding", false, sec));
            }
        }
    });
    
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
