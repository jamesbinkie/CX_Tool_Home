let rotationAngle = 0;

function rotatePart() {
    rotationAngle = (rotationAngle + 90) % 360;
    updateUI();
}

function getEdgeNames() {
    const names = [
        ["Bottom", "Right", "Top", "Left"],
        ["Right", "Top", "Left", "Bottom"],
        ["Top", "Left", "Bottom", "Right"],
        ["Left", "Bottom", "Right", "Top"]
    ];
    return names[(rotationAngle / 90) % 4];
}

function updateCornerLabels() {
    const names = [
        ["Btm L", "Btm R", "Top R", "Top L"],
        ["Top L", "Btm L", "Btm R", "Top R"],
        ["Top R", "Top L", "Btm L", "Btm R"],
        ["Btm R", "Top R", "Top L", "Btm L"]
    ][(rotationAngle / 90) % 4];
    
    document.querySelector('[data-corner="0"] label').textContent = `Corner 1 (${names[0]})`;
    document.querySelector('[data-corner="1"] label').textContent = `Corner 2 (${names[1]})`;
    document.querySelector('[data-corner="2"] label').textContent = `Corner 3 (${names[2]})`;
    document.querySelector('[data-corner="3"] label').textContent = `Corner 4 (${names[3]})`;
}

function updateDimensionLabels() {
    const step = (rotationAngle / 90) % 4;
    const names = [
        ["A (Height):", "B (Bottom Width):", "C (Top Width):", "D (Offset):"],
        ["A (Width):", "B (Left Height):", "C (Right Height):", "D (Offset):"],
        ["A (Height):", "B (Top Width):", "C (Bottom Width):", "D (Offset):"],
        ["A (Width):", "B (Right Height):", "C (Left Height):", "D (Offset):"]
    ];
    document.getElementById("labelA").textContent = names[step][0];
    document.getElementById("labelB").textContent = names[step][1];
    document.getElementById("labelC").textContent = names[step][2];
    document.getElementById("labelD").textContent = names[step][3];
}

let highlightedCorner = -1;  
let highlightedDim = null; 
let currentSections = []; 
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"]; 

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
    
    // Dimension hover edge highlighting
    document.querySelectorAll('.dim-wrap').forEach(wrap => {         
        wrap.addEventListener('mouseenter', () => { highlightedDim = wrap.dataset.dim; drawTrapezium(); });         
        wrap.addEventListener('mouseleave', () => { highlightedDim = null; drawTrapezium(); });     
    });

    const typeEl = document.getElementById("type");     
    const updateDLabel = () => {         
        const dLabel = document.getElementById("DlabelWrap");         
        if (dLabel) dLabel.style.display = (typeEl.value === "irregular") ? "flex" : "none";     
    };     
    if (typeEl) {         
        typeEl.addEventListener("change", function () {             
            updateDLabel();             
            validateAndClamp(); updateUI();         
        });         
        updateDLabel();      
    }     
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

function updateUI() { 
    refreshMaxLabels(); 
    updateBandingUI(getRadii()); 
    validateRadii(); 
    updateCornerLabels();
    updateDimensionLabels();
    drawTrapezium(); 
}

function validateAndClamp() {     
    const sheetW = 3050, sheetH = 2030;
    let a = parseFloat(document.getElementById("A").value) || 100, 
        b = parseFloat(document.getElementById("B").value) || 50, 
        c = parseFloat(document.getElementById("C").value) || 20, 
        d = parseFloat(document.getElementById("D").value) || 0;     
    
    a = Math.max(100, Math.min(a, sheetW)); 
    b = Math.max(50, Math.min(b, sheetW));     
    if (a > sheetH) b = Math.min(b, sheetH); 
    else if (b > sheetH) a = Math.min(a, sheetH);     
    
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
    const pts = getBasePoints();     
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
    let bandingBroken = false;     
    for (let i = 0; i < n; i++) if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 49.9) bandingBroken = true;          
    
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const maxDim = Math.max(w, h);
    const minDim = Math.min(w, h);
    const warnEl = document.getElementById("radiusWarning");
    
    let sizeWarning = "";
    if (maxDim > 3050 || minDim > 2030) {
        sizeWarning = "⚠️ Part exceeds absolute maximum size (Clear Acrylic: 3050 x 2030 mm).";
    } else if (maxDim > 2780 || minDim > 2060) {
        sizeWarning = "⚠️ Part exceeds standard MDF/Ply. Requires MFC (Max: 2780 x 2060 mm).";
    } else if (maxDim > 2440 || minDim > 1220) {
        sizeWarning = "⚠️ Part exceeds standard 2440 x 1220 mm. Verify material limits.";
    }

    warnEl.style.display = (conflict || changed || bandingBroken || sizeWarning !== "") ? "block" : "none";     
    if (bandingBroken) warnEl.innerHTML = sizeWarning + (sizeWarning ? "<br>" : "") + "⚠️ Edge too short! Radii scaled down to prevent overlap, but banded corners require 50mm+ to flex safely.";     
    else if (conflict) warnEl.innerHTML = sizeWarning + (sizeWarning ? "<br>" : "") + "⚠️ Radii adjusted! Banded corners must be 0mm (sharp joint) or 50mm+ radius to flex.";     
    else if (changed) warnEl.innerHTML = sizeWarning + (sizeWarning ? "<br>" : "") + "⚠️ Radii scaled down to prevent corners overlapping.";
    else if (sizeWarning) warnEl.innerHTML = sizeWarning;
}

function getBasePoints() {     
    const type = document.getElementById("type").value, 
          A = parseFloat(document.getElementById("A").value) || 100, 
          B = parseFloat(document.getElementById("B").value) || 50, 
          C = parseFloat(document.getElementById("C").value) || 20, 
          D = parseFloat(document.getElementById("D").value) || 0;     
    
    if (type === "regular") return [[0,0], [B,0], [B - (B-C)/2, A], [(B-C)/2, A]];     
    if (type === "right") return [[0,0], [B,0], [C, A], [0, A]];     
    if (type === "left") return [[0,0], [B,0], [B, A], [B - C, A]]; 
    return [[0,0], [B,0], [D + C, A], [D, A]]; 
}

function getPoints() {
    let pts = getBasePoints();
    if (rotationAngle === 0) return pts;

    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    
    const rad = (rotationAngle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let rotated = [];
    for (let p of pts) {
        let nx = (cos * (p[0] - cx)) - (sin * (p[1] - cy)) + cx;
        let ny = (sin * (p[0] - cx)) + (cos * (p[1] - cy)) + cy;
        rotated.push([nx, ny]);
    }
    
    const minX = Math.min(...rotated.map(p => p[0]));
    const minY = Math.min(...rotated.map(p => p[1]));
    return rotated.map(p => [p[0] - minX, p[1] - minY]);
}

function intersectLines(l1, l2) {     
    const denom = (l1.x1 - l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 - l2.x2);     
    if (Math.abs(denom) < 0.0001) return { x: l1.x2, y: l1.y2 };     
    return { 
        x: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.x1 - l2.x2) - (l1.x1 - l1.x2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom, 
        y: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom 
    }; 
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
        rawCorners.push({ C_off, R_off, d, alpha, cross, isConvex, bulge, ePrev, eNext });     
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
        let arcMid = { x: rc.C_off.x, y: rc.C_off.y };         
        let bulge = rc.R_off > 0 ? rc.bulge : 0;         
        if (rc.R_off > 0) {             
            let mx = (arcStart.x + arcEnd.x) / 2;             
            let my = (arcStart.y + arcEnd.y) / 2;             
            let turnSign = Math.sign(rc.alpha) || 1;             
            let nx = -ePrev.vy, ny = ePrev.vx;              
            let arcCenter = { x: arcStart.x + nx * rc.R_off * turnSign, y: arcStart.y + ny * rc.R_off * turnSign };             
            let vx = mx - arcCenter.x, vy = my - arcCenter.y;             
            let vL = Math.hypot(vx, vy) || 1;             
            arcMid = { x: arcCenter.x + (vx/vL)*rc.R_off, y: arcCenter.y + (vy/vL)*rc.R_off };         
        }         
        corners.push({ C_off: rc.C_off, R_off: rc.R_off, arcStart, arcEnd, arcMid, bulge, ePrev });     
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
    
    const edgeNames = getEdgeNames();          
    
    let html = `<label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 5px; font-weight: bold; margin-bottom: 5px;"><input type="checkbox" id="bandAll"> Band All</label>`;          
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

function drawTrapezium(targetCanvas = null) {     
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");     
    if (!targetCanvas) {         
        const rect = canvas.getBoundingClientRect();         
        if (canvas.width !== rect.width || canvas.height !== rect.height) { canvas.width = rect.width; canvas.height = rect.height; }         
        ctx.clearRect(0, 0, canvas.width, canvas.height);     
    }     
    const pts = getPoints(), radii = getRadii(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);     
    const margin = Math.min(canvas.width, canvas.height) * 0.15, scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1)), offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale, offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale, n = pts.length;          
    
    let screenPts = pts.map(p => [p[0], shapeH - p[1]]);     
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
    
    drawDimensions(ctx, crns, scale);     
    
    if (highlightedCorner !== -1 && !targetCanvas) {         
        const cp = crns[highlightedCorner]; ctx.beginPath();          
        ctx.arc(cp.arcMid.x, cp.arcMid.y, 20, 0, Math.PI * 2);          
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();     
    } 
}

function drawDimensions(ctx, crns, scale) {     
    const scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1;
    const off = 45 * scaleFactor;
    const A = parseFloat(document.getElementById("A").value);
    const B = parseFloat(document.getElementById("B").value);
    const C = parseFloat(document.getElementById("C").value);
    const D = parseFloat(document.getElementById("D").value);
    
    function drawEdgeDim(idx, label, dimId) {
        const p1 = crns[idx].C_off;
        const p2 = crns[(idx + 1) % crns.length].C_off;
        const edge = crns[(idx + 1) % crns.length].ePrev; 
        const isHighlighted = highlightedDim === dimId;
        
        const nx = edge.nx, ny = edge.ny;
        const lineX1 = p1.x + nx * off, lineY1 = p1.y + ny * off;
        const lineX2 = p2.x + nx * off, lineY2 = p2.y + ny * off;
        
        ctx.beginPath(); 
        ctx.moveTo(p1.x + nx * 5, p1.y + ny * 5); ctx.lineTo(lineX1, lineY1);
        ctx.moveTo(p2.x + nx * 5, p2.y + ny * 5); ctx.lineTo(lineX2, lineY2);
        ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; ctx.stroke();
        
        ctx.beginPath(); ctx.moveTo(lineX1, lineY1); ctx.lineTo(lineX2, lineY2); 
        ctx.strokeStyle = isHighlighted ? "#009fe3" : "#444"; 
        ctx.lineWidth = (isHighlighted ? 3 : 1.5) * scaleFactor; 
        ctx.stroke();     
        
        const s = 10 * scaleFactor; 
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath(); ctx.moveTo(lineX1, lineY1); 
        ctx.lineTo(lineX1 + s*Math.cos(angle - Math.PI/6), lineY1 + s*Math.sin(angle - Math.PI/6)); 
        ctx.lineTo(lineX1 + s*Math.cos(angle + Math.PI/6), lineY1 + s*Math.sin(angle + Math.PI/6)); 
        ctx.closePath(); ctx.fillStyle = isHighlighted ? "#009fe3" : "#444"; ctx.fill();
        
        ctx.beginPath(); ctx.moveTo(lineX2, lineY2); 
        ctx.lineTo(lineX2 - s*Math.cos(angle - Math.PI/6), lineY2 - s*Math.sin(angle - Math.PI/6)); 
        ctx.lineTo(lineX2 - s*Math.cos(angle + Math.PI/6), lineY2 - s*Math.sin(angle + Math.PI/6)); 
        ctx.closePath(); ctx.fill();
        
        ctx.font = `bold ${Math.max(12, 14 * scaleFactor)}px Segoe UI, Arial`; 
        ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const mx = (lineX1 + lineX2) / 2, my = (lineY1 + lineY2) / 2;
        const textOff = 16 * scaleFactor;
        
        const txtW = ctx.measureText(label).width + 10;
        const txtH = 20 * scaleFactor;
        ctx.fillStyle = isHighlighted ? "rgba(0, 159, 227, 0.15)" : "#dfe8f2"; 
        ctx.fillRect(mx + nx * textOff - txtW/2, my + ny * textOff - txtH/2, txtW, txtH);
        
        ctx.fillStyle = isHighlighted ? "#009fe3" : "#000";
        ctx.fillText(label, mx + nx * textOff, my + ny * textOff);
    }

    drawEdgeDim(0, `B: ${B}mm`, 'B');
    drawEdgeDim(2, `C: ${C}mm`, 'C');
    if (document.getElementById("type").value !== "regular" && D > 0) {
        drawEdgeDim(3, `D: ${D}mm`, 'D');
    }
    
    // Overall Height Dimension (A)
    const isAHighlighted = highlightedDim === 'A';
    const xs = crns.map(c => c.C_off.x);
    const ys = crns.map(c => c.C_off.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    
    let p1, p2, nx, ny;
    if (rotationAngle === 0) { p1 = {x: minX, y: maxY}; p2 = {x: minX, y: minY}; nx = -1; ny = 0; }
    else if (rotationAngle === 90) { p1 = {x: minX, y: minY}; p2 = {x: maxX, y: minY}; nx = 0; ny = -1; }
    else if (rotationAngle === 180) { p1 = {x: maxX, y: minY}; p2 = {x: maxX, y: maxY}; nx = 1; ny = 0; }
    else if (rotationAngle === 270) { p1 = {x: maxX, y: maxY}; p2 = {x: minX, y: maxY}; nx = 0; ny = 1; }
    
    const lineX1 = p1.x + nx * off, lineY1 = p1.y + ny * off;
    const lineX2 = p2.x + nx * off, lineY2 = p2.y + ny * off;
    
    ctx.beginPath(); 
    ctx.moveTo(p1.x + nx * 5, p1.y + ny * 5); ctx.lineTo(lineX1, lineY1);
    ctx.moveTo(p2.x + nx * 5, p2.y + ny * 5); ctx.lineTo(lineX2, lineY2);
    ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.moveTo(lineX1, lineY1); ctx.lineTo(lineX2, lineY2); 
    ctx.strokeStyle = isAHighlighted ? "#009fe3" : "#444"; 
    ctx.lineWidth = (isAHighlighted ? 3 : 1.5) * scaleFactor; 
    ctx.stroke();     
    
    const s = 10 * scaleFactor; 
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath(); ctx.moveTo(lineX1, lineY1); 
    ctx.lineTo(lineX1 + s*Math.cos(angle - Math.PI/6), lineY1 + s*Math.sin(angle - Math.PI/6)); 
    ctx.lineTo(lineX1 + s*Math.cos(angle + Math.PI/6), lineY1 + s*Math.sin(angle + Math.PI/6)); 
    ctx.closePath(); ctx.fillStyle = isAHighlighted ? "#009fe3" : "#444"; ctx.fill();
    
    ctx.beginPath(); ctx.moveTo(lineX2, lineY2); 
    ctx.lineTo(lineX2 - s*Math.cos(angle - Math.PI/6), lineY2 - s*Math.sin(angle - Math.PI/6)); 
    ctx.lineTo(lineX2 - s*Math.cos(angle + Math.PI/6), lineY2 - s*Math.sin(angle + Math.PI/6)); 
    ctx.closePath(); ctx.fill();
    
    ctx.font = `bold ${Math.max(12, 14 * scaleFactor)}px Segoe UI, Arial`; 
    ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const mx = (lineX1 + lineX2) / 2, my = (lineY1 + lineY2) / 2;
    const textOff = 16 * scaleFactor;
    
    const label = `A: ${A}mm`;
    const txtW = ctx.measureText(label).width + 10;
    const txtH = 20 * scaleFactor;
    ctx.fillStyle = isAHighlighted ? "rgba(0, 159, 227, 0.15)" : "#dfe8f2"; 
    ctx.fillRect(mx + nx * textOff - txtW/2, my + ny * textOff - txtH/2, txtW, txtH);
    ctx.fillStyle = isAHighlighted ? "#009fe3" : "#000";
    ctx.fillText(label, mx + nx * textOff, my + ny * textOff);
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
    const pts = getPoints(), radii = getRadii(), n = pts.length;     
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
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "trapezium") + ".dxf"; link.click(); 
}
