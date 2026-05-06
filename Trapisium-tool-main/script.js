function setupInputs() {
  const ids = ["A", "B", "C", "D", "type", "bandTop", "bandRight", "bandBottom", "bandLeft"];
  ids.forEach(id => {
      const el = document.getElementById(id);
      if (el.tagName === "INPUT" && el.type === "number") {
          el.addEventListener("input", () => { refreshMaxLabels(); drawTrapezium(); });
          el.addEventListener("blur", validateAndClamp);
      } else {
          el.addEventListener("change", () => { refreshMaxLabels(); drawTrapezium(); });
      }
  });
  refreshMaxLabels(); drawTrapezium();
}

function refreshMaxLabels() {
    const Bv = parseFloat(document.getElementById("B").value) || 50;
    const Cv = parseFloat(document.getElementById("C").value) || 20;
    document.getElementById("CmaxLabel").textContent = Math.max(20, Bv - 1);
    document.getElementById("DmaxLabel").textContent = Math.max(0, Bv - Cv);
}

function validateAndClamp() {
    const minVal = 50, sheetW = 2400, sheetH = 1200;
    const aIn = document.getElementById("A"), bIn = document.getElementById("B"), cIn = document.getElementById("C"), dIn = document.getElementById("D");
    let a = parseFloat(aIn.value) || 100, b = parseFloat(bIn.value) || 50, c = parseFloat(cIn.value) || 20, d = parseFloat(dIn.value) || 0;

    // Sheet Limits
    a = Math.max(100, Math.min(a, sheetW));
    b = Math.max(50, Math.min(b, sheetW));
    if (a > sheetH) b = Math.min(b, sheetH); else if (b > sheetH) a = Math.min(a, sheetH);

    // Trapezium Geometry
    c = Math.max(20, Math.min(c, b - 1));
    d = Math.max(0, Math.min(d, b - c));

    aIn.value = a; bIn.value = b; cIn.value = c; dIn.value = d;
    refreshMaxLabels(); drawTrapezium();
}

window.onload = setupInputs;

/* ... keep existing drawTrapezium, drawDimensions, computeOffset, and export functions ... */
/* ... but ensure downloadPNG has the white background logic provided in previous turn ... */
