let highlightedCorner = -1;
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => updateUI());
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => updateUI());
                el.addEventListener("blur", (e) => validateAndClamp(e));
            }
        }
    });

    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawLShape(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawLShape(); });
    });

    updateUI();
};

function updateUI() { 
    refreshHintsAndWarnings(); 
    const outlineData = generatePathData(0);
    updateBandingUI(outlineData);
    drawLShape(); 
}

function validateAndClamp(e = null) {
    const minVal = 200, sheetW = 2400, sheetH = 1200;
    const twIn = document.getElementById("totalW"), thIn = document.getElementById("totalH");
    const lwIn = document.getElementById("legW"), lhIn = document.getElementById("legH");

    let tw = parseFloat(twIn.value) || minVal, th = parseFloat(thIn.value) || minVal;
    let lw = parseFloat(lwIn.value) || minVal, lh = parseFloat(lhIn.value) || minVal;

    tw = Math.max(minVal, Math.min(tw, sheetW));
    th = Math.max(minVal, Math.min(th, sheetW));
    if (tw > sheetH) th = Math.min(th, sheetH); else if (th > sheetH) tw = Math.min(tw, sheetH);

    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    twIn.value = Math.round(tw); thIn.value = Math.round(th);
    lwIn.value = Math.round(lw); lhIn.value = Math.round(lh);

    const sideLengths = [tw, lh, (tw - lw), (th - lh), lw, th];
    let conflict = false;
    
    for (let i = 0; i < 6; i++) {
        const r1In = document.getElementById(`rad${i}`);
        const r2In = document.getElementById(`rad${(i + 1) % 6}`);
        let r1 = parseFloat(r1In.value) || 0, r2 = parseFloat(r2In.value) || 0;
        
        if ((r1 + r2) > sideLengths[i]) {
            conflict = true;
            if (e && e.target === r1In) {
                r1In.value = Math.max(0, Math.floor(sideLengths[i] - r2));
            } else if (e && e.target === r2In) {
                r2In.value = Math.max(0, Math.floor(sideLengths[i] - r1));
            } else {
                const factor = sideLengths[i] / (r1 + r2 + 0.1);
                r1In.value = Math.floor(r1 * factor); r2In.value = Math.floor(r2 * factor);
            }
        }
    }
    
    const r3El = document.getElementById("rad3");
    if (parseFloat(r3El.value) < 50) r3El.value = 50;

    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
    updateUI();
}

function refreshHintsAndWarnings() {
    const A = parseFloat(document.getElementById("totalW").value) || 200, B = parseFloat(document.getElementById("totalH").value) || 200;
    document.getElementById("sheetWarning").style.display = (Math.max(A, B) > 2400 || Math.min(A, B) > 1200) ? "block" : "none";
    document.getElementById("rangeA").textContent = `Min 200 — Max ${B > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeB").textContent = `Min 200 — Max ${A > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeC").textContent = `Min 200 — Max ${A - 50} mm`;
    document.getElementById("rangeD").textContent = `Min 200 — Max ${B - 50} mm`;
}

// Determines continuous sections breaking at 90-degree corners
function updateBandingUI(outline) {
    let startIdx = 0;
    for(let i=0; i<6; i++) if (outline.data[i].r_orig === 0) { startIdx = i; break; }
    
    let sections = [];
    let currSec = [];
    for(let step=1; step<=6; step++) {
        let i = (startIdx + step) % 6;
        currSec.push(i);
        if (outline.data[i].r_orig === 0 || step === 6) {
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
    
    allCb.addEventListener("change", (e) => {
        secCbs.forEach(cb => cb.checked = e.target.checked);
        drawLShape();
    });
    
    secCbs.forEach(cb => {
        cb.addEventListener("change", () => {
            allCb.checked = Array.from(secCbs).every(c => c.checked);
            drawLShape();
        });
    });
}

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000, B = parseFloat(document.getElementById("totalH").value) || 800, C = parseFloat(document.getElementById("legW").value) || 300, D = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

// CORE MATH ENGINE: Flawless offsets and arc tracking
function generatePathData(offset) {
    const isLeft = document.getElementById("type").value === "left";
    const sign = isLeft ? -1 : 1;
    const A = parseFloat(document.getElementById("totalW").value) || 1000, B = parseFloat(document.getElementById("totalH").value) || 800;
    const canvas = document.getElementById("canvas");
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / A, (canvas.height - margin * 2) / B);
    const offX = (canvas.width - A * scale) / 2, offY = (canvas.height - B * scale) / 2;

    const pts = getPoints();
    const cArr = pts.map((p, i) => ({ x: p[0] * scale + offX, y: (B - p[1]) * scale + offY, r: (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale }));

    const data = [];
    for (let i = 0; i < 6; i++) {
        const prev = cArr[(i + 5) % 6], curr = cArr[i], next = cArr[(i + 1) % 6];

        const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y, l1 = Math.hypot(dx1, dy1) || 1;
        const v1_x = dx1/l1, v1_y = dy1/l1;

        const dx2 = next.x - curr.x, dy2 = next.y - curr.y, l2 = Math.hypot(dx2, dy2) || 1;
        const v2_x = dx2/l2, v2_y = dy2/l2;

        const N1_out = { x: -v1_y * sign, y: v1_x * sign }, N2_out = { x: -v2_y * sign, y: v2_x * sign };
        const cross = v1_x * v2_y - v1_y * v2_x;
        const isConcave = (cross * sign) > 0;

        const R = curr.r, R_off = Math.max(0, R + (isConcave ? -offset : offset));
        const C_off = { x: curr.x + N1_out.x * offset + N2_out.x * offset, y: curr.y + N1_out.y * offset + N2_out.y * offset };

        let StartPt, EndPt, ArcMidPt;
        if (R_off > 0) {
            const Center_orig = isConcave ?
                { x: curr.x + N1_out.x * R + N2_out.x * R, y: curr.y + N1_out.y * R + N2_out.y * R } :
                { x: curr.x - N1_out.x * R - N2_out.x * R, y: curr.y - N1_out.y * R - N2_out.y * R };
            
            if (!isConcave) {
                StartPt = { x: Center_orig.x + N1_out.x * R_off, y: Center_orig.y + N1_out.y * R_off };
                EndPt   = { x: Center_orig.x + N2_out.x * R_off, y: Center_orig.y + N2_out.y * R_off };
            } else {
                StartPt = { x: Center_orig.x - N1_out.x * R_off, y: Center_orig.y - N1_out.y * R_off };
                EndPt   = { x: Center_orig.x - N2_out.x * R_off, y: Center_orig.y - N2_out.y * R_off };
            }

            // Precisely track the midpoint of the curve for the blue highlight
            let mx = (StartPt.x + EndPt.x) / 2, my = (StartPt.y + EndPt.y) / 2;
            let vx = mx - Center_orig.x, vy = my - Center_orig.y, vLen = Math.hypot(vx, vy) || 1;
            ArcMidPt = { x: Center_orig.x + (vx/vLen)*R_off, y: Center_orig.y + (vy/vLen)*R_off };
        } else {
            StartPt = C_off; EndPt = C_off; ArcMidPt = C_off;
        }

        data.push({ StartPt, EndPt, C_off, R_off, r_orig: R, ArcMidPt });
    }
    return { data, scale, offX, offY, th: B };
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas"), ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outline = generatePathData(0);
    
    // 1. Draw Master Outline
    ctx.beginPath();
    ctx.moveTo(outline.data[0].EndPt.x, outline.data[0].EndPt.y);
    for(let i=1; i<=6; i++) {
        const seg = outline.data[i%6];
        ctx.lineTo(seg.StartPt.x, seg.StartPt.y);
        if (seg.R_off > 0) ctx.arcTo(seg.C_off.x, seg.C_off.y, seg.EndPt.x, seg.EndPt.y, seg.R_off);
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // 2. Draw Colored Sectional Banding
    const bandingControls = document.getElementById("dynamic-banding-controls");
    if (bandingControls && bandingControls.children.length > 0) {
        const banding = generatePathData(12);
        
        currentSections.forEach((sec, sIdx) => {
            const cb = document.getElementById(`bandSec${sIdx}`);
            if (cb && cb.checked) {
                ctx.beginPath();
                let firstEdge = sec[0];
                let prevEdge = (firstEdge + 5) % 6;
                ctx.moveTo(banding.data[prevEdge].EndPt.x, banding.data[prevEdge].EndPt.y);
                
                ctx.strokeStyle = bandingColors[sIdx % bandingColors.length];
                ctx.lineWidth = 4;
                
                sec.forEach((i) => {
                    let b = banding.data[i];
                    ctx.lineTo(b.StartPt.x, b.StartPt.y);
                    if (b.r_orig > 0) {
                        if (b.R_off > 0) ctx.arcTo(b.C_off.x, b.C_off.y, b.EndPt.x, b.EndPt.y, b.R_off);
                        else ctx.lineTo(b.C_off.x, b.C_off.y);
                    } else {
                        ctx.lineTo(b.C_off.x, b.C_off.y);
                    }
                });
                ctx.stroke();
            }
        });
    }

    // Centered Corner Highlighter (tracks curve perfectly)
    if (highlightedCorner !== -1 && !targetCtx) {
        const cp = outline.data[highlightedCorner];
        ctx.beginPath(); ctx.arc(cp.ArcMidPt.x, cp.ArcMidPt.y, 25, 0, Math.PI * 2); 
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 3; ctx.stroke();
    }
    
    if (!targetCtx) drawLDimensions(ctx, outline.scale, outline.offX, outline.offY, outline.th);
}

function drawLDimensions(ctx, scale, offX, offY, th) {
    ctx.font = "bold 18px Segoe UI, Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value), C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value);
    const isLeft = document.getElementById("type").value === "left";
    const drawDim = (x1, y1, x2, y2, label) => {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const textWidth = ctx.measureText(label).width + 25, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx - Math.cos(angle)*(textWidth/2), my - Math.sin(angle)*(textWidth/2));
        ctx.moveTo(mx + Math.cos(angle)*(textWidth/2), my + Math.sin(angle)*(textWidth/2)); ctx.lineTo(x2, y2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5; ctx.stroke();
        const s = 10; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s*Math.cos(angle-Math.PI/6), y2 - s*Math.sin(angle-Math.PI/6)); ctx.lineTo(x2 - s*Math.cos(angle+Math.PI/6), y2 - s*Math.sin(angle+Math.PI/6)); ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
        ctx.fillText(label, mx, my + 6);
    };
    drawDim(offX, offY + th*scale + 55, offX + A*scale, offY + th*scale + 55, `A: ${A}mm`);
    const bX = isLeft ? offX + A*scale + 85 : offX - 85;
    drawDim(bX, offY + th*scale, bX, offY, `B: ${B}mm`);
    const cX = isLeft ? offX + A*scale : offX, cX2 = isLeft ? offX + A*scale - C*scale : offX + C*scale;
    drawDim(cX, offY - 35, cX2, offY - 35, `C: ${C}mm`);
    const dX = isLeft ? offX - 85 : offX + A*scale + 85;
    drawDim(dX, offY + th*scale, dX, offY + th*scale - D*scale, `D: ${D}mm`);
}

function downloadPNG() {
    const canvas = document.getElementById("canvas"), tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext("2d"); tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawLShape(tctx);
    const link = document.createElement("a"); link.download = (document.getElementById("fileName").value || "l_shape") + ".png"; link.href = tempCanvas.toDataURL(); link.click();
}

function downloadDXF() {
    const isLeft = document.getElementById("type").value === "left";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value), C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value);
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (B - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
