let highlightedCorner = -1;

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5",
                 "bandA", "bandB", "bandC", "bandD", "bandInnerH", "bandInnerV"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => updateUI());
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => updateUI());
                // hard-clamp and update the numbers in the boxes on Blur
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

    // 1. Sheet Size Logic (Consistent with Triangle Tool)
    tw = Math.max(minVal, Math.min(tw, sheetW));
    th = Math.max(minVal, Math.min(th, sheetW));
    if (tw > sheetH) th = Math.min(th, sheetH);
    else if (th > sheetH) tw = Math.min(tw, sheetH);

    // 2. Leg Constraints (Legs must be at least 50mm smaller than totals)
    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    twIn.value = Math.round(tw); thIn.value = Math.round(th);
    lwIn.value = Math.round(lw); lhIn.value = Math.round(lh);

    // 3. Radius Safety Guard: The sum of two radii on one side cannot exceed that side's length.
    // Sides are: [Bottom(A), RightEdge(D), InnerHoriz(A-C), InnerVert(B-D), TopEdge(C), LeftEdge(B)]
    const sideLengths = [tw, lh, (tw - lw), (th - lh), lw, th];
    
    for (let i = 0; i < 6; i++) {
        const r1In = document.getElementById(`rad${i}`);
        const r2In = document.getElementById(`rad${(i + 1) % 6}`);
        let r1 = parseFloat(r1In.value) || 0;
        let r2 = parseFloat(r2In.value) || 0;
        if (i === 3 && r1 < 50) r1 = 50; // Special Internal Min

        const maxAvailable = sideLengths[i];
        if ((r1 + r2) > maxAvailable) {
            const factor = maxAvailable / (r1 + r2 + 1); // 1mm safety gap
            r1In.value = Math.floor(r1 * factor);
            r2In.value = Math.floor(r2 * factor);
        }
    }
    
    // Final check for Internal Corner 4 min
    const r3 = document.getElementById("rad3");
    if (parseFloat(r3.value) < 50) r3.value = 50;

    updateUI();
}

function refreshHintsAndWarnings() {
    const A = parseFloat(document.getElementById("totalW").value) || 200;
    const B = parseFloat(document.getElementById("totalH").value) || 200;
    
    const tooBig = (Math.max(A, B) > 2400 || Math.min(A, B) > 1200);
    const warning = document.getElementById("sheetWarning");
    if (warning) warning.style.display = tooBig ? "block" : "none";

    if (document.getElementById("rangeA")) {
        document.getElementById("rangeA").textContent = `Min 200 — Max ${B > 1200 ? 1200 : 2400} mm`;
        document.getElementById("rangeB").textContent = `Min 200 — Max ${A > 1200 ? 1200 : 2400} mm`;
        document.getElementById("rangeC").textContent = `Min 200 — Max ${A - 50} mm`;
        document.getElementById("rangeD").textContent = `Min 200 — Max ${B - 50} mm`;
    }
}

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000;
    const B = parseFloat(document.getElementById("totalH").value) || 800;
    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";

    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas");
    const ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = getPoints();
    const tw = parseFloat(document.getElementById("totalW").value) || 1000;
    const th = parseFloat(document.getElementById("totalH").value) || 800;
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / tw, (canvas.height - margin * 2) / th);
    const offX = (canvas.width - tw * scale) / 2, offY = (canvas.height - th * scale) / 2;

    const corners = pts.map((p, i) => {
        let r = parseFloat(document.getElementById(`rad${i}`).value) || 0;
        return { p: p, r: r * scale };
    });

    ctx.beginPath(); 
    const startX = corners[0].p[0] * scale + offX; 
    const startY = (th - corners[0].p[1]) * scale + offY + corners[0].r; 
    ctx.moveTo(startX, startY);

    for (let i = 0; i < 6; i++) {
        const next = corners[(i + 1) % 6], nNext = corners[(i + 2) % 6];
        const x1 = next.p[0] * scale + offX, y1 = (th - next.p[1]) * scale + offY;
        const x2 = nNext.p[0] * scale + offX, y2 = (th - nNext.p[1]) * scale + offY;
        ctx.arcTo(x1, y1, x2, y2, next.r);
    }
    ctx.closePath(); 
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // Red Edge Banding
    const ids = ["bandA", "bandD", "bandInnerH", "bandInnerV", "bandC", "bandB"];
    ctx.lineWidth = 3; ctx.strokeStyle = "red";
    ids.forEach((id, i) => {
        if (document.getElementById(id).checked) {
            const p1 = corners[i], p2 = corners[(i + 1) % 6];
            ctx.beginPath();
            ctx.moveTo(p1.p[0] * scale + offX, (th - p1.p[1]) * scale + offY);
            ctx.lineTo(p2.p[0] * scale + offX, (th - p2.p[1]) * scale + offY);
            ctx.stroke();
        }
    });

    // Centered Corner Highlighter
    if (highlightedCorner !== -1 && !targetCtx) {
        const c = corners[highlightedCorner], pP = corners[(highlightedCorner + 5) % 6].p, pN = corners[(highlightedCorner + 1) % 6].p;
        const v1 = { x: pP[0]-c.p[0], y: pP[1]-c.p[1] }, v2 = { x: pN[0]-c.p[0], y: pN[1]-c.p[1] };
        const mag1 = Math.hypot(v1.x, v1.y), mag2 = Math.hypot(v2.x, v2.y);
        const bisect = { x: (v1.x/mag1 + v2.x/mag2), y: (v1.y/mag1 + v2.y/mag2) }, bMag = Math.hypot(bisect.x, bisect.y);
        const hX = (c.p[0] * scale + offX) + (bisect.x / (bMag || 1)) * (c.r * 0.414);
        const hY = ((th - c.p[1]) * scale + offY) - (bisect.y / (bMag || 1)) * (c.r * 0.414);
        ctx.beginPath(); ctx.arc(hX, hY, 25, 0, Math.PI * 2); ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 3; ctx.stroke();
    }
    
    if (!targetCtx) drawDimensions(ctx, pts, scale, offX, offY, th);
}

function drawDimensions(ctx, pts, scale, offX, offY, th) {
    ctx.font = "bold 15px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value);
    const C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value);
    ctx.fillText(`A: ${A}mm`, offX + (A * scale) / 2, offY + (th * scale) + 45);
    ctx.save(); ctx.translate(offX - 60, offY + (th * scale) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`B: ${B}mm`, 0, 0); ctx.restore();
    ctx.fillText(`C: ${C}mm`, offX + (C * scale) / 2, offY - 25);
    ctx.save(); ctx.translate(offX + (A * scale) + 60, offY + (th * scale) - (D * scale) / 2); ctx.rotate(Math.PI / 2); ctx.fillText(`D: ${D}mm`, 0, 0); ctx.restore();
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
