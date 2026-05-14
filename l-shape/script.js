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

function isCornerBanded(i, n) {
    let isBanded = false;
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked && (sec.includes(i) || sec.includes((i + n - 1) % n))) isBanded = true;
    });
    return isBanded;
}

function validateRadii() {
    let conflict = false; 
    let changed = false;
    const radii = getRadii();
    const pts = getPoints();
    const n = pts.length;
    
    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;
    
    let maxR3 = Math.min(C, D) - 1;
    if (radii[3] > maxR3) { radii[3] = Math.floor(maxR3); changed = true; }
    
    let maxR0 = (C + D) - Math.sqrt(2 * C * D);
    if (radii[0] > maxR0) { radii[0] = Math.floor(maxR0); changed = true; }
    
    for (let i = 0; i < n; i++) {
        if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 50) { 
            radii[i] = 50; 
            conflict = true; 
        }
    }

    let edges = [];
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
            let minR1 = (r1 > 0 && isCornerBanded(i, n)) ? 50 : 0;
            let minR2 = (r2 > 0 && isCornerBanded((i + 1) % n, n)) ? 50 : 0;
            
            let d1 = r1 * alphas[i], d2 = r2 * alphas[(i + 1) % n];
            let len = edges[i].len;
            if (d1 + d2 > len + 0.001) {
                let excess = (d1 + d2) - len;
                let flex1 = d1 - (minR1 * alphas[i]), flex2 = d2 - (minR2 * alphas[(i + 1) % n]);
                if (flex1 < 0) flex1 = 0; if (flex2 < 0) flex2 = 0;
                
                if (flex1 + flex2 > 0) {
                    let f1 = flex1 / (flex1 + flex2), f2 = flex2 / (flex1 + flex2);
                    d1 -= excess * f1; d2 -= excess * f2;
                } else {
                    d1 = minR1 * alphas[i]; d2 = minR2 * alphas[(i + 1) % n];
                }
                radii[i] = d1 / (alphas[i] || 1); radii[(i + 1) % n] = d2 / (alphas[(i + 1) % n] || 1);
                clamped = true; changed = true;
            }
        }
        if (!clamped) break;
    }

    if (changed || conflict) {
        for (let i = 0; i < n; i++) document.getElementById(`rad${i}`).value = Math.floor(radii[i]);
    }
    
    const warnEl = document.getElementById("radiusWarning");
    warnEl.style.display = (conflict || changed) ? "block" : "none";
    if (conflict) warnEl.innerHTML = "⚠️ Radii adjusted! Banded corners must be 0mm (sharp joint) or 50mm+ radius to flex.";
    else if (changed) warnEl.innerHTML = "⚠️ Radii scaled down to prevent corners overlapping.";
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

function generatePathData(pts, offset, radii, scale = 1, offX = 0, offY = 0) {
    const n = pts.length; let area = 0;
    const sPts = pts.map(p => ({ x: p[0] * scale + offX, y: p[1] * scale + offY }));
    for (let i = 0; i < n; i++) area += sPts[i].x * sPts[(i + 1) % n].y - sPts[(i + 1) % n].x * sPts[i].y;
    const CW = area > 0 ? 1 : -1, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = sPts[i], p2 = sPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({ vx, vy, nx, ny, offL: { x1: p1.x + nx * offset * scale, y1: p1.y + ny * offset * scale, x2: p2.x + nx * offset * scale, y2: p2.y + ny * offset * scale } });
    }
    
    let rawCorners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        const C_off = intersectLines(ePrev.offL, eNext.offL);
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
        let alpha = Math.atan2(cross, dot);
        let isConvex = (cross * CW) > 0;
        let r = radii[i] * scale;
        let R_off = isConvex ? r + offset * scale : r - offset * scale;
        R_off = Math.max(0, R_off); if (r === 0) R_off = 0;
        let d = R_off > 0 ? R_off * Math.abs(Math.tan(alpha / 2)) : 0;
        let bulge = Math.tan(alpha / 4);
        rawCorners.push({ C_off, R_off, d, alpha, cross, isConvex, bulge });
    }
    
    for (let i = 0; i < n; i++) {
        let c1 = rawCorners[i], c2 = rawCorners[(i + 1) % n];
        let vx = c2.C_off.x - c1.C_off.x, vy = c2.C_off.y - c1.C_off.y;
        let dist = Math.hypot(vx, vy), dot = vx * edges[i].vx + vy * edges[i].vy;
        if (dot < 0) dist = 0;
        if (c1.d + c2.d > dist) {
            let factor = dist / (c1.d + c2.d + 0.0001);
            c1.d *= factor; c1.R_off = c1.d / Math.abs(Math.tan(c1.alpha / 2) || 1);
            c2.d *= factor; c2.R_off = c2.d / Math.abs(Math.tan(c2.alpha / 2) || 1);
        }
    }
    
    const corners = [];
    for (let i = 0; i < n; i++) {
        let rc = rawCorners[i], ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        let arcStart = { x: rc.C_off.x - ePrev.vx * rc.d, y: rc.C_off.y - ePrev.vy * rc.d };
        let arcEnd = { x: rc.C_off.x + eNext.vx * rc.d, y: rc.C_off.y + eNext.vy * rc.d };
        let arcMid = { x: rc.C_off.x, y: rc.C_off.y }, bulge = 0;

        if (rc.R_off > 0) {
            let sign = Math.sign(rc.cross) || 1, nx = -ePrev.vy * sign, ny = ePrev.vx * sign;
            let cx = arcStart.x + nx * rc.R_off, cy = arcStart.y + ny * rc.R_off;
            let vX = rc.C_off.x - cx, vY = rc.C_off.y - cy, vLen = Math.hypot(vX, vY) || 1;
            arcMid = { x: cx + (vX / vLen) * rc.R_off, y: cy + (vY / vLen) * rc.R_off };
            bulge = (rc.isConvex ? 1 : -1) * CW * rc.bulge;
        }
        corners.push({ C_off: rc.C_off, R_off: rc.R_off, arcStart, arcEnd, arcMid, bulge });
    }
    return corners;
}

function getDXFPolyline(layer, corners, isClosed, sec = null) {
    const n = corners.length;
    let dxf = ["  0", "POLYLINE", "  8", layer, " 66", "1", " 70", isClosed ? "1" : "0"];
    let pts = [];
    
    if (isClosed) {
        for (let i = 0; i < n; i++) {
            let c = corners[i];
            pts.push({ x: c.arcStart.x, y: c.arcStart.y, bulge: c.R_off > 0 ? c.bulge : 0 });
            if (c.R_off > 0) pts.push({ x: c.arcEnd.x, y: c.arcEnd.y, bulge: 0 });
        }
    } else {
        for (let i = 0; i < sec.length; i++) {
            let edgeIdx = sec[i], c1 = corners[edgeIdx], c2 = corners[(edgeIdx + 1) % n];
            if (i === 0) pts.push({ x: c1.arcEnd.x, y: c1.arcEnd.y, bulge: 0 });
            let useBulge = (i < sec.length - 1 && c2.R_off > 0);
            pts.push({ x: c2.arcStart.x, y: c2.arcStart.y, bulge: useBulge ? c2.bulge : 0 });
            if (useBulge) pts.push({ x: c2.arcEnd.x, y: c2.arcEnd.y, bulge: 0 });
        }
    }
    
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(4), " 20", p.y.toFixed(4), " 42", (p.bulge || 0).toFixed(8));
    });
    dxf.push("  0", "SEQEND", "  8", layer);
    return dxf;
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
    let oldEdgeBanded = new Array(n).fill(false);
    if (currentSections.length > 0 && container.children.length > 0) {
        currentSections.forEach((sec, sIdx) => { const cb = document.getElementById(`bandSec${sIdx}`); let isChecked = cb ? cb.checked : false; sec.forEach(edge => oldEdgeBanded[edge] = isChecked); });
    }
    currentSections = sections; const edgeNames = getEdgeNames();
    
    let html = `<label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll"> Band All</label>`;
    
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
    
    let screenPts = pts.map(p => [p[0], B - p[1]]);
    const crns = generatePathData(screenPts, 0, radii, scale, offX, offY);

    ctx.beginPath(); ctx.moveTo(crns[0].arcStart.x, crns[0].arcStart.y);
    for (let i = 0; i < n; i++) {
        let c = crns[i];
        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y);
        ctx.lineTo(crns[(i + 1) % n].arcStart.x, crns[(i + 1) % n].arcStart.y);
    }
    ctx.closePath(); ctx.lineWidth = Math.max(2, 3 * (canvas.width / 1200)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bCrns = generatePathData(screenPts, 12 * (canvas.width / 1200) / scale, radii, scale, offX, offY);
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

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); 
    tempCanvas.width = 3840; tempCanvas.height = 2160;
    const tctx = tempCanvas.getContext("2d"); 
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawLShape(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "l_shape") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints(), radii = getRadii(), maxY = Math.max(...rawPts.map(p => p[1])), pts = rawPts.map(p => [p[0], maxY - p[1]]), n = pts.length;
    let dxf = [
        "  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC",
        "  0", "SECTION", "  2", "TABLES",
        "  0", "TABLE", "  2", "LTYPE", " 70", "1", "  0", "LTYPE", "  2", "CONTINUOUS", " 70", "0", "  3", "Solid line", " 72", "65", " 73", "0", " 40", "0.0", "  0", "ENDTAB",
        "  0", "TABLE", "  2", "LAYER", " 70", "2", 
        "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  6", "CONTINUOUS", 
        "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  6", "CONTINUOUS", 
        "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"
    ];
    
    const baseCorners = generatePathData(pts, 0, radii);
    dxf = dxf.concat(getDXFPolyline("Shape", baseCorners, true));
    
    const bandCorners = generatePathData(pts, 12, radii);
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked) {
            if (sec.length === n) dxf = dxf.concat(getDXFPolyline("Edge_Banding", bandCorners, true)); 
            else dxf = dxf.concat(getDXFPolyline("Edge_Banding", bandCorners, false, sec));
        }
    });
    
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
