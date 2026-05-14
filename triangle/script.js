let highlightedCorner = -1; 
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71"];
const edgeNames = ["Bottom", "Right", "Left"];

window.onload = () => {
    const inputs = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "rad0", "rad1", "rad2"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT" && el.type === "number") {
                el.addEventListener("input", () => { drawTriangle(); });
                el.addEventListener("blur", () => { validateAndClamp(); updateUI(); });
            } else {
                el.addEventListener("change", () => { validateAndClamp(); updateUI(); });
            }
        }
    });
    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawTriangle(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawTriangle(); });
    });
    
    new ResizeObserver(() => {
        requestAnimationFrame(() => drawTriangle());
    }).observe(document.getElementById("canvas"));
    
    updateUI();
};

function updateUI() {
    const type = document.getElementById("type").value, isSym = document.getElementById("isSymmetric").checked;
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSym) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSym) ? "flex" : "none";
    refreshHintsAndWarnings(); updateBandingUI(getRadii()); validateRadii(); drawTriangle();
}

function validateAndClamp() {
    const type = document.getElementById("type").value, isSym = document.getElementById("isSymmetric").checked, minVal = 200, sheetW = 2400, sheetH = 1200;
    if (type !== "standard" || isSym) {
        const wIn = document.getElementById("W"), hIn = document.getElementById("H");
        let w = parseFloat(wIn.value) || minVal, h = parseFloat(hIn.value) || minVal;
        w = Math.max(minVal, Math.min(w, sheetW)); h = Math.max(minVal, Math.min(h, sheetW));
        if (w > sheetH) h = Math.min(h, sheetH); else if (h > sheetH) w = Math.min(w, sheetH);
        wIn.value = Math.round(w); hIn.value = Math.round(h);
    } else {
        const aIn = document.getElementById("sideA"), bIn = document.getElementById("sideB"), cIn = document.getElementById("sideC");
        let a = parseFloat(aIn.value) || minVal, b = parseFloat(bIn.value) || minVal, c = parseFloat(cIn.value) || minVal;
        a = Math.max(minVal, a); b = Math.max(minVal, b); c = Math.max(minVal, Math.min(c, sheetW));
        if (a + b <= c) { a = Math.round(c * 0.6); b = Math.round(c * 0.6); }
        aIn.value = a; bIn.value = b; cIn.value = c;
    }
}

function getRadii() { return [parseFloat(document.getElementById("rad0").value) || 0, parseFloat(document.getElementById("rad1").value) || 0, parseFloat(document.getElementById("rad2").value) || 0]; }

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
    const radii = getRadii();
    const pts = getPoints();
    const n = pts.length;
    
    for (let i = 0; i < n; i++) {
        if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 50) { 
            radii[i] = 50; 
            conflict = true; 
        }
    }

    let changed = false, edges = [];
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
                let factor = len / (d1 + d2 + 0.0001);
                radii[i] *= factor; radii[(i + 1) % n] *= factor;
                clamped = true; changed = true;
            }
        }
        if (!clamped) break;
    }

    if (changed || conflict) {
        for (let i = 0; i < n; i++) document.getElementById(`rad${i}`).value = Math.floor(radii[i]);
    }
    
    let bandingBroken = false;
    for (let i = 0; i < n; i++) if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 49.9) bandingBroken = true;

    const warnEl = document.getElementById("radiusWarning");
    warnEl.style.display = (conflict || changed || bandingBroken) ? "block" : "none";
    if (bandingBroken) warnEl.innerHTML = "⚠️ Edge too short! Radii scaled down to prevent overlap, but banded corners require 50mm+ to flex safely.";
    else if (conflict) warnEl.innerHTML = "⚠️ Radii adjusted! Banded corners must be 0mm (sharp joint) or 50mm+ radius to flex.";
    else if (changed) warnEl.innerHTML = "⚠️ Radii scaled down to prevent corners overlapping.";
}

function refreshHintsAndWarnings() {
    const pts = getPoints(), w = Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])), h = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
    document.getElementById("sheetWarning").style.display = (Math.max(w, h) > 2400 || Math.min(w, h) > 1200) ? "block" : "none";
    let isBanded = false; currentSections.forEach((sec, i) => { if(document.getElementById(`bandSec${i}`)?.checked) isBanded = true; });
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p0 = pts[(i + 2) % 3], p2 = pts[(i + 1) % 3];
        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] }, v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };
        const dot = v1.x * v2.x + v1.y * v2.y, mag = Math.sqrt(v1.x**2 + v1.y**2) * Math.sqrt(v2.x**2 + v2.y**2);
        angles.push(Math.acos(Math.max(-1, Math.min(1, dot / (mag || 1)))) * (180 / Math.PI));
    }
    document.getElementById("safetyWarning").style.display = (angles.some(a => a < 30) && isBanded) ? "block" : "none";
}

function getPoints() {
    const type = document.getElementById("type").value, W = parseFloat(document.getElementById("W").value) || 200, H = parseFloat(document.getElementById("H").value) || 200, isSym = document.getElementById("isSymmetric").checked;
    if (type === "right") return [[0,0], [W,0], [0, H]];
    if (type === "left") return [[0,0], [W,0], [W, H]];
    if (isSym) return [[0,0], [W,0], [W/2, H]];
    const a = parseFloat(document.getElementById("sideA").value) || 200, b = parseFloat(document.getElementById("sideB").value) || 200, c = parseFloat(document.getElementById("sideC").value) || 200;
    if (a + b <= c) return [[0,0], [c,0], [c/2, 100]];
    const x = (b * b + c * c - a * a) / (2 * c), y = Math.sqrt(Math.max(0, b * b - x * x));
    return [[0,0], [c,0], [x, y]];
}

function intersectLines(p1, p2, p3, p4) {
    let denom = (p1.x - p2.x)*(p3.y - p4.y) - (p1.y - p2.y)*(p3.x - p4.x);
    if (Math.abs(denom) < 0.0001) return {x: p2.x, y: p2.y};
    let x = ((p1.x*p2.y - p1.y*p2.x)*(p3.x - p4.x) - (p1.x - p2.x)*(p3.x*p4.y - p3.y*p4.x)) / denom;
    let y = ((p1.x*p2.y - p1.y*p2.x)*(p3.y - p4.y) - (p1.y - p2.y)*(p3.x*p4.y - p3.y*p4.x)) / denom;
    return {x, y};
}

function generatePathData(pts, offset, radii, scale = 1, offX = 0, offY = 0) {
    const n = pts.length; let area = 0;
    const sPts = pts.map(p => ({ x: p[0] * scale + offX, y: p[1] * scale + offY }));
    for (let i = 0; i < n; i++) area += sPts[i].x * sPts[(i + 1) % n].y - sPts[(i + 1) % n].x * sPts[i].y;
    const CW = area > 0 ? 1 : -1, edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = sPts[i], p2 = sPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy, ny = -vx; 
        edges.push({
            vx, vy, nx, ny,
            off1: { x: p1.x + nx * offset * scale, y: p1.y + ny * offset * scale },
            off2: { x: p2.x + nx * offset * scale, y: p2.y + ny * offset * scale }
        });
    }
    
    let rawCorners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        let C_off = intersectLines(ePrev.off1, ePrev.off2, eNext.off1, eNext.off2);
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx;
        let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
        let alpha = Math.atan2(cross, dot);
        let isConvex = cross > 0;
        let r = radii[i] * scale;
        let R_off = isConvex ? r + offset * scale : r - offset * scale;
        R_off = Math.max(0, R_off); if (r === 0) R_off = 0;
        let d = R_off > 0 ? R_off * Math.abs(Math.tan(alpha / 2)) : 0;
        rawCorners.push({ C_off, R_off, d, alpha, cross, isConvex, ePrev, eNext });
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
        let arcStart = { x: rc.C_off.x - rc.ePrev.vx * rc.d, y: rc.C_off.y - rc.ePrev.vy * rc.d };
        let arcEnd = { x: rc.C_off.x + rc.eNext.vx * rc.d, y: rc.C_off.y + rc.eNext.vy * rc.d };
        let bulge = rc.R_off > 0 ? Math.tan(rc.alpha / 4) : 0;
        
        let arcMid = { x: rc.C_off.x, y: rc.C_off.y };
        if (rc.R_off > 0) {
            let mx = (arcStart.x + arcEnd.x) / 2;
            let my = (arcStart.y + arcEnd.y) / 2;
            let arcCenter = { x: arcStart.x - rc.ePrev.nx * rc.R_off * (rc.isConvex?1:-1), y: arcStart.y - rc.ePrev.ny * rc.R_off * (rc.isConvex?1:-1) };
            let vx = mx - arcCenter.x, vy = my - arcCenter.y;
            let vL = Math.hypot(vx, vy) || 1;
            arcMid = { x: arcCenter.x + (vx/vL)*rc.R_off, y: arcCenter.y + (vy/vL)*rc.R_off };
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
        dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(8), " 20", p.y.toFixed(8), " 42", (p.bulge || 0).toFixed(8));
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
    currentSections = sections;
    
    let html = `<label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll"> Band All</label>`;
    
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length], names = sec.map(e => edgeNames[e]).join(" + "), shouldCheck = sec.some(edge => oldEdgeBanded[edge]);
        html += `<label style="display: flex; align-items: center; gap: 5px; border-left: 4px solid ${color}; padding-left: 8px;"><input type="checkbox" class="band-sec" id="bandSec${idx}" ${shouldCheck ? "checked" : ""}> ${names}</label>`;
    });
    container.innerHTML = html;
    const allCb = document.getElementById("bandAll"), secCbs = document.querySelectorAll(".band-sec");
    allCb.checked = Array.from(secCbs).every(c => c.checked);
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTriangle(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTriangle(); }); });
}

function drawShapeOnCanvas(ctx, corners, scale, offX, offY, shapeH) {
    const trX = x => x * scale + offX;
    const trY = y => (shapeH - y) * scale + offY;

    ctx.beginPath();
    ctx.moveTo(trX(corners[0].arcStart.x), trY(corners[0].arcStart.y));
    for (let i = 0; i < corners.length; i++) {
        let c = corners[i];
        if (c.R_off > 0) {
            ctx.arcTo(trX(c.C_off.x), trY(c.C_off.y), trX(c.arcEnd.x), trY(c.arcEnd.y), c.R_off * scale);
        } else {
            ctx.lineTo(trX(c.C_off.x), trY(c.C_off.y));
        }
        let next = corners[(i + 1) % corners.length];
        ctx.lineTo(trX(next.arcStart.x), trY(next.arcStart.y));
    }
    ctx.closePath();
}

function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) { canvas.width = rect.width; canvas.height = rect.height; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const pts = getPoints(), radii = getRadii(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);
    const margin = Math.min(canvas.width, canvas.height) * 0.15, scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1)), offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale, offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale, n = pts.length;
    
    const crns = generatePathData(pts, 0, radii);

    drawShapeOnCanvas(ctx, crns, scale, offX, offY, shapeH);
    ctx.lineWidth = Math.max(2, 3 * (canvas.width / 1200)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bCrns = generatePathData(pts, 12 * (canvas.width / 1200) / scale, radii);
        const trX = x => x * scale + offX;
        const trY = y => (shapeH - y) * scale + offY;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath(); ctx.strokeStyle = bandingColors[sIdx % bandingColors.length]; ctx.lineWidth = 5 * (canvas.width / 1200);
                if (sec.length === n) {
                    drawShapeOnCanvas(ctx, bCrns, scale, offX, offY, shapeH);
                } else {
                    let firstEdge = sec[0]; 
                    ctx.moveTo(trX(bCrns[firstEdge].arcEnd.x), trY(bCrns[firstEdge].arcEnd.y));
                    sec.forEach((edgeIdx, idx) => {
                        let c = bCrns[(edgeIdx + 1) % n];
                        ctx.lineTo(trX(c.arcStart.x), trY(c.arcStart.y));
                        if (idx < sec.length - 1) { 
                            if (c.R_off > 0) ctx.arcTo(trX(c.C_off.x), trY(c.C_off.y), trX(c.arcEnd.x), trY(c.arcEnd.y), c.R_off * scale); 
                            else ctx.lineTo(trX(c.C_off.x), trY(c.C_off.y)); 
                        }
                    });
                }
                ctx.stroke();
            }
        });
    }
    
    let screenPts = pts.map(p => [p[0], shapeH - p[1]]);
    drawDimensions(ctx, screenPts, scale, offX, offY);
    if (highlightedCorner !== -1 && !targetCanvas) {
        const cp = crns[highlightedCorner]; ctx.beginPath(); 
        const trX = x => x * scale + offX;
        const trY = y => (shapeH - y) * scale + offY;
        ctx.arc(trX(cp.arcMid.x), trY(cp.arcMid.y), 20, 0, Math.PI * 2); 
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function drawDimensions(ctx, pts, scale, offsetX, offsetY) {
    const TL = pts[2], TR = pts[1], BR = pts[1], BL = pts[0];
    const shapeLeft = Math.min(TL[0] * scale + offsetX, BL[0] * scale + offsetX), scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1, dimOffset = 25 * scaleFactor, spaceLeft = shapeLeft, spaceRight = ctx.canvas.width - Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX);
    let position = (spaceRight > spaceLeft) ? "right" : "left", dimX = (position === "right") ? Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX) + dimOffset : shapeLeft - dimOffset;
    drawDimLine(ctx, dimX, TL[1] * scale + offsetY, dimX, BL[1] * scale + offsetY, `${Number((BL[1] - TL[1]).toFixed(2))} mm`, position);
    drawDimLine(ctx, BL[0] * scale + offsetX, BL[1] * scale + offsetY, BR[0] * scale + offsetX, BR[1] * scale + offsetY, `${Number((BR[0] - BL[0]).toFixed(2))} mm`, "below");
}

function drawDimLine(ctx, x1, y1, x2, y2, label, position) {
    const scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1;
    const offset = 25 * scaleFactor, textOffset = 15 * scaleFactor;
    ctx.font = `bold ${Math.max(12, 16 * scaleFactor)}px Arial`;
    let lineX1 = x1, lineY1 = y1, lineX2 = x2, lineY2 = y2;
    if (position === "above") { lineY1 -= offset; lineY2 -= offset; } else if (position === "below") { lineY1 += offset; lineY2 += offset; } else if (position === "left") { lineX1 -= offset; lineX2 -= offset; } else if (position === "right") { lineX1 += offset; lineX2 += offset; }
    ctx.beginPath(); ctx.moveTo(lineX1, lineY1); ctx.lineTo(lineX2, lineY2); ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, 1.5 * scaleFactor); ctx.stroke();
    drawArrow(ctx, lineX1, lineY1, lineX2, lineY2, scaleFactor); drawArrow(ctx, lineX2, lineY2, lineX1, lineY1, scaleFactor);
    ctx.textAlign = (position === "left") ? "right" : (position === "right" ? "left" : "center"); ctx.textBaseline = (position === "below") ? "top" : (position === "above" ? "bottom" : "middle");
    let textX = (lineX1 + lineX2) / 2, textY = (lineY1 + lineY2) / 2;
    if (position === "above") textY -= textOffset; else if (position === "below") textY += textOffset; else if (position === "left") textX -= textOffset; else if (position === "right") textX += textOffset;
    ctx.fillStyle = "#000"; ctx.fillText(label, textX, textY);
}

function drawArrow(ctx, x1, y1, x2, y2, scaleFactor) {
    const size = 10 * scaleFactor, arrowOffset = 8 * scaleFactor, angle = Math.atan2(y2 - y1, x2 - x1), tipX = x2 + arrowOffset * Math.cos(angle), tipY = y2 + arrowOffset * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6)); ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fillStyle = "#000"; ctx.fill();
}

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); 
    tempCanvas.width = 3840; tempCanvas.height = 2160;
    const tctx = tempCanvas.getContext("2d"); 
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawTriangle(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "triangle") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints(), radii = getRadii(), n = rawPts.length;
    let dxf = [
        "  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC",
        "  0", "SECTION", "  2", "TABLES",
        "  0", "TABLE", "  2", "LTYPE", " 70", "1", "  0", "LTYPE", "  2", "CONTINUOUS", " 70", "0", "  3", "Solid line", " 72", "65", " 73", "0", " 40", "0.0", "  0", "ENDTAB",
        "  0", "TABLE", "  2", "LAYER", " 70", "2", 
        "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  6", "CONTINUOUS", 
        "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  6", "CONTINUOUS", 
        "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"
    ];
    
    const baseCorners = generatePathData(rawPts, 0, radii);
    dxf = dxf.concat(getDXFPolyline("Shape", baseCorners, true));
    
    const bandCorners = generatePathData(rawPts, 12, radii);
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked) {
            if (sec.length === n) dxf = dxf.concat(getDXFPolyline("Edge_Banding", bandCorners, true)); 
            else dxf = dxf.concat(getDXFPolyline("Edge_Banding", bandCorners, false, sec));
        }
    });
    
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "triangle") + ".dxf"; link.click();
}
