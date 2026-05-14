let highlightedCorner = -1;
let currentSections = [];
const bandingColors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"];

function getEdgeNames() {
    const isLeft = document.getElementById("type").value === "left";
    return isLeft
        ? ["Bottom", "Left Leg", "Inner Top", "Inner Right", "Top", "Right Side"]
        : ["Bottom", "Right Leg", "Inner Top", "Inner Left", "Top", "Left Side"];
}

window.onload = () => {
    const ids = ["type", "totalW", "totalH", "legW", "legH", "rad0", "rad1", "rad2", "rad3", "rad4", "rad5"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT" && el.type === "number") {
                el.addEventListener("input", () => drawLShape());
                el.addEventListener("blur", () => { validateAndClamp(); updateUI(); });
            } else {
                el.addEventListener("change", () => { validateAndClamp(); updateUI(); });
            }
        }
    });

    document.querySelectorAll('.corner-input-wrap').forEach(wrap => {
        wrap.addEventListener('mouseenter', () => { highlightedCorner = parseInt(wrap.dataset.corner); drawLShape(); });
        wrap.addEventListener('mouseleave', () => { highlightedCorner = -1; drawLShape(); });
    });

    new ResizeObserver(() => requestAnimationFrame(drawLShape))
        .observe(document.getElementById("canvas"));

    updateUI();
};

function updateUI() {
    refreshHintsAndWarnings();
    updateBandingUI(getRadii());
    validateRadii();
    drawLShape();
}

function validateAndClamp() {
    const minVal = 200,
        sheetW = 2400,
        sheetH = 1200,
        twIn = document.getElementById("totalW"),
        thIn = document.getElementById("totalH"),
        lwIn = document.getElementById("legW"),
        lhIn = document.getElementById("legH");

    let tw = parseFloat(twIn.value) || minVal;
    let th = parseFloat(thIn.value) || minVal;
    let lw = parseFloat(lwIn.value) || minVal;
    let lh = parseFloat(lhIn.value) || minVal;

    tw = Math.max(minVal, Math.min(tw, sheetW));
    th = Math.max(minVal, Math.min(th, sheetW));

    if (tw > sheetH) th = Math.min(th, sheetH);
    else if (th > sheetH) tw = Math.min(tw, sheetH);

    lw = Math.max(minVal, Math.min(lw, tw - 50));
    lh = Math.max(minVal, Math.min(lh, th - 50));

    twIn.value = Math.round(tw);
    thIn.value = Math.round(th);
    lwIn.value = Math.round(lw);
    lhIn.value = Math.round(lh);
}

function getRadii() {
    return [
        parseFloat(document.getElementById("rad0").value) || 0,
        parseFloat(document.getElementById("rad1").value) || 0,
        parseFloat(document.getElementById("rad2").value) || 0,
        parseFloat(document.getElementById("rad3").value) || 0,
        parseFloat(document.getElementById("rad4").value) || 0,
        parseFloat(document.getElementById("rad5").value) || 0
    ];
}

function isCornerBanded(i, n) {
    let isBanded = false;
    currentSections.forEach((sec, sIdx) => {
        const cb = document.getElementById(`bandSec${sIdx}`);
        if (cb && cb.checked && (sec.includes(i) || sec.includes((i + n - 1) % n))) isBanded = true;
    });
    return isBanded;
}
function validateRadii() {
    let conflict = false;
    let changed = false;
    const radii = getRadii();
    const pts = getPoints();
    const n = pts.length;

    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;

    let maxR3 = Math.min(C, D) - 1;
    if (radii[3] > maxR3) { radii[3] = Math.floor(maxR3); changed = true; }

    let maxR0 = (C + D) - Math.sqrt(2 * C * D);
    if (radii[0] > maxR0) { radii[0] = Math.floor(maxR0); changed = true; }

    for (let i = 0; i < n; i++) {
        if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 50) {
            radii[i] = 50;
            conflict = true;
        }
    }

    let edges = [];
    for (let i = 0; i < n; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % n];
        let vx = p2[0] - p1[0], vy = p2[1] - p1[1], len = Math.hypot(vx, vy) || 1;
        edges.push({ vx: vx / len, vy: vy / len, len });
    }

    let alphas = [];
    for (let i = 0; i < n; i++) {
        let ePrev = edges[(i + n - 1) % n], eNext = edges[i];
        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx;
        let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
        alphas.push(Math.abs(Math.tan(Math.atan2(cross, dot) / 2)));
    }

    for (let iter = 0; iter < 10; iter++) {
        let clamped = false;
        for (let i = 0; i < n; i++) {
            let r1 = radii[i], r2 = radii[(i + 1) % n];
            let d1 = r1 * alphas[i], d2 = r2 * alphas[(i + 1) % n];
            let len = edges[i].len;
            if (d1 + d2 > len + 0.001) {
                let factor = len / (d1 + d2 + 0.0001);
                radii[i] *= factor;
                radii[(i + 1) % n] *= factor;
                clamped = true;
                changed = true;
            }
        }
        if (!clamped) break;
    }

    if (changed || conflict) {
        for (let i = 0; i < n; i++) document.getElementById(`rad${i}`).value = Math.floor(radii[i]);
    }

    let bandingBroken = false;
    for (let i = 0; i < n; i++) if (isCornerBanded(i, n) && radii[i] > 0 && radii[i] < 49.9) bandingBroken = true;

    const warnEl = document.getElementById("radiusWarning");
    warnEl.style.display = (conflict || changed || bandingBroken) ? "block" : "none";
    if (bandingBroken) warnEl.innerHTML = "⚠️ Edge too short! Radii scaled down to prevent overlap, but banded corners require 50mm+ to flex safely.";
    else if (conflict) warnEl.innerHTML = "⚠️ Radii adjusted! Banded corners must be 0mm (sharp joint) or 50mm+ radius to flex.";
    else if (changed) warnEl.innerHTML = "⚠️ Radii scaled down to prevent corners overlapping.";
}

function refreshHintsAndWarnings() {
    const A = parseFloat(document.getElementById("totalW").value) || 200;
    const B = parseFloat(document.getElementById("totalH").value) || 200;

    document.getElementById("sheetWarning").style.display =
        (Math.max(A, B) > 2400 || Math.min(A, B) > 1200) ? "block" : "none";

    document.getElementById("rangeA").textContent = `Min 200 — Max ${B > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeB").textContent = `Min 200 — Max ${A > 1200 ? 1200 : 2400} mm`;
    document.getElementById("rangeC").textContent = `Min 200 — Max ${A - 50} mm`;
    document.getElementById("rangeD").textContent = `Min 200 — Max ${B - 50} mm`;
}

function getPoints() {
    const A = parseFloat(document.getElementById("totalW").value) || 1000;
    const B = parseFloat(document.getElementById("totalH").value) || 800;
    const C = parseFloat(document.getElementById("legW").value) || 300;
    const D = parseFloat(document.getElementById("legH").value) || 300;
    const isLeft = document.getElementById("type").value === "left";

    let pts = [
        [0, 0],
        [A, 0],
        [A, D],
        [C, D],
        [C, B],
        [0, B]
    ];

    if (isLeft) pts = pts.map(p => [A - p[0], p[1]]);
    return pts;
}

function intersectLines(l1, l2) {
    const denom = (l1.x1 - l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 - l2.x2);
    if (Math.abs(denom) < 0.0001) return { x: l1.x2, y: l1.y2 };
    return {
        x: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.x1 - l2.x2) - (l1.x1 - l1.x2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom,
        y: ((l1.x1 * l1.y2 - l1.y1 * l1.x2) * (l2.y1 - l2.y2) - (l1.y1 - l1.y2) * (l2.x1 * l2.y2 - l2.y1 * l2.x2)) / denom
    };
}
function generatePathData(pts, offset, radii, scale = 1, offX = 0, offY = 0) {
    const n = pts.length;
    let area = 0;

    const sPts = pts.map(p => ({ x: p[0] * scale + offX, y: p[1] * scale + offY }));
    for (let i = 0; i < n; i++) {
        area += sPts[i].x * sPts[(i + 1) % n].y - sPts[(i + 1) % n].x * sPts[i].y;
    }

    const CW = area > 0 ? 1 : -1;
    const edges = [];

    for (let i = 0; i < n; i++) {
        const p1 = sPts[i], p2 = sPts[(i + 1) % n];
        let vx = p2.x - p1.x, vy = p2.y - p1.y;
        let len = Math.hypot(vx, vy) || 1;
        vx /= len; vy /= len;
        let nx = vy * CW, ny = -vx * CW;

        edges.push({
            vx,
            vy,
            nx,
            ny,
            offL: {
                x1: p1.x + nx * offset * scale,
                y1: p1.y + ny * offset * scale,
                x2: p2.x + nx * offset * scale,
                y2: p2.y + ny * offset * scale
            }
        });
    }

    let rawCorners = [];
    for (let i = 0; i < n; i++) {
        const ePrev = edges[(i + n - 1) % n];
        const eNext = edges[i];
        const C_off = intersectLines(ePrev.offL, eNext.offL);

        let cross = ePrev.vx * eNext.vy - ePrev.vy * eNext.vx;
        let dot = ePrev.vx * eNext.vx + ePrev.vy * eNext.vy;
        let alpha = Math.atan2(cross, dot);
        let isConvex = (cross * CW) > 0;

        let r = radii[i] * scale;
        let R_off = isConvex ? r + offset * scale : r - offset * scale;
        R_off = Math.max(0, R_off);
        if (r === 0) R_off = 0;

        let d = R_off > 0 ? R_off * Math.abs(Math.tan(alpha / 2)) : 0;

        rawCorners.push({ C_off, R_off, d, alpha, cross, isConvex });
    }

    for (let i = 0; i < n; i++) {
        let c1 = rawCorners[i];
        let c2 = rawCorners[(i + 1) % n];

        let vx = c2.C_off.x - c1.C_off.x;
        let vy = c2.C_off.y - c1.C_off.y;
        let dist = Math.hypot(vx, vy);
        let dot = vx * edges[i].vx + vy * edges[i].vy;
        if (dot < 0) dist = 0;

        if (c1.d + c2.d > dist) {
            let factor = dist / (c1.d + c2.d + 0.0001);
            c1.d *= factor;
            c1.R_off = c1.d / Math.abs(Math.tan(c1.alpha / 2) || 1);
            c2.d *= factor;
            c2.R_off = c2.d / Math.abs(Math.tan(c2.alpha / 2) || 1);
        }
    }

    const corners = [];
    for (let i = 0; i < n; i++) {
        let rc = rawCorners[i];
        let ePrev = edges[(i + n - 1) % n];
        let eNext = edges[i];

        let arcStart = { x: rc.C_off.x - ePrev.vx * rc.d, y: rc.C_off.y - ePrev.vy * rc.d };
        let arcEnd = { x: rc.C_off.x + eNext.vx * rc.d, y: rc.C_off.y + eNext.vy * rc.d };
        let arcCenter = { x: rc.C_off.x, y: rc.C_off.y };

        if (rc.R_off > 0) {
            let outNx = ePrev.vy * CW, outNy = -ePrev.vx * CW;
            let inNx = -outNx, inNy = -outNy;

            if (rc.isConvex) {
                arcCenter = { x: arcStart.x + inNx * rc.R_off, y: arcStart.y + inNy * rc.R_off };
            } else {
                arcCenter = { x: arcStart.x - inNx * rc.R_off, y: arcStart.y - inNy * rc.R_off };
            }
        }

        corners.push({
            C_off: rc.C_off,
            R_off: rc.R_off,
            arcStart,
            arcEnd,
            arcCenter,
            isConvex: rc.isConvex
        });
    }

    return corners;
}

//
//  FIXED POLYLINE BUILDER
//
function buildShapePolyline(corners) {
    const n = corners.length;
    let verts = [];

    const first = corners[0];
    const firstStart = first.R_off > 0 ? first.arcStart : first.C_off;
    verts.push({ x: firstStart.x, y: firstStart.y, bulge: 0 });

    for (let i = 0; i < n; i++) {
        const c = corners[i];
        const next = corners[(i + 1) % n];

        if (c.R_off > 0) {
            const last = verts[verts.length - 1];
            if (Math.hypot(last.x - c.arcStart.x, last.y - c.arcStart.y) > 1e-6) {
                verts.push({ x: c.arcStart.x, y: c.arcStart.y, bulge: 0 });
            }

            const cx = c.arcCenter.x;
            const cy = c.arcCenter.y;

            let aStart = Math.atan2(c.arcStart.y - cy, c.arcStart.x - cx);
            let aEnd   = Math.atan2(c.arcEnd.y   - cy, c.arcEnd.x   - cx);

            let delta = aEnd - aStart;
            while (delta <= -Math.PI) delta += 2 * Math.PI;
            while (delta >  Math.PI)  delta -= 2 * Math.PI;

            if (!c.isConvex) delta = -delta;

            const bulge = Math.tan(delta / 4);

            verts.push({ x: c.arcEnd.x, y: c.arcEnd.y, bulge });
        } else {
            const target = c.C_off;
            const last = verts[verts.length - 1];
            if (Math.hypot(last.x - target.x, last.y - target.y) > 1e-6) {
                verts.push({ x: target.x, y: target.y, bulge: 0 });
            }
        }

        const nextStart = next.R_off > 0 ? next.arcStart : next.C_off;
        const last = verts[verts.length - 1];
        if (Math.hypot(last.x - nextStart.x, last.y - nextStart.y) > 1e-6) {
            verts.push({ x: nextStart.x, y: nextStart.y, bulge: 0 });
        }
    }

    const f = verts[0];
    const l = verts[verts.length - 1];
    if (Math.hypot(l.x - f.x, l.y - f.y) < 1e-6) verts.pop();

    return verts;
}

//
//  DXF EXPORT
//
function downloadDXF() {
    const pts = getPoints();
    const radii = getRadii();

    const shapeCorners = generatePathData(pts, 0, radii, 1, 0, 0);
    const polyVerts = buildShapePolyline(shapeCorners);

    let dxf = [
        "  0","SECTION","  2","HEADER",
        "  9","$ACADVER","  1","AC1009",
        "  0","ENDSEC",
        "  0","SECTION","  2","ENTITIES"
    ];

    dxf.push(
        "  0","LWPOLYLINE",
        "  8","Shape",
        " 90", polyVerts.length.toString(),
        " 70","1",
        " 43","0.0"
    );

    polyVerts.forEach(v => {
        dxf.push(
            " 10", v.x.toFixed(8),
            " 20", v.y.toFixed(8),
            " 42", v.bulge.toFixed(8)
        );
    });

    dxf.push("  0","ENDSEC","  0","EOF");

    const blob = new Blob([dxf.join("\r\n")], { type: "application/dxf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = (document.getElementById("fileName").value || "l_shape") + ".dxf";
    link.click();
}
