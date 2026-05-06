let highlightedCorner = -1;

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5",
                 "bandBottom", "bandLeft", "bandTop", "bandOuterLeg", "bandInnerH", "bandInnerV"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", updateUI);
            if (el.tagName === "INPUT") {
                el.addEventListener("input", updateUI);
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
    refreshWarnings();
    drawLShape();
}

function validateAndClamp() {
    const minVal = 200;
    const maxSheetDim = 2400, midSheetDim = 1200;

    let tw = parseFloat(document.getElementById("totalW").value) || minVal;
    let th = parseFloat(document.getElementById("totalH").value) || minVal;
    let lw = parseFloat(document.getElementById("legW").value) || minVal;
    let lh = parseFloat(document.getElementById("legH").value) || minVal;

    tw = Math.max(minVal, Math.min(tw, maxSheetDim));
    th = Math.max(minVal, Math.min(th, maxSheetDim));
    if (tw > midSheetDim) th = Math.min(th, midSheetDim);
    else if (th > midSheetDim) tw = Math.min(tw, midSheetDim);

    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    const r3 = document.getElementById("rad3");
    if (parseFloat(r3.value) < 50) r3.value = 50;

    document.getElementById("totalW").value = tw;
    document.getElementById("totalH").value = th;
    document.getElementById("legW").value = lw;
    document.getElementById("legH").value = lh;
    
    updateUI();
}

function refreshWarnings() {
    const tw = parseFloat(document.getElementById("totalW").value), th = parseFloat(document.getElementById("totalH").value);
    document.getElementById("sheetWarning").style.display = (Math.max(tw, th) > 2400 || Math.min(tw, th) > 1200) ? "block" : "none";
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
    const tw = parseFloat(document.getElementById("totalW").value), th = parseFloat(document.getElementById("totalH").value);
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / tw, (canvas.height - margin * 2) / th);
    const offX = (canvas.width - tw * scale) / 2, offY = (canvas.height - th * scale) / 2;

    const corners = pts.map((p, i) => {
        let r = parseFloat(document.getElementById(`rad${i}`).value) || 0;
        if (i === 3 && r < 50) r = 50;
        
        // Safety Clamp: Radius cannot be more than 45% of adjacent side lengths to prevent overlapping
        const pPrev = pts[(i + 5) % 6], pNext = pts[(i + 1) % 6];
        const len1 = Math.hypot(p[0] - pPrev[0], p[1] - pPrev[1]);
        const len2 = Math.hypot(p[0] - pNext[0], p[1] - pNext[1]);
        r = Math.min(r, len1 * 0.45, len2 * 0.45);

        return { p: p, r: r * scale };
    });

    ctx.beginPath();
    const startX = corners[0].p[0] * scale + offX;
    const startY = (th - corners[0].p[1]) * scale + offY + corners[0].r;
    ctx.moveTo(startX, startY);

    for (let i = 0; i < 6; i++) {
        const next = corners[(i + 1) % 6], nextNext = corners[(i + 2) % 6];
        const x1 = next.p[0] * scale + offX, y1 = (th - next.p[1]) * scale + offY;
        const x2 = nextNext.p[0] * scale + offX, y2 = (th - nextNext.p[1]) * scale + offY;
        ctx.arcTo(x1, y1, x2, y2, next.r);
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    if (highlightedCorner !== -1 && !targetCtx) {
        ctx.beginPath();
        const cp = corners[highlightedCorner].p;
        ctx.arc(cp[0] * scale + offX, (th - cp[1]) * scale + offY, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 159, 227, 0.3)"; ctx.fill();
        ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }

    if (!targetCtx) drawDimensions(ctx, pts, scale, offX, offY, th);
}

function drawDimensions(ctx, pts, scale, offX, offY, th) {
    ctx.font = "bold 16px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    const A = parseFloat(document.getElementById("totalW").value), B = parseFloat(document.getElementById("totalH").value);
    const C = parseFloat(document.getElementById("legW").value), D = parseFloat(document.getElementById("legH").value);

    ctx.fillText(`A: ${A}mm`, offX + (A * scale) / 2, offY + (th * scale) + 45);
    ctx.save(); ctx.translate(offX - 60, offY + (th * scale) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`B: ${B}mm`, 0, 0); ctx.restore();
    ctx.fillText(`C: ${C}mm`, offX + (C * scale) / 2, offY - 25);
    ctx.save(); ctx.translate(offX + (A * scale) + 60, offY + (th * scale) - (D * scale) / 2); ctx.rotate(Math.PI / 2); ctx.fillText(`D: ${D}mm`, 0, 0); ctx.restore();
}

function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext("2d");
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawLShape(tctx);
    const link = document.createElement("a");
    link.download = (document.getElementById("fileName").value || "l_shape") + ".png";
    link.href = tempCanvas.toDataURL(); link.click();
}

function downloadDXF() {
    const pts = getPoints(), th = parseFloat(document.getElementById("totalH").value);
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (th - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
