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
        validateAndClamp();
        updateUI();
    });

    refreshMaxLabels();
    updateUI();
};

function refreshMaxLabels() {
    const Bv = parseFloat(document.getElementById("B").value) || 50;
    const Cv = parseFloat(document.getElementById("C").value) || 20;
    document.getElementById("CmaxLabel").textContent = Math.max(20, Bv - 1);
    document.getElementById("DmaxLabel").textContent = Math.max(0, Bv - Cv);
}

function updateUI() {
    refreshMaxLabels();
    updateBandingUI(getRadii());
    validateRadii();
    drawTrapezium();
}

function validateAndClamp() {
    const sheetW = 2400, sheetH = 1200;
    let a = parseFloat(document.getElementById("A").value) || 100;
    let b = parseFloat(document.getElementById("B").value) || 50;
    let c = parseFloat(document.getElementById("C").value) || 20;
    let d = parseFloat(document.getElementById("D").value) || 0;

    a = Math.max(100, Math.min(a, sheetW));
    b = Math.max(50, Math.min(b, sheetW));
    if (a > sheetH) b = Math.min(b, sheetH); else if (b > sheetH) a = Math.min(a, sheetH);
    c = Math.max(20, Math.min(c, b - 1));
    d = Math.max(0, Math.min(d, b - c));

    document.getElementById("A").value = Math.round(a);
    document.getElementById("B").value = Math.round(b);
    document.getElementById("C").value = Math.round(c);
    document.getElementById("D").value = Math.round(d);
}

function getRadii() {
    return [
        parseFloat(document.getElementById("rad0").value) || 0, 
        parseFloat(document.getElementById("rad1").value) || 0, 
        parseFloat(document.getElementById("rad2").value) || 0, 
        parseFloat(document.getElementById("rad3").value) || 0
    ];
}

function validateRadii() {
    let conflict = false;
    const radii = getRadii();
    for (let i = 0; i < 4; i++) {
        let rEl = document.getElementById(`rad${i}`);
        let val = parseFloat(rEl.value) || 0;
        if (val === 0) continue;

        let isBanded = false;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked && (sec.includes(i) || sec.includes((i + 3) % 4))) isBanded = true;
        });

        if (isBanded && val > 0 && val < 50) {
            rEl.value = 50;
            conflict = true;
        }
    }
    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
}

function getPoints() {
    const type = document.getElementById("type").value;
    const A = parseFloat(document.getElementById("A").value) || 100;
    const B = parseFloat(document.getElementById("B").value) || 50;
    const C = parseFloat(document.getElementById("C").value) || 20;
    const D = parseFloat(document.getElementById("D").value) || 0;

    if (type === "regular") {
        const offset = (B - C) / 2;
        return [[offset, 0], [offset + C, 0], [B, A], [0, A]];
    } else if (type === "right") {
        return [[0, 0], [C, 0], [B, A], [0, A]];
    } else {
        return [[D, 0], [D + C, 0], [B, A], [0, A]];
    }
}

function intersectLines(l1, l2) {
    const denom = (l1.x1 - l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 - l2.x2);
    if (Math.abs(denom) < 0.0001) return { x: l1.x2, y: l1.y2 };
    return {
        x: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.x1 - l2.x2) - (l1.x1 - l1.x2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom,
        y: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom
    };
}

function generatePathData(pts, offset, radii, scale, offX, offY) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    const CW = area > 0 ? 1 : -1;

    const cPts = pts.map(p => ({ x: p[0] * scale + offX, y: p[1] * scale + offY }));
    const edges = [];
    
    for (let i = 0; i < n; i++) {
        const p1 = cPts[i], p2 = cPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y;
        let len = Math.hypot(vx, vy) || 1;
        vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({
            vx, vy, nx, ny,
            offL: { x1: p1.x + nx * offset, y1: p1.y + ny * offset, x2: p2.x + nx * offset, y2: p2.y + ny * offset }
        });
    }

    const corners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        const C_off = intersectLines(ePrev.offL, eNext.offL);
        const r = radii[i] * scale;
        const R_off = r > 0 ? r + offset : 0; 
        
        let d = 0;
        if (R_off > 0) {
            let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx;
            let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
            let alpha = Math.atan2(cross, dot);
            d = R_off * Math.abs(Math.tan(alpha / 2));
        }
        
        let arcStart = { x: C_off.x - ePrev.vx * d, y: C_off.y - ePrev.vy * d };
        let arcEnd = { x: C_off.x + eNext.vx * d, y: C_off.y + eNext.vy * d };

        corners.push({ C_off, R_off, r_orig: radii[i], arcStart, arcEnd });
    }
    return { corners, edges };
}

function updateBandingUI(radii) {
    const n = radii.length;
    let startIdx = 0;
    for (let i = 0; i < n; i++) if (radii[i] === 0) { startIdx = i; break; }
    
    let sections = []; let currSec = [];
    for (let step = 0; step < n; step++) {
        let edgeIdx = (startIdx + step) % n;
        currSec.push(edgeIdx);
        let nextCorner = (edgeIdx + 1) % n;
        if (radii[nextCorner] === 0 || step === n - 1) { sections.push(currSec); currSec = []; }
    }
    
    const container = document.getElementById("dynamic-banding-controls");
    if (JSON.stringify(currentSections) === JSON.stringify(sections) && container.children.length > 0) return;
    
    let oldEdgeBanded = new Array(n).fill(true);
    if (currentSections.length > 0 && container.children.length > 0) {
        currentSections.forEach((sec, sIdx) => {
            let cb = document.getElementById(`bandSec${sIdx}`);
            let isChecked = cb ? cb.checked : true;
            sec.forEach(edge => oldEdgeBanded[edge] = isChecked);
        });
    }

    currentSections = sections;
    let html = `<label style="display: flex; align-items: center; gap: 5px; font-weight: bold;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length];
        let names = sec.map(e => edgeNames[e]).join(" + ");
        let shouldCheck = sec.some(edge => oldEdgeBanded[edge]);
        html += `<label style="display: flex; align-items: center; gap: 5px; border-bottom: 3px solid ${color}; padding-bottom: 2px;">
                    <input type="checkbox" class="band-sec" id="bandSec${idx}" ${shouldCheck ? "checked" : ""}> ${names}
                 </label>`;
    });
    container.innerHTML = html;

    const allCb = document.getElementById("bandAll");
    const secCbs = document.querySelectorAll(".band-sec");
    allCb.checked = Array.from(secCbs).every(c => c.checked);

    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTrapezium(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTrapezium(); }); });
}

function drawTrapezium(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = getPoints();
    const radii = getRadii();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);
    
    const margin = 120;
    const scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale;
    const offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale;
    const n = pts.length;

    const baseData = generatePathData(pts, 0, radii, scale, offX, offY);
    const crns = baseData.corners;

    ctx.beginPath();
    ctx.moveTo(crns[0].arcStart.x, crns[0].arcStart.y);
    for (let i = 0; i < n; i++) {
        let c = crns[i];
        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off);
        else ctx.lineTo(c.C_off.x, c.C_off.y);
        let next_c = crns[(i + 1) % n];
        ctx.lineTo(next_c.arcStart.x, next_c.arcStart.y);
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bandData = generatePathData(pts, 12, radii, scale, offX, offY);
        const bCrns = bandData.corners;

        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath();
                ctx.strokeStyle = bandingColors[sIdx % bandingColors.length]; 
                ctx.lineWidth = 4;
                
                if (sec.length === n) { // Handles the fully connected loop wrap around
                    ctx.moveTo(bCrns[0].arcStart.x, bCrns[0].arcStart.y);
                    for (let i = 0; i < n; i++) {
                        let c = bCrns[i];
                        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off);
                        else ctx.lineTo(c.C_off.x, c.C_off.y);
                        let next_c = bCrns[(i + 1) % n];
                        ctx.lineTo(next_c.arcStart.x, next_c.arcStart.y);
                    }
                    ctx.closePath();
                } else {
                    let firstEdge = sec[0];
                    ctx.moveTo(bCrns[firstEdge].arcEnd.x, bCrns[firstEdge].arcEnd.y);
                    
                    sec.forEach((edgeIdx, idx) => {
                        let nextCorner = (edgeIdx + 1) % n;
                        let c = bCrns[nextCorner];
                        ctx.lineTo(c.arcStart.x, c.arcStart.y);
                        if (idx < sec.length - 1) { 
                            if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off);
                            else ctx.lineTo(c.C_off.x, c.C_off.y);
                        }
                    });
                }
                ctx.stroke();
            }
        });
    }

    drawDimensions(ctx, pts, scale, offX, offY);
}

function drawDimensions(ctx, pts, scale, offsetX, offsetY) {
    const TL = pts[0], TR = pts[1], BR = pts[2], BL = pts[3];

    drawDimLine(
        ctx,
        TL[0] * scale + offsetX, TL[1] * scale + offsetY,
        TR[0] * scale + offsetX, TR[1] * scale + offsetY,
        `${Number((TR[0] - TL[0]).toFixed(2))} mm`,
        "above"
    );

    drawDimLine(
        ctx,
        BL[0] * scale + offsetX, BL[1] * scale + offsetY,
        BR[0] * scale + offsetX, BR[1] * scale + offsetY,
        `${Number((BR[0] - BL[0]).toFixed(2))} mm`,
        "below"
    );

    const TLs = TL[0] * scale + offsetX;
    const BLs = BL[0] * scale + offsetX;
    const shapeLeft = Math.min(TLs, BLs);
    
    const scaleFactor = ctx.canvas.width / 900;
    const dimOffset = 20 * scaleFactor;
    const spaceLeft = shapeLeft; 
    const spaceRight = ctx.canvas.width - Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX);
    
    let position = (spaceRight > spaceLeft) ? "right" : "left";
    let dimX = (position === "right") ? Math.max(TR[0] * scale + offsetX, BR[0] * scale + offsetX) + dimOffset : shapeLeft - dimOffset;
    
    drawDimLine(
        ctx,
        dimX, TL[1] * scale + offsetY,
        dimX, BL[1] * scale + offsetY,
        `${Number((BL[1] - TL[1]).toFixed(2))} mm`,
        position
    );
}

function drawDimLine(ctx, x1, y1, x2, y2, label, position) {
    const scaleFactor = ctx.canvas.width / 900;
    const offset = 20 * scaleFactor;
    const textOffset = 12 * scaleFactor;
    ctx.font = Math.max(10, 18 * scaleFactor) + "px Arial";

    let lineX1 = x1, lineY1 = y1, lineX2 = x2, lineY2 = y2;
    if (position === "above") { lineY1 -= offset; lineY2 -= offset; }
    else if (position === "below") { lineY1 += offset; lineY2 += offset; }
    else if (position === "left") { lineX1 -= offset; lineX2 -= offset; }
    else if (position === "right") { lineX1 += offset; lineX2 += offset; }

    ctx.beginPath(); ctx.moveTo(lineX1, lineY1); ctx.lineTo(lineX2, lineY2);
    ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, 1.2 * scaleFactor); ctx.stroke();

    drawArrow(ctx, lineX1, lineY1, lineX2, lineY2);
    drawArrow(ctx, lineX2, lineY2, lineX1, lineY1);

    ctx.textAlign = (position === "left") ? "right" : (position === "right" ? "left" : "center");
    ctx.textBaseline = (position === "below") ? "top" : (position === "above" ? "bottom" : "middle");

    let textX = (lineX1 + lineX2) / 2, textY = (lineY1 + lineY2) / 2;
    if (position === "above") textY -= textOffset;
    else if (position === "below") textY += textOffset;
    else if (position === "left") textX -= textOffset;
    else if (position === "right") textX += textOffset;

    ctx.fillStyle = "#000"; ctx.fillText(label, textX, textY);
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const scaleFactor = ctx.canvas.width / 900, size = 8 * scaleFactor, arrowOffset = 6 * scaleFactor;
    const angle = Math.atan2(y2 - y1, x2 - x1), tipX = x2 + arrowOffset * Math.cos(angle), tipY = y2 + arrowOffset * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fillStyle = "#000"; ctx.fill();
}

function computeDXFVertices(pts, radii) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
    const CW = area > 0 ? 1 : -1;

    const dxfPts = [];
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
        const r = radii[i];
        
        let v1x = p1.x - p0.x, v1y = p1.y - p0.y;
        let l1 = Math.hypot(v1x, v1y) || 1;
        v1x /= l1; v1y /= l1;
        
        let v2x = p2.x - p1.x, v2y = p2.y - p1.y;
        let l2 = Math.hypot(v2x, v2y) || 1;
        v2x /= l2; v2y /= l2;

        if (r > 0) {
            let cross = v1x * v2y - v1y * v2x;
            let dot = v1x * v2x + v1y * v2y;
            let alpha = Math.atan2(cross, dot);

            let d = r * Math.abs(Math.tan(alpha / 2));
            let startX = p1.x - v1x * d;
            let startY = p1.y - v1y * d;
            let endX = p1.x + v2x * d;
            let endY = p1.y + v2y * d;
            let bulge = Math.tan(alpha / 4);

            dxfPts.push({ x: startX, y: startY, bulge: bulge });
            dxfPts.push({ x: endX, y: endY, bulge: 0 });
        } else {
            dxfPts.push({ x: p1.x, y: p1.y, bulge: 0 });
        }
    }
    return dxfPts;
}

function downloadPNG() {
    const screenCanvas = document.getElementById("canvas"), scaleFactor = Math.max(1, 4096 / screenCanvas.width);
    const tempCanvas = document.createElement("canvas"); tempCanvas.width = screenCanvas.width * scaleFactor; tempCanvas.height = screenCanvas.height * scaleFactor;
    const tctx = tempCanvas.getContext("2d"); tctx.scale(scaleFactor, scaleFactor);
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    drawTrapezium(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "trapezium") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints();
    const radii = getRadii();
    const maxY = Math.max(...rawPts.map(p => p[1]));
    const pts = rawPts.map(p => ({ x: p[0], y: maxY - p[1] })); 
    const dxfPts = computeDXFVertices(pts, radii);

    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    dxfPts.forEach(p => { dxf.push("  0", "VERTEX", "  8", "0", " 10", p.x.toFixed(4), " 20", p.y.toFixed(4), " 42", p.bulge.toFixed(8)); });
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "trapezium") + ".dxf"; link.click();
}
