let highlightedCorner = -1;
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f"];

window.onload = () => {
    const ids = ["A", "B", "C", "D", "type", "rad0", "rad1", "rad2", "rad3"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => { refreshMaxLabels(); updateUI(); });
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => { refreshMaxLabels(); drawTrapezium(); });
                el.addEventListener("blur", (e) => { validateAndClamp(e); updateUI(); });
            }
        }
    });
    
    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawTrapezium(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawTrapezium(); });
    });

    document.getElementById("type").addEventListener("change", function () {
      document.getElementById("Dlabel").style.display = (this.value === "irregular") ? "flex" : "none";
    });
    document.getElementById("Dlabel").style.display = "none";

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
    const outlineData = generatePathData(0);
    updateBandingUI(outlineData);
    validateRadii();
    drawTrapezium();
}

function validateAndClamp(e) {
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

function validateRadii() {
    let conflict = false;
    // Check if radius needs to be >= 50 due to banding
    for(let i=0; i<4; i++) {
        let rEl = document.getElementById(`rad${i}`);
        let val = parseFloat(rEl.value) || 0;
        
        // Find if this corner is part of a banded section
        let isBanded = false;
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                // corner i connects edge i-1 and edge i
                if(sec.includes((i+3)%4) || sec.includes(i)) isBanded = true;
            }
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

function generatePathData(offset) {
    const pts = getPoints();
    const canvas = document.getElementById("canvas");
    
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const shapeW = maxX - minX, shapeH = maxY - minY;
    
    const margin = Math.max(150, canvas.height * 0.25);
    const scale = Math.min((canvas.width - margin * 2) / (shapeW || 1), (canvas.height - margin * 2) / (shapeH || 1));
    const offX = (canvas.width - shapeW * scale) / 2 - minX * scale;
    const offY = (canvas.height - shapeH * scale) / 2 - minY * scale;

    const cArr = pts.map((p, i) => ({ x: p[0] * scale + offX, y: p[1] * scale + offY, r: (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale }));

    const data = [];
    for (let i = 0; i < 4; i++) {
        const prev = cArr[(i + 3) % 4], curr = cArr[i], next = cArr[(i + 1) % 4];

        const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y, l1 = Math.hypot(dx1, dy1) || 1;
        const v1_x = dx1/l1, v1_y = dy1/l1;

        const dx2 = next.x - curr.x, dy2 = next.y - curr.y, l2 = Math.hypot(dx2, dy2) || 1;
        const v2_x = dx2/l2, v2_y = dy2/l2;

        // Convex normal points outward
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
        } else {
            StartPt = C_off; EndPt = C_off; ArcMidPt = C_off;
        }
        data.push({ StartPt, EndPt, C_off, R_off, r_orig: R, ArcMidPt });
    }
    return { data, scale, offX, offY };
}

function updateBandingUI(outline) {
    let startIdx = 0;
    for(let i=0; i<4; i++) if (outline.data[i].r_orig === 0) { startIdx = i; break; }
    
    let sections = [];
    let currSec = [];
    for(let step=1; step<=4; step++) {
        let i = (startIdx + step) % 4;
        currSec.push(i);
        if (outline.data[i].r_orig === 0 || step === 4) {
            sections.push(currSec);
            currSec = [];
        }
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

    const allCb = document.getElementById("bandAll");
    const secCbs = document.querySelectorAll(".band-sec");
    allCb.addEventListener("change", (e) => { secCbs.forEach(cb => cb.checked = e.target.checked); validateRadii(); drawTrapezium(); });
    secCbs.forEach(cb => { cb.addEventListener("change", () => { allCb.checked = Array.from(secCbs).every(c => c.checked); validateRadii(); drawTrapezium(); }); });
}

function drawTrapezium(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas"), ctx = canvas.getContext("2d");
    if (!targetCanvas) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outline = generatePathData(0);

    ctx.beginPath();
    ctx.moveTo(outline.data[0].EndPt.x, outline.data[0].EndPt.y);
    for(let i=1; i<=4; i++) {
        const seg = outline.data[i%4];
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
                let firstEdge = sec[0];
                let prevEdge = (firstEdge + 3) % 4;
                ctx.moveTo(banding.data[prevEdge].EndPt.x, banding.data[prevEdge].EndPt.y);
                ctx.strokeStyle = bandingColors[sIdx % bandingColors.length];
                ctx.lineWidth = 4;
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
    const screenCanvas = document.getElementById("canvas"), scaleFactor = Math.max(1, 4096 / screenCanvas.width);
    const tempCanvas = document.createElement("canvas"); tempCanvas.width = screenCanvas.width * scaleFactor; tempCanvas.height = screenCanvas.height * scaleFactor;
    const tctx = tempCanvas.getContext("2d"); tctx.scale(scaleFactor, scaleFactor);
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);
    drawTrapezium(tempCanvas);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "trapezium") + ".png"; link.href = tempCanvas.toDataURL("image/png"); link.click();
}

function downloadDXF() {
    const pts = getPoints();
    const R = [parseFloat(document.getElementById("rad0").value)||0, parseFloat(document.getElementById("rad1").value)||0, parseFloat(document.getElementById("rad2").value)||0, parseFloat(document.getElementById("rad3").value)||0];
    const dxfPts = [];
    
    for(let i=0; i<4; i++) {
        const prev = pts[(i+3)%4], curr = pts[i], next = pts[(i+1)%4], r = R[i];
        if (r > 0) {
            let dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1], l1 = Math.hypot(dx1, dy1) || 1;
            let p_start = { x: curr[0] + (dx1/l1)*r, y: curr[1] + (dy1/l1)*r };
            let dx2 = next[0] - curr[0], dy2 = next[1] - curr[1], l2 = Math.hypot(dx2, dy2) || 1;
            let p_end = { x: curr[0] + (dx2/l2)*r, y: curr[1] + (dy2/l2)*r };
            dxfPts.push({ x: p_start.x, y: p_start.y, bulge: 0.41421356 }); // Convex arc bulge approx
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
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "trapezium") + ".dxf"; link.click();
}
