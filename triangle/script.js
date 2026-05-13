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

function validateRadii() {
    let conflict = false; const radii = getRadii();
    for (let i = 0; i < 3; i++) {
        let rEl = document.getElementById(`rad${i}`), val = parseFloat(rEl.value) || 0;
        if (val === 0) continue;
        let isBanded = false;
        currentSections.forEach((sec, sIdx) => { const cb = document.getElementById(`bandSec${sIdx}`); if (cb && cb.checked && (sec.includes(i) || sec.includes((i + 2) % 3))) isBanded = true; });
        if (isBanded && val > 0 && val < 50) { rEl.value = 50; conflict = true; }
    }
    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
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
    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    if (isSym) return [[0, H], [W, H], [W/2, 0]];
    const a = parseFloat(document.getElementById("sideA").value) || 200, b = parseFloat(document.getElementById("sideB").value) || 200, c = parseFloat(document.getElementById("sideC").value) || 200;
    if (a + b <= c) return [[0, 100], [c, 100], [c/2, 0]];
    const x = (a * a + c * c - b * b) / (2 * c), y = Math.sqrt(Math.max(0, a * a - x * x));
    return [[0, y], [c, y], [x, 0]];
}

function intersectLines(l1, l2) {
    const denom = (l1.x1 - l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 - l2.x2);
    if (Math.abs(denom) < 0.0001) return { x: l1.x2, y: l1.y2 };
    return { x: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.x1 - l2.x2) - (l1.x1 - l1.x2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom, y: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom };
}

function generatePathData(pts, offset, radii, scale, offX, offY) {
    const n = pts.length; let area = 0;
    for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
    const CW = area > 0 ? 1 : -1, cPts = pts.map(p => ({ x: p[0] * scale + offX, y: p[1] * scale + offY })), edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = cPts[i], p2 = cPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y, len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;
        edges.push({ vx, vy, nx, ny, offL: { x1: p1.x + nx * offset, y1: p1.y + ny * offset, x2: p2.x + nx * offset, y2: p2.y + ny * offset } });
    }
    const corners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n], eNext = edges[i], C_off = intersectLines(ePrev.offL, eNext.offL), r = radii[i] * scale, R_off = r > 0 ? r + offset : 0;
        let d = 0;
        if (R_off > 0) {
            let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx, dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy, alpha = Math.atan2(cross, dot);
            d = R_off * Math.abs(Math.tan(alpha / 2));
        }
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
    currentSections = sections;
    let html = `<label style="display: flex; align-items: center; gap: 5px; font-weight: bold;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length], names = sec.map(e => edgeNames[e]).join(" + "), shouldCheck = sec.some(edge => oldEdgeBanded[edge]);
        html += `<label style="display: flex; align-items: center; gap: 5px; border-bottom: 3px solid ${color}; padding-bottom: 2px;"><input type="checkbox" class="band-sec" id="bandSec${idx}" ${shouldCheck ? "checked" : ""}> ${names}</label>`;
    });
    container.innerHTML = html;
    const allCb = document.getElementById("bandAll"), secCbs = document.querySelectorAll(".band-sec");
    allCb.checked = Array.from(secCbs).every(c => c.checked);
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTriangle(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTriangle(); }); });
}

function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pts = getPoints(), radii = getRadii(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);
    const margin = canvas.width * 0.15, scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1)), offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale, offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale, n = pts.length;
    const baseData = generatePathData(pts, 0, radii, scale, offX, offY), crns = baseData.corners;

    ctx.beginPath(); ctx.moveTo(crns[0].arcStart.x, crns[0].arcStart.y);
    for (let i = 0; i < n; i++) {
        let c = crns[i];
        if (c.R_off > 0) ctx.arcTo(c.C_off.x, c.C_off.y, c.arcEnd.x, c.arcEnd.y, c.R_off); else ctx.lineTo(c.C_off.x, c.C_off.y);
        ctx.lineTo(crns[(i + 1) % n].arcStart.x, crns[(i + 1) % n].arcStart.y);
    }
    ctx.closePath(); ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const bandData = generatePathData(pts, 12 * (ctx.canvas.width/900), radii, scale, offX, offY), bCrns = bandData.corners;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath(); ctx.strokeStyle = bandingColors[sIdx % bandingColors.length]; ctx.lineWidth = 4 * (ctx.canvas.width/900);
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
        const cp = crns[highlightedCorner]; ctx.beginPath(); ctx.arc(cp.C_off.x, cp.C_off.y, 20, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function drawDimensions(ctx, pts, scale, offX, offY) {
    const scaleFactor = ctx.canvas.width / 900;
    ctx.font = `${Math.max(12, 14 * scaleFactor)}px Arial`; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n * scale + offX, cy = pts.reduce((s, p) => s + p[1], 0) / n * scale + offY;
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n], x1 = p1[0] * scale + offX, y1 = p1[1] * scale + offY, x2 = p2[0] * scale + offX, y2 = p2[1] * scale + offY;
        const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 5) continue;
        let nx = -dy / len, ny = dx / len;
        if (Math.hypot(((x1+x2)/2 + nx*10) - cx, ((y1+y2)/2 + ny*10) - cy) < Math.hypot((x1+x2)/2 - cx, (y1+y2)/2 - cy)) { nx = -nx; ny = -ny; }
        const dimOffset = 60 * scaleFactor, lx1 = x1 + nx * dimOffset, ly1 = y1 + ny * dimOffset, lx2 = x2 + nx * dimOffset, ly2 = y2 + ny * dimOffset, mx = (lx1 + lx2) / 2, my = (ly1 + ly2) / 2;
        const label = `${Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2)).toFixed(1)} mm`, textWidth = ctx.measureText(label).width + (15 * scaleFactor), angle = Math.atan2(ly2 - ly1, lx2 - lx1);
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(mx - Math.cos(angle) * (textWidth/2), my - Math.sin(angle) * (textWidth/2)); ctx.moveTo(mx + Math.cos(angle) * (textWidth/2), my + Math.sin(angle) * (textWidth/2)); ctx.lineTo(lx2, ly2); ctx.strokeStyle = "#444"; ctx.lineWidth = 1.2 * scaleFactor; ctx.stroke();
        const size = 8 * scaleFactor; ctx.beginPath(); ctx.moveTo(lx2, ly2); ctx.lineTo(lx2 - size * Math.cos(angle - Math.PI / 6), ly2 - size * Math.sin(angle - Math.PI / 6)); ctx.lineTo(lx2 - size * Math.cos(angle + Math.PI / 6), ly2 - size * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
        ctx.fillText(label, mx, my + (4 * scaleFactor));
    }
}

function getDXFPolyline(layer, vertices, isClosed) {
    let dxf = ["  0", "POLYLINE", "  8", layer, " 66", "1", " 70", isClosed ? "1" : "0"];
    vertices.forEach(p => { dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(4), " 20", p.y.toFixed(4), " 42", (p.bulge || 0).toFixed(8)); });
    dxf.push("  0", "SEQEND", "  8", layer); return dxf;
}

function computeDXFVertices(pts, radii) {
    const n = pts.length, dxfPts = [];
    let area = 0; for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
    const CW = area > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], r = radii[i];
        let v1x = p1.x - p0.x, v1y = p1.y - p0.y, l1 = Math.hypot(v1x, v1y) || 1; v1x /= l1; v1y /= l1;
        let v2x = p2.x - p1.x, v2y = p2.y - p1.y, l2 = Math.hypot(v2x, v2y) || 1; v2x /= l2; v2y /= l2;
        if (r > 0) {
            let cross = v1x * v2y - v1y * v2x, dot = v1x * v2x + v1y * v2y, alpha = Math.atan2(cross, dot), d = r * Math.abs(Math.tan(alpha / 2));
            dxfPts.push({ x: p1.x - v1x * d, y: p1.y - v1y * d, bulge: Math.tan(alpha / 4) });
            dxfPts.push({ x: p1.x + v2x * d, y: p1.y + v2y * d, bulge: 0 });
        } else { dxfPts.push({ x: p1.x, y: p1.y, bulge: 0 }); }
    }
    return dxfPts;
}

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); tempCanvas.width = 4096; tempCanvas.height = 2730;
    const tctx = tempCanvas.getContext("2d"); tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawTriangle(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "triangle") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const rawPts = getPoints(), radii = getRadii(), maxY = Math.max(...rawPts.map(p => p[1])), pts = rawPts.map(p => ({ x: p[0], y: maxY - p[1] })), dxfPts = computeDXFVertices(pts, radii), n = pts.length;
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "TABLES", "  0", "TABLE", "  2", "LAYER", " 70", "2", "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  0", "LAYER", "  2", "Edge_Banding", " 70", "0", " 62", "1", "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"];
    dxf = dxf.concat(getDXFPolyline("Shape", dxfPts, true));
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked) {
            if (sec.length === n) { dxf = dxf.concat(getDXFPolyline("Edge_Banding", dxfPts, true)); } 
            else {
                let secPts = []; secPts.push({ x: dxfPts[sec[0] * 2 + 1].x, y: dxfPts[sec[0] * 2 + 1].y, bulge: 0 });
                for (let i = 0; i < sec.length; i++) {
                    let nextCorner = (sec[i] + 1) % n, arcStartPt = dxfPts[nextCorner * 2];
                    if (i < sec.length - 1) { secPts.push({ x: arcStartPt.x, y: arcStartPt.y, bulge: arcStartPt.bulge }); secPts.push({ x: dxfPts[nextCorner * 2 + 1].x, y: dxfPts[nextCorner * 2 + 1].y, bulge: 0 }); } 
                    else { secPts.push({ x: arcStartPt.x, y: arcStartPt.y, bulge: 0 }); }
                }
                dxf = dxf.concat(getDXFPolyline("Edge_Banding", secPts, false));
            }
        }
    });
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "triangle") + ".dxf"; link.click();
}
