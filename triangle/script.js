let highlightedCorner = -1;
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71"];

window.onload = () => {
    const ids = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "rad0", "rad1", "rad2"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => { updateUI(); });
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => { updateUI(); });
                el.addEventListener("blur", (e) => { validateAndClamp(); updateUI(); });
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
    const type = document.getElementById("type").value;
    const isSym = document.getElementById("isSymmetric").checked;
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSym) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSym) ? "flex" : "none";
    
    refreshHintsAndWarnings();
    const outlineData = generatePathData(0);
    updateBandingUI(outlineData);
    validateRadii();
    drawTriangle();
}

function validateAndClamp() {
    const type = document.getElementById("type").value;
    const isSym = document.getElementById("isSymmetric").checked;
    const minVal = 200, sheetW = 2400, sheetH = 1200;

    if (type !== "standard" || isSym) {
        const wIn = document.getElementById("W"), hIn = document.getElementById("H");
        let w = parseFloat(wIn.value) || minVal, h = parseFloat(hIn.value) || minVal;
        w = Math.max(minVal, Math.min(w, sheetW));
        h = Math.max(minVal, Math.min(h, sheetW));
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

function validateRadii() {
    let conflict = false;
    for(let i=0; i<3; i++) {
        let rEl = document.getElementById(`rad${i}`);
        let val = parseFloat(rEl.value) || 0;
        let isBanded = false;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) { if(sec.includes((i+2)%3) || sec.includes(i)) isBanded = true; }
        });
        if (isBanded && val > 0 && val < 50) { rEl.value = 50; conflict = true; }
    }
    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
}

function refreshHintsAndWarnings() {
    const pts = getPoints();
    const w = Math.max(...pts.map(p=>p[0])) - Math.min(...pts.map(p=>p[0]));
    const h = Math.max(...pts.map(p=>p[1])) - Math.min(...pts.map(p=>p[1]));
    document.getElementById("sheetWarning").style.display = (Math.max(w, h) > 2400 || Math.min(w, h) > 1200) ? "block" : "none";
    
    let isBanded = false;
    currentSections.forEach((sec, i) => { if(document.getElementById(`bandSec${i}`)?.checked) isBanded = true; });
    
    // Check angles
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

function generatePathData(offset) {
    const pts = getPoints();
    const canvas = document.getElementById("canvas");
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const shapeW = Math.max(...xs) - Math.min(...xs), shapeH = Math.max(...ys) - Math.min(...ys);
    const margin = 150, scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - Math.min(...xs) * scale, offY = (canvas.height - shapeH * scale) / 2 - Math.min(...ys) * scale;
    
    const cArr = pts.map((p, i) => ({ x: p[0] * scale + offX, y: p[1] * scale + offY, r: (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale }));

    const data = [];
    for (let i = 0; i < 3; i++) {
        const prev = cArr[(i + 2) % 3], curr = cArr[i], next = cArr[(i + 1) % 3];
        const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y, l1 = Math.hypot(dx1, dy1) || 1;
        const v1_x = dx1/l1, v1_y = dy1/l1;
        const dx2 = next.x - curr.x, dy2 = next.y - curr.y, l2 = Math.hypot(dx2, dy2) || 1;
        const v2_x = dx2/l2, v2_y = dy2/l2;

        const N1_out = { x: -v1_y, y: v1_x }, N2_out = { x: -v2_y, y: v2_x };
        const R = curr.r, R_off = Math.max(0, R + offset);
        const C_off = { x: curr.x + N1_out.x * offset + N2_out.x * offset, y: curr.y + N1_out.y * offset + N2_out.y * offset };

        let StartPt, EndPt, ArcMidPt;
        if (R_off > 0) {
            const Center_orig = { x: curr.x + N1_out.x * R + N2_out.x * R, y: curr.y + N1_out.y * R + N2_out.y * R };
            StartPt = { x: Center_orig.x - N1_out.x * R_off, y: Center_orig.y - N1_out.y * R_off };
            EndPt   = { x: Center_orig.x - N2_out.x * R_off, y: Center_orig.y - N2_out.y * R_off };
            let mx = (StartPt.x + EndPt.x) / 2, my = (StartPt.y + EndPt.y) / 2;
            let vx = mx - Center_orig.x, vy = my - Center_orig.y, vLen = Math.hypot(vx, vy) || 1;
            ArcMidPt = { x: Center_orig.x + (vx/vLen)*R_off, y: Center_orig.y + (vy/vLen)*R_off };
        } else { StartPt = C_off; EndPt = C_off; ArcMidPt = C_off; }
        
        data.push({ StartPt, EndPt, C_off, R_off, r_orig: R, ArcMidPt });
    }
    return { data, scale, offX, offY };
}

function updateBandingUI(outline) {
    let startIdx = 0;
    for(let i=0; i<3; i++) if (outline.data[i].r_orig === 0) { startIdx = i; break; }
    
    let sections = []; let currSec = [];
    for(let step=1; step<=3; step++) {
        let i = (startIdx + step) % 3;
        currSec.push(i);
        if (outline.data[i].r_orig === 0 || step === 3) { sections.push(currSec); currSec = []; }
    }
    currentSections = sections;
    const container = document.getElementById("dynamic-banding-controls");
    if (!container || container.children.length === sections.length + 1) return; 

    let html = `<label style="display: flex; align-items: center; gap: 5px; font-weight: bold;"><input type="checkbox" id="bandAll" checked> Band All</label>`;
    sections.forEach((sec, idx) => {
        let color = bandingColors[idx % bandingColors.length];
        html += `<label style="display: flex; align-items: center; gap: 5px; border-bottom: 3px solid ${color}; padding-bottom: 2px;">
                    <input type="checkbox" class="band-sec" id="bandSec${idx}" checked> Section ${idx+1}
                 </label>`;
    });
    container.innerHTML = html;

    const allCb = document.getElementById("bandAll"); const secCbs = document.querySelectorAll(".band-sec");
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTriangle(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTriangle(); }); });
}

function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outline = generatePathData(0);

    ctx.beginPath();
    ctx.moveTo(outline.data[0].EndPt.x, outline.data[0].EndPt.y);
    for(let i=1; i<=3; i++) {
        const seg = outline.data[i%3];
        ctx.lineTo(seg.StartPt.x, seg.StartPt.y);
        if (seg.R_off > 0) ctx.arcTo(seg.C_off.x, seg.C_off.y, seg.EndPt.x, seg.EndPt.y, seg.R_off);
    }
    ctx.closePath();
    ctx.lineWidth = Math.max(2, 3 * (ctx.canvas.width / 900)); ctx.strokeStyle = "#000"; ctx.stroke();

    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const banding = generatePathData(10);
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath();
                let firstEdge = sec[0], prevEdge = (firstEdge + 2) % 3;
                ctx.moveTo(banding.data[prevEdge].EndPt.x, banding.data[prevEdge].EndPt.y);
                ctx.strokeStyle = bandingColors[sIdx % bandingColors.length]; ctx.lineWidth = 4;
                sec.forEach((i) => {
                    let b = banding.data[i];
                    ctx.lineTo(b.StartPt.x, b.StartPt.y);
                    if (b.r_orig > 0) {
                        if (b.R_off > 0) ctx.arcTo(b.C_off.x, b.C_off.y, b.EndPt.x, b.EndPt.y, b.R_off);
                        else ctx.lineTo(b.C_off.x, b.C_off.y);
                    } else { ctx.lineTo(b.C_off.x, b.C_off.y); }
                });
                ctx.stroke();
            }
        });
    }

    if (highlightedCorner !== -1 && !targetCanvas) {
        const cp = outline.data[highlightedCorner];
        ctx.beginPath(); ctx.arc(cp.ArcMidPt.x, cp.ArcMidPt.y, 20, 0, Math.PI * 2); 
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
}

function downloadPNG() {
    const screenCanvas = document.getElementById("canvas"), tempCanvas = document.createElement("canvas");
    tempCanvas.width = screenCanvas.width; tempCanvas.height = screenCanvas.height;
    const tctx = tempCanvas.getContext("2d"); tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawTriangle(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "triangle") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const pts = getPoints();
    const R = [parseFloat(document.getElementById("rad0").value)||0, parseFloat(document.getElementById("rad1").value)||0, parseFloat(document.getElementById("rad2").value)||0];
    const dxfPts = [];
    
    for(let i=0; i<3; i++) {
        const prev = pts[(i+2)%3], curr = pts[i], next = pts[(i+1)%3], r = R[i];
        if (r > 0) {
            let dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1], l1 = Math.hypot(dx1, dy1) || 1;
            let p_start = { x: curr[0] + (dx1/l1)*r, y: curr[1] + (dy1/l1)*r };
            let dx2 = next[0] - curr[0], dy2 = next[1] - curr[1], l2 = Math.hypot(dx2, dy2) || 1;
            let p_end = { x: curr[0] + (dx2/l2)*r, y: curr[1] + (dy2/l2)*r };
            dxfPts.push({ x: p_start.x, y: p_start.y, bulge: 0.41421356 }); 
            dxfPts.push({ x: p_end.x, y: p_end.y, bulge: 0 });
        } else {
            dxfPts.push({ x: curr[0], y: curr[1], bulge: 0 });
        }
    }
    
    const maxY = Math.max(...pts.map(p => p[1]));
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    dxfPts.forEach(p => { dxf.push("  0", "VERTEX", "  8", "0", " 10", p.x.toFixed(4), " 20", (maxY - p.y).toFixed(4), " 42", p.bulge.toFixed(8)); });
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "triangle") + ".dxf"; link.click();
}
