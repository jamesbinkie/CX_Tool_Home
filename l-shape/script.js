window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "intRadSlider", "intRadNum", "extRadSlider", "extRadNum",
                 "round0", "round1", "round2", "round4", "round5",
                 "bandBottom", "bandRight", "bandInnerH", "bandInnerV", "bandTop", "bandLeft"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", updateUI);
            if (el.tagName === "INPUT") {
                el.addEventListener("input", updateUI);
                if (id.includes("Num") || id.includes("total") || id.includes("leg")) {
                    el.addEventListener("blur", validateAndClamp);
                }
            }
        }
    });

    // Link Sliders and Numbers
    syncInputs("intRadSlider", "intRadNum");
    syncInputs("extRadSlider", "extRadNum");

    updateUI();
};

function syncInputs(sliderId, numId) {
    const s = document.getElementById(sliderId);
    const n = document.getElementById(numId);
    s.addEventListener("input", () => n.value = s.value);
    n.addEventListener("input", () => s.value = n.value);
}

function updateUI() {
    refreshWarnings();
    drawLShape();
}

function validateAndClamp() {
    const minVal = 200;
    const maxSheetDim = 2400;
    const midSheetDim = 1200;

    let tw = parseFloat(document.getElementById("totalW").value) || minVal;
    let th = parseFloat(document.getElementById("totalH").value) || minVal;
    let lw = parseFloat(document.getElementById("legW").value) || minVal;
    let lh = parseFloat(document.getElementById("legH").value) || minVal;

    // Sheet size logic (consistent with triangle tool)
    tw = Math.max(minVal, Math.min(tw, maxSheetDim));
    th = Math.max(minVal, Math.min(th, maxSheetDim));
    if (tw > midSheetDim) th = Math.min(th, midSheetDim);
    else if (th > midSheetDim) tw = Math.min(tw, midSheetDim);

    // Leg constraints (must be smaller than totals)
    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    document.getElementById("totalW").value = Math.round(tw);
    document.getElementById("totalH").value = Math.round(th);
    document.getElementById("legW").value = Math.round(lw);
    document.getElementById("legH").value = Math.round(lh);

    updateUI();
}

function refreshWarnings() {
    const tw = parseFloat(document.getElementById("totalW").value);
    const th = parseFloat(document.getElementById("totalH").value);
    const tooBig = (Math.max(tw, th) > 2400 || Math.min(tw, th) > 1200);
    document.getElementById("sheetWarning").style.display = tooBig ? "block" : "none";
}

function getRawPoints() {
    const tw = parseFloat(document.getElementById("totalW").value) || 1000;
    const th = parseFloat(document.getElementById("totalH").value) || 800;
    const lw = parseFloat(document.getElementById("legW").value) || 300;
    const lh = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";

    // Standard Right L Points
    let pts = [
        [0, 0], [tw, 0], [tw, lh], [lw, lh], [lw, th], [0, th]
    ];

    if (isLeft) {
        pts = pts.map(p => [tw - p[0], p[1]]);
    }
    return pts;
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas");
    const ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = getRawPoints();
    const intR = parseFloat(document.getElementById("intRadNum").value) || 50;
    const extR = parseFloat(document.getElementById("extRadNum").value) || 0;

    // Scaling
    const margin = 120;
    const tw = parseFloat(document.getElementById("totalW").value);
    const th = parseFloat(document.getElementById("totalH").value);
    const scale = Math.min((canvas.width - margin * 2) / tw, (canvas.height - margin * 2) / th);
    const offX = (canvas.width - tw * scale) / 2;
    const offY = (canvas.height - th * scale) / 2;

    // Build the list of rounded commands for the path
    const corners = [
        { p: pts[0], r: document.getElementById("round0").checked ? extR : 0 },
        { p: pts[1], r: document.getElementById("round1").checked ? extR : 0 },
        { p: pts[2], r: document.getElementById("round2").checked ? extR : 0 },
        { p: pts[3], r: intR }, // Always internal
        { p: pts[4], r: document.getElementById("round4").checked ? extR : 0 },
        { p: pts[5], r: document.getElementById("round5").checked ? extR : 0 }
    ];

    ctx.beginPath();
    const startX = corners[0].p[0] * scale + offX;
    const startY = (th - corners[0].p[1]) * scale + offY;
    ctx.moveTo(startX, startY);

    for (let i = 0; i < 6; i++) {
        const next = corners[(i + 1) % 6];
        const nextNext = corners[(i + 2) % 6];
        const x1 = next.p[0] * scale + offX;
        const y1 = (th - next.p[1]) * scale + offY;
        const x2 = nextNext.p[0] * scale + offX;
        const y2 = (th - nextNext.p[1]) * scale + offY;
        ctx.arcTo(x1, y1, x2, y2, next.r * scale);
    }
    ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.stroke();

    // Banding Logic (simplified for demonstration, uses straight segments)
    drawLDimensions(ctx, pts, scale, offX, offY, th);
}

function drawLDimensions(ctx, pts, scale, offX, offY, th) {
    ctx.font = "14px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    // Draws main bounding dimensions
    const tw = parseFloat(document.getElementById("totalW").value);
    const totalH = parseFloat(document.getElementById("totalH").value);
    
    // Bottom
    ctx.fillText(`${tw} mm`, offX + (tw*scale)/2, offY + (totalH*scale) + 40);
    // Left
    ctx.save();
    ctx.translate(offX - 40, offY + (totalH*scale)/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`${totalH} mm`, 0, 0);
    ctx.restore();
}

function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext("2d");
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawLShape(tctx);
    const link = document.createElement("a");
    link.download = document.getElementById("fileName").value + ".png";
    link.href = tempCanvas.toDataURL();
    link.click();
}

function downloadDXF() {
    const pts = getRawPoints();
    const th = parseFloat(document.getElementById("totalH").value);
    const name = document.getElementById("fileName").value || "l_shape";
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    
    // Note: To simplify DXF for manufacturing, we export vertices. 
    // In a production environment, you would use 'BULGE' values for arcs.
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (th - p[1]).toFixed(4));
    });
    
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name + ".dxf";
    link.click();
}
