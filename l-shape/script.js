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

// THE NEW GEOMETRY ENGINE: Mathematically precise offsets
function generatePathData(offset) {
    const isLeft = document.getElementById("type").value === "left";
    const A = parseFloat(document.getElementById("totalW").value) || 1000;
    const B = parseFloat(document.getElementById("totalH").value) || 800;
    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;
    
    const canvas = document.getElementById("canvas");
    const margin = 140, scale = Math.min((canvas.width - margin * 2) / A, (canvas.height - margin * 2) / B);
    const offX = (canvas.width - A * scale) / 2, offY = (canvas.height - B * scale) / 2;

    // 1. Map raw vertex points
    let P = [];
    if (!isLeft) {
        P = [
            {x: offX, y: B*scale + offY},
            {x: A*scale + offX, y: B*scale + offY},
            {x: A*scale + offX, y: (B-D)*scale + offY},
            {x: C*scale + offX, y: (B-D)*scale + offY},
            {x: C*scale + offX, y: offY},
            {x: offX, y: offY}
        ];
    } else {
        P = [
            {x: A*scale + offX, y: B*scale + offY},
            {x: offX, y: B*scale + offY},
            {x: offX, y: (B-D)*scale + offY},
            {x: (A-C)*scale + offX, y: (B-D)*scale + offY},
            {x: (A-C)*scale + offX, y: offY},
            {x: A*scale + offX, y: offY}
        ];
    }

    // 2. Define strict outward normal vectors for all 6 edges
    let N = [];
    if (!isLeft) N = [{x:0,y:1}, {x:1,y:0}, {x:0,y:-1}, {x:1,y:0}, {x:0,y:-1}, {x:-1,y:0}];
    else N = [{x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}, {x:-1,y:0}, {x:0,y:-1}, {x:1,y:0}];

    // 3. Find precise offset corner intersections
    let C_off = [];
    for(let i=0; i<6; i++) {
        let prevN = N[(i+5)%6];
        let currN = N[i];
        C_off.push({
            x: P[i].x + (prevN.x !== 0 ? prevN.x : currN.x) * offset,
            y: P[i].y + (prevN.y !== 0 ? prevN.y : currN.y) * offset
        });
    }

    // 4. Determine segment directions
    let dir = [];
    for(let i=0; i<6; i++) {
        let dx = C_off[(i+1)%6].x - C_off[i].x;
        let dy = C_off[(i+1)%6].y - C_off[i].y;
        let len = Math.hypot(dx, dy) || 1;
        dir.push({x: dx/len, y: dy/len});
    }

    // 5. Construct full geometry including arcs
    let corners = [];
    for(let i=0; i<6; i++) {
        let R_orig = (parseFloat(document.getElementById(`rad${i}`).value) || 0) * scale;
        let R_off = R_orig;
        
        // Internal concave corner (idx 3) shrinks on offset, convex ones grow
        if (R_orig > 0) {
            R_off = R_orig + (i === 3 ? -offset : offset);
            R_off = Math.max(0, R_off);
        }

        corners.push({
            C: C_off[i],
            R_off: R_off,
            P_start: { x: C_off[i].x - dir[(i+5)%6].x * R_off, y: C_off[i].y - dir[(i+5)%6].y * R_off },
            P_end: { x: C_off[i].x + dir[i].x * R_off, y: C_off[i].y + dir[i].y * R_off }
        });
    }

    return { corners, scale, offX, offY, th: B };
}

function drawLShape(targetCtx = null) {
    const canvas = document.getElementById("canvas"), ctx = targetCtx || canvas.getContext("2d");
    if (!targetCtx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outlineData = generatePathData(0);
    const bandingData = generatePathData(12);

    // 1. Draw Master Outline
    ctx.beginPath();
    ctx.moveTo(outlineData.corners[0].P_end.x, outlineData.corners[0].P_end.y);
    for(let i=1; i<=6; i++) {
        let c = outlineData.corners[i%6];
        ctx.lineTo(c.P_start.x, c.P_start.y);
        if (c.R_off > 0) ctx.arcTo(c.C.x, c.C.y, c.P_end.x, c.P_end.y, c.R_off);
    }
    ctx.closePath();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#000"; ctx.stroke();

    // 2. Draw Colored Sectional Banding
    if (document.getElementById("bandAll").checked) {
        const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];
        
        // Find a sharp 90-deg corner to start drawing the first section from
        let startIndex = 0;
        for(let i=0; i<6; i++) {
            if (bandingData.corners[i].R_off === 0) { startIndex = i; break; }
        }

        let currColorIdx = 0;
        ctx.beginPath();
        ctx.moveTo(bandingData.corners[startIndex].P_end.x, bandingData.corners[startIndex].P_end.y);
        ctx.strokeStyle = colors[currColorIdx];
        ctx.lineWidth = 4;

        for(let step=1; step<=6; step++) {
            let i = (startIndex + step) % 6;
            let c = bandingData.corners[i];
            
            // Draw line to the start of the corner
            ctx.lineTo(c.P_start.x, c.P_start.y);

            if (c.R_off > 0) {
                // Smooth Corner: Continue the same colored line through the arc
                ctx.arcTo(c.C.x, c.C.y, c.P_end.x, c.P_end.y, c.R_off);
            } else {
                // Sharp Corner: End the line exactly at the vertex point
                ctx.lineTo(c.C.x, c.C.y);
                ctx.stroke();

                // Swap colors and begin new section if not the last step
                if (step < 6) {
                    currColorIdx++;
                    ctx.beginPath();
                    ctx.moveTo(c.C.x, c.C.y);
                    ctx.strokeStyle = colors[currColorIdx % colors.length];
                    ctx.lineWidth = 4;
                }
            }
        }
        ctx.stroke(); // Ensure the final line closes
    }

    if (highlightedCorner !== -1 && !targetCtx) {
        const cp = outlineData.corners[highlightedCorner];
        ctx.beginPath(); ctx.arc(cp.C.x, cp.C.y, 25, 0, Math.PI * 2); 
        ctx.fillStyle = "rgba(0, 159, 227, 0.25)"; ctx.fill(); ctx.strokeStyle = "#009fe3"; ctx.lineWidth = 3; ctx.stroke();
    }
    
    if (!targetCtx) drawLDimensions(ctx, outlineData.scale, outlineData.offX, outlineData.offY, outlineData.th);
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
    const A = parseFloat(document.getElementById("totalW").value) || 1000;
    const B = parseFloat(document.getElementById("totalH").value) || 800;
    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;
    
    let pts = [[0, 0], [A, 0], [A, D], [C, D], [C, B], [0, B]];
    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);

    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (B - p[1]).toFixed(4)));
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf"; link.click();
}
