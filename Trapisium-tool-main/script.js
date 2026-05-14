let highlightedCorner = -1; 
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"];
const edgeNames = ["Top", "Right", "Bottom", "Left"];

window.onload = () => {
    const inputs = ["A", "B", "C", "D", "rad0", "rad1", "rad2", "rad3"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT" && el.type === "number") {
                el.addEventListener("input", () => { refreshMaxLabels(); drawTrapezium(); });
                el.addEventListener("blur", () => { validateAndClamp(); updateUI(); });
            } else {
                el.addEventListener("change", () => { validateAndClamp(); updateUI(); });
            }
        }
    });
    document.getElementById("type").addEventListener("change", function () {
        document.getElementById("Dlabel").style.display = (this.value === "irregular") ? "flex" : "none";
        validateAndClamp(); updateUI();
    });
    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawTrapezium(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawTrapezium(); });
    });
    
    new ResizeObserver(() => {
        requestAnimationFrame(() => drawTrapezium());
    }).observe(document.getElementById("canvas"));
    
    refreshMaxLabels(); updateUI();
};

function refreshMaxLabels() {
    const Bv = parseFloat(document.getElementById("B").value) || 50;
    const Cv = parseFloat(document.getElementById("C").value) || 20;
    document.getElementById("CmaxLabel").textContent = Math.max(20, Bv - 1);
    document.getElementById("DmaxLabel").textContent = Math.max(0, Bv - Cv);
}

function updateUI() { refreshMaxLabels(); updateBandingUI(getRadii()); validateRadii(); drawTrapezium(); }

function validateAndClamp() {
    const sheetW = 2400, sheetH = 1200;
    let a = parseFloat(document.getElementById("A").value) || 100, b = parseFloat(document.getElementById("B").value) || 50, c = parseFloat(document.getElementById("C").value) || 20, d = parseFloat(document.getElementById("D").value) || 0;
    a = Math.max(100, Math.min(a, sheetW)); b = Math.max(50, Math.min(b, sheetW));
    if (a > sheetH) b = Math.min(b, sheetH); else if (b > sheetH) a = Math.min(a, sheetH);
    c = Math.max(20, Math.min(c, b - 1)); d = Math.max(0, Math.min(d, b - c));
    document.getElementById("A").value = Math.round(a); document.getElementById("B").value = Math.round(b); document.getElementById("C").value = Math.round(c); document.getElementById("D").value = Math.round(d);
}

function getRadii() { return [parseFloat(document.getElementById("rad0").value) || 0, parseFloat(document.getElementById("rad1").value) || 0, parseFloat(document.getElementById("rad2").value) || 0, parseFloat(document.getElementById("rad3").value) || 0]; }

function isCornerBanded(i, n) {
    let isBanded = false;
    currentSections.forEach(sec => {
        if (sec.includes(i) || sec.includes((i + n - 1) % n)) isBanded = true;
    });
    return isBanded;
}

function validateRadii() {
    let conflict = false; 
    const radii = getRadii();
    const pts = getPoints();
    const n = pts.length;
    
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

    for(let i=0; i<n; i++) {
        if(radii[i] > 0 && isCornerBanded(i, n) && radii[i] < 50) radii[i] = 50;
    }

    let changed = false;
    for (let iter = 0; iter < 10; iter++) {
        let clamped = false;
        for (let i = 0; i < n; i++) {
            let r1 = radii[i], r2 = radii[(i + 1) % n];
            if (r1 === 0 && r2 === 0) continue;

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

    if (changed) {
        for (let i = 0; i < n; i++) document.getElementById(`rad${i}`).value = Math.floor(radii[i]);
    }
    
    const finalRadii = getRadii();
    for (let i = 0; i < n; i++) {
        if (finalRadii[i] > 0 && isCornerBanded(i, n) && finalRadii[i] < 50) { 
            document.getElementById(`rad${i}`).value = 50;
            conflict = true; 
        }
    }
    
    const warnEl = document.getElementById("radiusWarning");
    warnEl.style.display = (conflict || changed) ? "block" : "none";
    if (conflict) warnEl.innerHTML = "⚠️ Radii adjusted! Banded corners ideally need 50mm+ radius, but may cause overlapping on small edges.";
    else if (changed) warnEl.innerHTML = "⚠️ Radii scaled down to prevent corners overlapping.";
}

function getPoints() {
    const type = document.getElementById("type").value, A = parseFloat(document.getElementById("A").value) || 100, B = parseFloat(document.getElementById("B").value) || 50, C = parseFloat(document.getElementById("C").value) || 20, D = parseFloat(document.getElementById("D").value) || 0;
    if (type === "regular") return [[(B - C) / 2, 0], [(B - C) / 2 + C, 0], [B, A], [0, A]];
    if (type === "right") return [[0, 0], [C, 0], [B, A], [0, A]];
    return [[D, 0], [D + C, 0], [B, A], [0, A]];
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
        rawCorners.push({ C_off, R_off, d, alpha, cross, isConvex });
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
            
            bulge = Math.tan(rc.alpha / 4);
            bulge = (rc.isConvex ? -1 : 1) * CW * bulge;
        }
        corners.push({ C_off: rc.C_off, R_off: rc.R_off, arcStart, arcEnd, arcMid, bulge });
    }
    return corners;
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
    currentSections = sections;
    
    let html = `<label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length], names = sec.map(e => edgeNames[e]).join(" + "), shouldCheck = sec.some(edge => oldEdgeBanded[edge]);
        html += `<label style="display: flex; align-items: center; gap: 5px; border-left: 4px solid ${color}; padding-left: 8px;"><input type="checkbox" class="band-sec" id="bandSec${idx}" ${shouldCheck ? "checked" : ""}> ${names}</label>`;
    });
    container.innerHTML = html;
    const allCb = document.getElementById("bandAll"), secCbs = document.querySelectorAll(".band-sec");
    allCb.checked = Array.from(secCbs).every(c => c.checked);
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTrapezium(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTrapezium(); }); });
}

function drawTrapezium(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) { canvas.width = rect.width; canvas.height = rect.height; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const pts = getPoints(), radii = getRadii(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);
    const margin = Math.min(canvas.width, canvas.height) * 0.15, scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1)), offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale, offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale, n = pts.length;
    
    const crns = generatePathData(pts, 0, radii, scale, offX, offY);

    ctx.beginPath(); ctx.moveTo(crns[0].arcStart.x, crns[0].arcStart.y);
    for (let i = 0; i < n; i++) {
        let c = crns[i];
        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y);
        ctx.lineTo(crns[(i + 1) % n].arcStart.x, crns[(i + 1) % n].arcStart.y);
    }
    ctx.closePath(); ctx.lineWidth = Math.max(2, 3 * (canvas.width / 1200)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bCrns = generatePathData(pts, 12 * (canvas.width / 1200) / scale, radii, scale, offX, offY);
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
    drawDimensions(ctx, pts, scale, offX, offY);
    if (highlightedCorner !== -1 && !targetCanvas) {
        const cp = crns[highlightedCorner]; ctx.beginPath(); ctx.arc(cp.arcMid.x, cp.arcMid.y, 20, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function drawDimensions(ctx, pts, scale, offsetX, offsetY) {
    const TL = pts[0], TR = pts[1], BR = pts[2], BL = pts[3];
    drawDimLine(ctx, TL[0] * scale + offsetX, TL[1] * scale + offsetY, TR[0] * scale + offsetX, TR[1] * scale + offsetY, `${Number((TR[0] - TL[0]).toFixed(2))} mm`, "above");
    drawDimLine(ctx, BL[0] * scale + offsetX, BL[1] * scale + offsetY, BR[0] * scale + offsetX, BR[1] * scale + offsetY, `${Number((BR[0] - BL[0]).toFixed(2))} mm`, "below");
    const shapeLeft = Math.min(TL[0] * scale + offsetX, BL[0] * scale + offsetX), scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1, dimOffset = 25 * scaleFactor, spaceLeft = shapeLeft, spaceRight = ctx.canvas.width - Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX);
    let position = (spaceRight > spaceLeft) ? "right" : "left", dimX = (position === "right") ? Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX) + dimOffset : shapeLeft - dimOffset;
    drawDimLine(ctx, dimX, TL[1] * scale + offsetY, dimX, BL[1] * scale + offsetY, `${Number((BL[1] - TL[1]).toFixed(2))} mm`, position);
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

function getDXFPolyline(layer, corners, isClosed, sec = null) {
    const n = corners.length;
    let dxf = ["  0", "POLYLINE", "  8", layer, " 66", "1", " 70", isClosed ? "1" : "0"];
    let pts = [];
    
    if (isClosed) {
        for (let i = 0; i < n; i++) {
            let c = corners[i];
            pts.push({ x: c.arcStart.x, y: c.arcStart.y, bulge: c.bulge });
            if (Math.hypot(c.arcStart.x - c.arcEnd.x, c.arcStart.y - c.arcEnd.y) > 0.0001) pts.push({ x: c.arcEnd.x, y: c.arcEnd.y, bulge: 0 });
            else pts[pts.length - 1].bulge = 0;
        }
    } else {
        for (let i = 0; i < sec.length; i++) {
            let edgeIdx = sec[i], c1 = corners[edgeIdx], c2 = corners[(edgeIdx + 1) % n];
            if (i === 0) pts.push({ x: c1.arcEnd.x, y: c1.arcEnd.y, bulge: 0 });
            if (i < sec.length - 1) {
                pts[pts.length - 1].bulge = 0; 
                pts.push({ x: c2.arcStart.x, y: c2.arcStart.y, bulge: c2.bulge });
                pts.push({ x: c2.arcEnd.x, y: c2.arcEnd.y, bulge: 0 });
            } else {
                pts.push({ x: c2.arcStart.x, y: c2.arcStart.y, bulge: 0 });
            }
        }
    }
    
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(4), " 20", p.y.toFixed(4), " 42", (p.bulge || 0).toFixed(8));
    });
    dxf.push("  0", "SEQEND", "  8", layer);
    return dxf;
}

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); 
    tempCanvas.width = 3840; tempCanvas.height = 2160;
    const tctx = tempCanvas.getContext("2d"); 
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawTrapezium(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "trapezium") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints(), radii = getRadii(), maxY = Math.max(...rawPts.map(p => p[1])), pts = rawPts.map(p => [p[0], maxY - p[1]]), n = pts.length;
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "TABLES", "  0", "TABLE", "  2", "LAYER", " 70", "2", "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"];
    
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
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "trapezium") + ".dxf"; link.click();
}
