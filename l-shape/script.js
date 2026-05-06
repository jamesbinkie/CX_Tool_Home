let highlightedCorner = -1;

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5",
                 "bandA", "bandB", "bandC", "bandD", "bandInternal"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => updateUI());
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => updateUI());
                if (!id.startsWith("band")) el.addEventListener("blur", validateAndClamp);
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
    drawLShape(); 
}

function validateAndClamp() {
    const minVal = 200, sheetW = 2400, sheetH = 1200;
    const twIn = document.getElementById("totalW"), thIn = document.getElementById("totalH");
    const lwIn = document.getElementById("legW"), lhIn = document.getElementById("legH");

    let tw = parseFloat(twIn.value) || minVal;
    let th = parseFloat(thIn.value) || minVal;
    let lw = parseFloat(lwIn.value) || minVal;
    let lh = parseFloat(lhIn.value) || minVal;

    // 1. Sheet Size Logic
    tw = Math.max(minVal, Math.min(tw, sheetW));
    th = Math.max(minVal, Math.min(th, sheetW));
    if (tw > sheetH) th = Math.min(th, sheetH);
    else if (th > sheetH) tw = Math.min(tw, sheetH);

    // 2. Leg Constraints
    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    twIn.value = Math.round(tw); thIn.value = Math.round(th);
    lwIn.value = Math.round(lw); lhIn.value = Math.round(lh);

    // 3. Radius Safety Guard (Prevents intersection/hook bug)
    const sideLengths = [tw, lh, (tw - lw), (th - lh), lw, th];
    let conflict = false;
    
    for (let i = 0; i < 6; i++) {
        const r1In = document.getElementById(`rad${i}`);
        const r2In = document.getElementById(`rad${(i + 1) % 6}`);
        let r1 = parseFloat(r1In.value) || 0;
        let r2 = parseFloat(r2In.value) || 0;

        const maxAvailable = sideLengths[i];
        if ((r1 + r2) > maxAvailable) {
            conflict = true;
            const factor = maxAvailable / (r1 + r2 + 0.5);
            r1In.value = Math.floor(r1 * factor);
            r2In.value = Math.floor(r2 * factor);
        }
    }
    
    const r3 = document.getElementById("rad3");
    if (parseFloat(r3.value) < 50) r3.value = 50;

    document.getElementById("radiusWarning").style.display = conflict ? "block" : "none";
    updateUI();
}

function refreshHintsAndWarnings() {
    const A = parseFloat(document.getElementById("totalW").value) || 200;
    const B = parseFloat(document.getElementById("totalH").value) || 200;
    const tooBig = (Math.max(A, B) > 2400 || Math.min(A, B) > 1200);
    document.getElementById("sheetWarning").style.display = tooBig ? "block" : "none";

    if (document.getElementById("rangeA")) {
        document.getElementById("rangeA").textContent = `Min 200 — Max ${B > 1200 ? 1200 : 2400} mm`;
        document.getElementById("rangeB").textContent = `Min 200 — Max ${A > 1200 ? 1200 : 2400} mm`;
        document.getElementById("rangeC").textContent = `Min 200 — Max ${A - 50} mm`;
        document.getElementById("rangeD").textContent = `Min 200 — Max ${B - 50} mm`;
    }
}

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000, B = parseFloat(document.getElementById("totalH").value) || 800, C = parseFloat(document.getElementById("legW").value) || 300, D = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas"), ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = getPoints(), tw = parseFloat(document.getElementById("totalW").value) || 1000, th = parseFloat(document.getElementById("totalH").value) || 800;
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / tw, (canvas.height - margin * 2) / th);
    const offX = (canvas.width - tw * scale) / 2, offY = (canvas.height - th * scale) / 2;

    const corners = pts.map((p, i) => ({ p, r: (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale }));

    // Define banding segments mapping
    const segCheck = {
        0: document.getElementById("bandA").checked,
        1: document.getElementById("bandD").checked,
        2: document.getElementById("bandInternal").checked,
        3: document.getElementById("bandInternal").checked,
        4: document.getElementById("bandC").checked,
        5: document.getElementById("bandB").checked
    };

    const isLeft = document.getElementById("type").value === "left";

    // 1. Draw Outline (Black)
    ctx.beginPath();
    const startPt = corners[0];
    const dx0 = corners[1].p[0]-startPt.p[0], dy0 = corners[1].p[1]-startPt.p[1], l0 = Math.hypot(dx0, dy0) || 1;
    ctx.moveTo((startPt.p[0] + (dx0/l0)*(startPt.r/scale))*scale+offX, (th-(startPt.p[1] + (dy0/l0)*(startPt.r/scale)))*scale+offY);
    for (let i = 0; i < 6; i++) {
        const next = corners[(i + 1) % 6], nn = corners[(i + 2) % 6];
        ctx.arcTo(next.p[0]*scale+offX, (th-next.p[1])*scale+offY, nn.p[0]*scale+offX, (th-nn.p[1])*scale+offY, next.r);
    }
    ctx.closePath(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // 2. Draw Banding (Red Offset)
    const gap = 12; // Visual offset gap
    ctx.strokeStyle = "red"; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
        if (!segCheck[i]) continue;
        
        const c = corners[i], n = corners[(i + 1) % 6], nn = corners[(i + 2) % 6], pPrev = corners[(i + 5) % 6];
        
        // Calculate outward normal for current segment
        const dx = n.p[0]-c.p[0], dy = n.p[1]-c.p[1], l = Math.hypot(dx,dy) || 1;
        // In CCW Right-L: Bottom(0-1) normal is [0, -1]
        let nx = dy/l, ny = -dx/l; 
        
        const shiftX = nx * gap, shiftY = ny * gap;

        // Draw the segment line
        ctx.beginPath();
        // Extend slightly to meet arcs
        const startX = (c.p[0] + (dx/l)*(c.r/scale))*scale + offX + shiftX;
        const startY = (th - (c.p[1] + (dy/l)*(c.r/scale)))*scale + offY - shiftY;
        const endX = (n.p[0] - (dx/l)*(n.r/scale))*scale + offX + shiftX;
        const endY = (th - (n.p[1] - (dy/l)*(n.r/scale)))*scale + offY - shiftY;
        
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Join corner arc if next segment is also checked
        if (segCheck[(i + 1) % 6]) {
            const nextDx = nn.p[0]-n.p[0], nextDy = nn.p[1]-n.p[1], nextL = Math.hypot(nextDx, nextDy) || 1;
            const nx2 = nextDy/nextL, ny2 = -nextDx/nextL;
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            // arcTo automatically creates the curve join for the offset path
            ctx.arcTo(n.p[0]*scale+offX+shiftX, (th-n.p[1])*scale+offY-shiftY, n.p[0]*scale+offX+nx2*gap, (th-n.p[1])*scale+offY-ny2*gap, n.r + (i === 2 ? -gap : gap));
            ctx.stroke();
        }
    }

    if (highlightedCorner !== -1 && !targetCtx) {
        const c = corners[highlightedCorner], pP = corners[(highlightedCorner + 5) % 6].p, pN = corners[(highlightedCorner + 1) % 6].p;
        const v1 = { x: pP[0]-c.p[0], y: pP[1]-c.p[1] }, v2 = { x: pN[0]-c.p[0], y: pN[1]-c.p[1] };
        const mag1 = Math.hypot(v1.x, v1.y), mag2 = Math.hypot(v2.x, v2.y);
        const bisect = { x: (v1.x/mag1 + v2.x/mag2), y: (v1.y/mag1 + v2.y/mag2) }, bMag = Math.hypot(bisect.x, bisect.y);
        const hX = (c.p[0] * scale + offX) + (bisect.x / (bMag || 1)) * (c.r * 0.414), hY = ((th - c.p[1]) * scale + offY) - (bisect.y / (bMag || 1)) * (c.r * 0.414);
        ctx.beginPath(); ctx.arc(hX, hY, 25, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 3; ctx.stroke();
    }
    if (!targetCtx) drawLDimensions(ctx, pts, scale, offX, offY, th);
}

function drawLDimensions(ctx, pts, scale, offX, offY, th) {
    // FIX: Restored Big Bold A, B, C, D labels
    ctx.font = "bold 18px Segoe UI, Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value), C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value);
    const isLeft = document.getElementById("type").value === "left";

    const drawDim = (x1, y1, x2, y2, label) => {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const textWidth = ctx.measureText(label).width + 20, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); 
        ctx.lineTo(mx - Math.cos(angle)*(textWidth/2), my - Math.sin(angle)*(textWidth/2));
        ctx.moveTo(mx + Math.cos(angle)*(textWidth/2), my + Math.sin(angle)*(textWidth/2)); 
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5; ctx.stroke();
        const s = 8; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - s*Math.cos(angle-Math.PI/6), y2 - s*Math.sin(angle-Math.PI/6)); ctx.lineTo(x2 - s*Math.cos(angle+Math.PI/6), y2 - s*Math.sin(angle+Math.PI/6)); ctx.closePath(); ctx.fillStyle = "#444"; ctx.fill();
        ctx.fillText(label, mx, my + 6);
    };

    // A (Bottom)
    drawDim(offX, offY + th*scale + 55, offX + A*scale, offY + th*scale + 55, `A: ${A}mm`);
    // B (Left Total)
    const bX = isLeft ? offX + A*scale + 85 : offX - 85;
    drawDim(bX, offY + th*scale, bX, offY, `B: ${B}mm`);
    // C (Top Leg Width)
    const cX = isLeft ? offX + A*scale : offX;
    const cX2 = isLeft ? offX + A*scale - C*scale : offX + C*scale;
    drawDim(cX, offY - 35, cX2, offY - 35, `C: ${C}mm`);
    // D (Outer Leg Height)
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
    const pts = getPoints(), th = parseFloat(document.getElementById("totalH").value);
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (th - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
