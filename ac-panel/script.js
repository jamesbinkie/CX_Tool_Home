window.onload = () => {
    const inputs = ["panelOrientation", "ventOrientation", "windowW", "windowH", "ventW", "ventH", "centerH", "centerV", "posX", "posY"];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT" && (el.type === "number" || el.type === "checkbox")) {
                if (el.type === "number") {
                    el.addEventListener("input", () => { drawPanel(); });
                }
                el.addEventListener("blur", () => { validateAndClamp(); updateUI(); });
                el.addEventListener("change", () => { validateAndClamp(); updateUI(); });
            } else if (el.tagName === "SELECT") {
                el.addEventListener("change", () => { 
                    if (id === 'panelOrientation') swapDimensions('windowW', 'windowH');
                    if (id === 'ventOrientation') swapDimensions('ventW', 'ventH');
                    validateAndClamp(); 
                    updateUI(); 
                });
            }
        }
    });
    
    new ResizeObserver(() => {
        requestAnimationFrame(() => drawPanel());
    }).observe(document.getElementById("canvas"));
    
    updateUI();
};

function swapDimensions(wId, hId) {
    const wEl = document.getElementById(wId);
    const hEl = document.getElementById(hId);
    const temp = wEl.value;
    wEl.value = hEl.value;
    hEl.value = temp;
}

function updateUI() {
    const centerH = document.getElementById("centerH").checked;
    const centerV = document.getElementById("centerV").checked;
    const posX = document.getElementById("posX");
    const posY = document.getElementById("posY");
    
    posX.disabled = centerH;
    posY.disabled = centerV;
    
    const wW = parseFloat(document.getElementById("windowW").value) || 0;
    const wH = parseFloat(document.getElementById("windowH").value) || 0;
    const vW = parseFloat(document.getElementById("ventW").value) || 0;
    const vH = parseFloat(document.getElementById("ventH").value) || 0;

    if (centerH) posX.value = Math.max(20, (wW - vW) / 2).toFixed(2);
    if (centerV) posY.value = Math.max(20, (wH - vH) / 2).toFixed(2);
    
    drawPanel();
}

function validateAndClamp() {
    let wW = parseFloat(document.getElementById("windowW").value) || 100;
    let wH = parseFloat(document.getElementById("windowH").value) || 100;
    
    // Minimum panel size to allow for 20mm border x2 (40mm)
    wW = Math.max(100, wW);
    wH = Math.max(100, wH);

    let vW = parseFloat(document.getElementById("ventW").value) || 50;
    let vH = parseFloat(document.getElementById("ventH").value) || 50;
    
    // Enforce maximum inner hole size (leaves a 20mm border on all edges)
    vW = Math.max(10, Math.min(vW, wW - 40));
    vH = Math.max(10, Math.min(vH, wH - 40));
    
    document.getElementById("windowW").value = Math.round(wW);
    document.getElementById("windowH").value = Math.round(wH);
    document.getElementById("ventW").value = Math.round(vW);
    document.getElementById("ventH").value = Math.round(vH);
    
    const centerH = document.getElementById("centerH").checked;
    const centerV = document.getElementById("centerV").checked;

    if (!centerH) {
        let pX = parseFloat(document.getElementById("posX").value) || 0;
        // Clamp position between 20mm and (Width - VentWidth - 20mm)
        pX = Math.max(20, Math.min(pX, wW - vW - 20));
        document.getElementById("posX").value = pX;
    } else {
        document.getElementById("posX").value = ((wW - vW) / 2).toFixed(2);
    }

    if (!centerV) {
        let pY = parseFloat(document.getElementById("posY").value) || 0;
        // Clamp position between 20mm and (Height - VentHeight - 20mm)
        pY = Math.max(20, Math.min(pY, wH - vH - 20));
        document.getElementById("posY").value = pY;
    } else {
        document.getElementById("posY").value = ((wH - vH) / 2).toFixed(2);
    }
}

function getVentPoints() {
    const vW = parseFloat(document.getElementById("ventW").value) || 0;
    const vH = parseFloat(document.getElementById("ventH").value) || 0;
    const posX = parseFloat(document.getElementById("posX").value) || 0;
    const posY = parseFloat(document.getElementById("posY").value) || 0;
    const R = Math.min(vW, vH) / 2;
    
    let p = [];
    const bulgeFactor = 0.41421356; // Standard DXF bulge for 90 degree arc
    
    // Bottom-Left
    p.push({x: posX + R, y: posY, bulge: 0});
    if (vW > 2 * R + 0.001) p.push({x: posX + vW - R, y: posY, bulge: bulgeFactor});
    else p[p.length-1].bulge = bulgeFactor;
    
    // Bottom-Right
    p.push({x: posX + vW, y: posY + R, bulge: 0});
    if (vH > 2 * R + 0.001) p.push({x: posX + vW, y: posY + vH - R, bulge: bulgeFactor});
    else p[p.length-1].bulge = bulgeFactor;
    
    // Top-Right
    p.push({x: posX + vW - R, y: posY + vH, bulge: 0});
    if (vW > 2 * R + 0.001) p.push({x: posX + R, y: posY + vH, bulge: bulgeFactor});
    else p[p.length-1].bulge = bulgeFactor;
    
    // Top-Left
    p.push({x: posX, y: posY + vH - R, bulge: 0});
    if (vH > 2 * R + 0.001) p.push({x: posX, y: posY + R, bulge: bulgeFactor});
    else p[p.length-1].bulge = bulgeFactor;
    
    return p;
}

function drawPanel(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    if (!targetCanvas) {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) { 
            canvas.width = rect.width; canvas.height = rect.height; 
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    const wW = parseFloat(document.getElementById("windowW").value) || 100;
    const wH = parseFloat(document.getElementById("windowH").value) || 100;
    const vW = parseFloat(document.getElementById("ventW").value) || 0;
    const vH = parseFloat(document.getElementById("ventH").value) || 0;
    const posX = parseFloat(document.getElementById("posX").value) || 0;
    const posY = parseFloat(document.getElementById("posY").value) || 0;
    
    const margin = Math.min(canvas.width, canvas.height) * 0.15;
    const scale = Math.min((canvas.width - margin * 2) / wW, (canvas.height - margin * 2) / wH);
    const offX = (canvas.width - wW * scale) / 2;
    const offY = (canvas.height - wH * scale) / 2;
    
    const trX = x => offX + x * scale;
    const trY = y => offY + (wH - y) * scale;
    
    // Draw Outer Shape
    ctx.beginPath();
    ctx.rect(trX(0), trY(wH), wW * scale, wH * scale);
    ctx.lineWidth = Math.max(2, 3 * (canvas.width / 1200)); 
    ctx.strokeStyle = "#000"; 
    ctx.stroke();
    
    // Draw Inner Fully Rounded Rectangle
    const R = Math.min(vW, vH) / 2;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(trX(posX), trY(posY + vH), vW * scale, vH * scale, R * scale);
    } else {
        ctx.rect(trX(posX), trY(posY + vH), vW * scale, vH * scale); // Fallback
    }
    ctx.lineWidth = Math.max(2, 2 * (canvas.width / 1200)); 
    ctx.strokeStyle = "#009fe3"; 
    ctx.stroke();
    
    // Fill the cutout difference for visual context
    ctx.fillStyle = "#dfe8f2";
    ctx.fill("evenodd"); 

    drawDimensions(ctx, wW, wH, vW, vH, posX, posY, scale, offX, offY);
}

function drawDimensions(ctx, wW, wH, vW, vH, posX, posY, scale, offsetX, offsetY) {
    const scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1;
    const dimOffset = 35 * scaleFactor;
    
    const trX = x => offsetX + x * scale;
    const trY = y => offsetY + (wH - y) * scale;
    
    // Panel Outside Dimensions
    drawDimLine(ctx, trX(0), trY(0), trX(wW), trY(0), `${wW} mm`, "below", dimOffset);
    drawDimLine(ctx, trX(0), trY(wH), trX(0), trY(0), `${wH} mm`, "left", dimOffset);
    
    // Vent Cutout Dimensions (Positioned above and to the right of the cutout so they don't overlap)
    drawDimLine(ctx, trX(posX), trY(posY + vH), trX(posX + vW), trY(posY + vH), `${vW}`, "above", 15 * scaleFactor);
    drawDimLine(ctx, trX(posX + vW), trY(posY + vH), trX(posX + vW), trY(posY), `${vH}`, "right", 15 * scaleFactor);
    
    // Offset Dimensions if not centered
    if(!document.getElementById("centerH").checked) {
        drawDimLine(ctx, trX(0), trY(posY + vH/2), trX(posX), trY(posY + vH/2), `${posX}`, "above", 5);
    }
    if(!document.getElementById("centerV").checked) {
        drawDimLine(ctx, trX(posX + vW/2), trY(0), trX(posX + vW/2), trY(posY), `${posY}`, "right", 5);
    }
}

function drawDimLine(ctx, x1, y1, x2, y2, label, position, offset) {
    const scaleFactor = Math.min(ctx.canvas.width / 1200, ctx.canvas.height / 800) || 1;
    ctx.font = `bold ${Math.max(12, 14 * scaleFactor)}px Arial`;
    let lineX1 = x1, lineY1 = y1, lineX2 = x2, lineY2 = y2;
    
    if (position === "above") { lineY1 -= offset; lineY2 -= offset; } 
    else if (position === "below") { lineY1 += offset; lineY2 += offset; } 
    else if (position === "left") { lineX1 -= offset; lineX2 -= offset; } 
    else if (position === "right") { lineX1 += offset; lineX2 += offset; }
    
    ctx.beginPath(); ctx.moveTo(lineX1, lineY1); ctx.lineTo(lineX2, lineY2); 
    ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, 1.5 * scaleFactor); ctx.stroke();
    drawArrow(ctx, lineX1, lineY1, lineX2, lineY2, scaleFactor); 
    drawArrow(ctx, lineX2, lineY2, lineX1, lineY1, scaleFactor);
    
    ctx.textAlign = (position === "left") ? "right" : (position === "right" ? "left" : "center"); 
    ctx.textBaseline = (position === "below") ? "top" : (position === "above" ? "bottom" : "middle");
    
    let textX = (lineX1 + lineX2) / 2, textY = (lineY1 + lineY2) / 2;
    let textOffset = 15 * scaleFactor;
    if (position === "above") textY -= textOffset; 
    else if (position === "below") textY += textOffset; 
    else if (position === "left") textX -= textOffset; 
    else if (position === "right") textX += textOffset;
    
    ctx.fillStyle = "#000"; 
    ctx.fillText(label, textX, textY);
}

function drawArrow(ctx, x1, y1, x2, y2, scaleFactor) {
    const size = 10 * scaleFactor, arrowOffset = 8 * scaleFactor, angle = Math.atan2(y2 - y1, x2 - x1);
    const tipX = x2 + arrowOffset * Math.cos(angle), tipY = y2 + arrowOffset * Math.sin(angle);
    ctx.beginPath(); ctx.moveTo(tipX, tipY); 
    ctx.lineTo(tipX - size * Math.cos(angle - Math.PI / 6), tipY - size * Math.sin(angle - Math.PI / 6)); 
    ctx.lineTo(tipX - size * Math.cos(angle + Math.PI / 6), tipY - size * Math.sin(angle + Math.PI / 6)); 
    ctx.closePath(); ctx.fillStyle = "#000"; ctx.fill();
}

function getDXFPolyline(layer, pts, isClosed) {
    let dxf = ["  0", "POLYLINE", "  8", layer, " 66", "1", " 70", isClosed ? "1" : "0"];
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", layer, " 10", p.x.toFixed(8), " 20", p.y.toFixed(8), " 42", (p.bulge || 0).toFixed(8));
    });
    dxf.push("  0", "SEQEND", "  8", layer);
    return dxf;
}

function downloadPNG() {
    const tempCanvas = document.createElement("canvas"); 
    tempCanvas.width = 3840; tempCanvas.height = 2160;
    const tctx = tempCanvas.getContext("2d"); 
    tctx.fillStyle = "#ffffff"; tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawPanel(tempCanvas);
    const link = document.createElement("a"); 
    link.download = (document.getElementById("fileName").value || "ac_panel") + ".png"; 
    link.href = tempCanvas.toDataURL("image/png"); 
    link.click();
}

function downloadDXF() {
    const wW = parseFloat(document.getElementById("windowW").value) || 100;
    const wH = parseFloat(document.getElementById("windowH").value) || 100;
    
    let dxf = [
        "  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1009", "  0", "ENDSEC",
        "  0", "SECTION", "  2", "TABLES",
        "  0", "TABLE", "  2", "LTYPE", " 70", "1", "  0", "LTYPE", "  2", "CONTINUOUS", " 70", "0", "  3", "Solid line", " 72", "65", " 73", "0", " 40", "0.0", "  0", "ENDTAB",
        "  0", "TABLE", "  2", "LAYER", " 70", "2", 
        "  0", "LAYER", "  2", "Shape", " 70", "0", " 62", "7", "  6", "CONTINUOUS", 
        "  0", "LAYER", "  2", "Internal", " 70", "0", " 62", "1", "  6", "CONTINUOUS", 
        "  0", "ENDTAB", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES"
    ];
    
    // Outer Border (Layer: Shape)
    const outerPts = [
        {x: 0, y: 0, bulge: 0},
        {x: wW, y: 0, bulge: 0},
        {x: wW, y: wH, bulge: 0},
        {x: 0, y: wH, bulge: 0}
    ];
    dxf = dxf.concat(getDXFPolyline("Shape", outerPts, true));
    
    // Inner Vent Hole (Layer: Internal)
    const ventPts = getVentPoints();
    dxf = dxf.concat(getDXFPolyline("Internal", ventPts, true));
    
    dxf.push("  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.download = (document.getElementById("fileName").value || "ac_panel") + ".dxf"; 
    link.click();
}
