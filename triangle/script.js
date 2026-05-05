// -------------------------------
// INITIALIZATION
// -------------------------------
window.onload = () => {
    const inputs = ["type", "isSymmetric", "W", "H", "sideA", "sideB", "sideC", "band1", "band2", "band3"];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener("change", updateUIAndDraw);
        if (document.getElementById(id).tagName === "INPUT") {
            document.getElementById(id).addEventListener("input", updateUIAndDraw);
        }
    });
    updateUIAndDraw();
};

function updateUIAndDraw() {
    const type = document.getElementById("type").value;
    const isSymmetric = document.getElementById("isSymmetric").checked;
    
    // UI Visibility Logic
    document.getElementById("wh-controls").style.display = (type !== "standard" || isSymmetric) ? "flex" : "none";
    document.getElementById("standard-toggle-wrap").style.display = (type === "standard") ? "flex" : "none";
    document.getElementById("abc-controls").style.display = (type === "standard" && !isSymmetric) ? "flex" : "none";

    drawTriangle();
}

// -------------------------------
// GEOMETRY & DRAWING
// -------------------------------
function getPoints() {
    const type = document.getElementById("type").value;
    const W = Number(document.getElementById("W").value);
    const H = Number(document.getElementById("H").value);
    
    if (type === "right") return [[0, H], [W, H], [0, 0]];
    if (type === "left") return [[0, H], [W, H], [W, 0]];
    
    if (document.getElementById("isSymmetric").checked) {
        return [[0, H], [W, H], [W / 2, 0]];
    } else {
        // A, B, C Logic (Side C is Base)
        const a = Number(document.getElementById("sideA").value);
        const b = Number(document.getElementById("sideB").value);
        const c = Number(document.getElementById("sideC").value);
        
        // Triangle Inequality Check
        if (a + b <= c || a + c <= b || b + c <= a) return [[0, 0], [100, 0], [50, 50]]; 

        const x = (b * b + c * c - a * a) / (2 * c);
        const y = Math.sqrt(Math.max(0, b * b - x * x));
        return [[0, y], [c, y], [x, 0]];
    }
}

function calculateAngles(pts) {
    const angles = [];
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i];
        const p0 = pts[(i + 2) % 3];
        const p2 = pts[(i + 1) % 3];

        const v1 = { x: p0[0] - p1[0], y: p0[1] - p1[1] };
        const v2 = { x: p2[0] - p1[0], y: p2[1] - p1[1] };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        angles.push(Math.acos(dot / mag) * (180 / Math.PI));
    }
    return angles;
}

function drawTriangle(targetCanvas = null) {
    const canvas = targetCanvas || document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const pts = getPoints();
    const angles = calculateAngles(pts);
    const isBanding = document.getElementById("band1").checked || document.getElementById("band2").checked || document.getElementById("band3").checked;

    // Safety Check
    const tooTight = angles.some(a => a < 30);
    document.getElementById("safetyWarning").style.display = (tooTight && isBanding) ? "block" : "none";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scaling
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min((canvas.width - 200) / (maxX - minX || 1), (canvas.height - 200) / (maxY - minY || 1));
    const offX = (canvas.width - (maxX - minX) * scale) / 2 - minX * scale;
    const offY = (canvas.height - (maxY - minY) * scale) / 2 - minY * scale;

    // Main Shape
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * scale + offX, pts[0][1] * scale + offY);
    pts.forEach(p => ctx.lineTo(p[0] * scale + offX, p[1] * scale + offY));
    ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.stroke();

    // Banding
    ctx.strokeStyle = "red"; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
        if (document.getElementById(`band${i+1}`).checked) {
            const p1 = pts[i], p2 = pts[(i + 1) % 3];
            ctx.beginPath();
            ctx.moveTo(p1[0] * scale + offX, p1[1] * scale + offY);
            ctx.lineTo(p2[0] * scale + offX, p2[1] * scale + offY);
            ctx.stroke();
        }
    }

    // Highlight Tight Corners
    if (isBanding) {
        angles.forEach((a, i) => {
            if (a < 30) {
                ctx.beginPath();
                ctx.arc(pts[i][0] * scale + offX, pts[i][1] * scale + offY, 15, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
                ctx.fill();
            }
        });
    }

    drawDimensions(ctx, pts, scale, offX, offY);
}

// -------------------------------
// DIMENSIONS (Adapted from Trapezium)
// -------------------------------
function drawDimensions(ctx, pts, scale, offX, offY) {
    ctx.font = "16px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % 3];
        const dist = Math.sqrt(Math.pow(p2[0]-p1[0], 2) + Math.pow(p2[1]-p1[1], 2));
        const mx = ((p1[0] + p2[0]) / 2) * scale + offX;
        const my = ((p1[1] + p2[1]) / 2) * scale + offY;
        ctx.fillText(`${dist.toFixed(1)} mm`, mx, my - 10);
    }
}

// -------------------------------
// EXPORT (Consolidated logic)
// -------------------------------
function downloadPNG() {
    const canvas = document.getElementById("canvas");
    const link = document.createElement("a");
    link.download = document.getElementById("fileName").value + ".png";
    link.href = canvas.toDataURL();
    link.click();
}

function downloadDXF() {
    const pts = getPoints();
    const maxY = Math.max(...pts.map(p => p[1]));
    let dxf = ["  0", "SECTION", "  2", "HEADER", "  9", "$ACADVER", "  1", "AC1006", "  0", "ENDSEC", "  0", "SECTION", "  2", "ENTITIES", "  0", "POLYLINE", "  8", "0", " 66", "1", " 70", "1"];
    pts.forEach(p => {
        dxf.push("  0", "VERTEX", "  8", "0", " 10", p[0].toFixed(4), " 20", (maxY - p[1]).toFixed(4));
    });
    dxf.push("  0", "SEQEND", "  0", "ENDSEC", "  0", "EOF");
    const blob = new Blob([dxf.join("\n")], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = document.getElementById("fileName").value + ".dxf";
    link.click();
}
