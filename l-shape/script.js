let highlightedCorner = -1;

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5", "bandAll"];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => updateUI());
            if (el.tagName === "INPUT") {
                el.addEventListener("input", () => updateUI());
                if (id !== "bandAll") el.addEventListener("blur", validateAndClamp);
            }
        }
    });

    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawLShape(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawLShape(); });
    });

    updateUI();
};

function updateUI() { refreshHintsAndWarnings(); drawLShape(); }

function validateAndClamp() {
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
        const r1In = document.getElementById(`rad${i}`), r2In = document.getElementById(`rad${(i + 1) % 6}`);
        let r1 = parseFloat(r1In.value) || 0, r2 = parseFloat(r2In.value) || 0;
        if ((r1 + r2) > sideLengths[i]) {
            conflict = true;
            const factor = sideLengths[i] / (r1 + r2 + 0.1);
            r1In.value = Math.floor(r1 * factor); r2In.value = Math.floor(r2 * factor);
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

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000, B = parseFloat(document.getElementById("totalH").value) || 800, C = parseFloat(document.getElementById("legW").value) || 300, D = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

function intersectLines(e1, e2) {
    const { x1, y1, x2, y2 } = e1, { x1: x3, y1: y3, x2: x4, y2: y4 } = e2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return { x: x2, y: y2 };
    return {
        x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom,
        y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom
    };
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas"), ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = getPoints(), tw = parseFloat(document.getElementById("totalW").value) || 1000, th = parseFloat(document.getElementById("totalH").value) || 800;
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / (tw||1), (canvas.height - margin * 2) / (th||1));
    const offX = (canvas.width - tw * scale) / 2, offY = (canvas.height - th * scale) / 2;
    const isLeft = document.getElementById("type").value === "left";

    // Map exact sharp corner coordinates
    const corners = pts.map((p, i) => ({
        x: p[0] * scale + offX,
        y: (th - p[1]) * scale + offY,
        r: (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale
    }));

    // 1. Draw Clean Black Outline
    ctx.beginPath();
    // Starting in the middle of a straight line ensures arcTo connects the whole loop seamlessly
    const mX = (corners[5].x + corners[0].x) / 2;
    const mY = (corners[5].y + corners[0].y) / 2;
    ctx.moveTo(mX, mY);
    for(let i=0; i<6; i++) {
        const c = corners[i], n = corners[(i+1)%6];
        ctx.arcTo(c.x, c.y, n.x, n.y, c.r);
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // 2. Draw Continuous Red Banding
    if (document.getElementById("bandAll").checked) {
        const offset = 12; // Gap thickness in pixels
        const offCorners = [];
        
        // Mathematically push every line segment out by 12px and find new intersections
        for(let i=0; i<6; i++) {
            const prev = corners[(i+5)%6], curr = corners[i], next = corners[(i+1)%6];
            
            const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y, l1 = Math.hypot(dx1, dy1) || 1;
            const dx2 = next.x - curr.x, dy2 = next.y - curr.y, l2 = Math.hypot(dx2, dy2) || 1;

            // Outward normals for L-Shapes (Left vs Right orientation logic)
            let nx1, ny1, nx2, ny2;
            if (isLeft) { 
                nx1 = dy1/l1; ny1 = -dx1/l1; nx2 = dy2/l2; ny2 = -dx2/l2;
            } else { 
                nx1 = -dy1/l1; ny1 = dx1/l1; nx2 = -dy2/l2; ny2 = dx2/l2;
            }

            const line1 = { x1: prev.x + nx1*offset, y1: prev.y + ny1*offset, x2: curr.x + nx1*offset, y2: curr.y + ny1*offset };
            const line2 = { x1: curr.x + nx2*offset, y1: curr.y + ny2*offset, x2: next.x + nx2*offset, y2: next.y + ny2*offset };

            const inter = intersectLines(line1, line2);

            // Inner Corner (idx 3) is concave, so its offset radius SHRINKS. Convex corners GROW.
            let effR = curr.r + (i === 3 ? -offset : offset);
            if (effR < 0) effR = 0; // Prevent negative radius crash

            offCorners.push({ x: inter.x, y: inter.y, r: effR });
        }

        // Draw perfectly parallel loop
        ctx.beginPath();
        const oMX = (offCorners[5].x + offCorners[0].x) / 2;
        const oMY = (offCorners[5].y + offCorners[0].y) / 2;
        ctx.moveTo(oMX, oMY);
        for(let i=0; i<6; i++) {
            const c = offCorners[i], n = offCorners[(i+1)%6];
            ctx.arcTo(c.x, c.y, n.x, n.y, c.r);
        }
        ctx.closePath();
        ctx.lineWidth = 4; ctx.strokeStyle = "red"; ctx.stroke();
    }

    // Highlighter
    if (highlightedCorner !== -1 && !targetCtx) {
        const c = corners[highlightedCorner];
        ctx.beginPath(); ctx.arc(c.x, c.y, 20, 0, Math.PI * 2); 
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 2; ctx.stroke();
    }
    
    if (!targetCtx) drawLDimensions(ctx, pts, scale, offX, offY, th);
}

function drawLDimensions(ctx, pts, scale, offX, offY, th) {
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
    const pts = getPoints(), th = parseFloat(document.getElementById("totalH").value);
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (th - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
