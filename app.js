const inputEl = document.getElementById("latex-input");
const renderTarget = document.getElementById("render-target");
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");
const copyBtn = document.getElementById("copy-btn");
const saveBtn = document.getElementById("save-btn");
const heightMode = document.getElementById("height-mode");
const heightInput = document.getElementById("height-input");
const heightInputGroup = document.getElementById("height-input-group");

const renderEquation = () => {
  const rawValue = inputEl.value;
  const value = rawValue.trim();
  errorEl.textContent = "";

  if (!value) {
    renderTarget.textContent = "Type LaTeX to see a preview.";
    return;
  }

  try {
    const normalizedValue = value
      .replace(/\\begin\{align\*\}/g, "\\begin{aligned}")
      .replace(/\\end\{align\*\}/g, "\\end{aligned}")
      .replace(/\\begin\{align\}/g, "\\begin{aligned}")
      .replace(/\\end\{align\}/g, "\\end{aligned}");
    katex.render(normalizedValue, renderTarget, {
      throwOnError: true,
      displayMode: true,
    });
  } catch (error) {
    renderTarget.textContent = "";
    errorEl.textContent = error.message;
  }
};

const renderToCanvas = async () => {
  const inputValue = inputEl.value || "";
  const latexLineBreaks = (inputValue.match(/\\\\/g) || []).length;
  const newlineBreaks = (inputValue.match(/\n/g) || []).length;
  const totalBreaks = latexLineBreaks;
  const lineCount = Math.max(1, totalBreaks + 1);
  const targetHeight =
    heightMode.value === "auto"
      ? 42 * lineCount
      : parseInt(heightInput.value, 10);

  const renderScale = 2;
  const canvas = await html2canvas(renderTarget, {
    backgroundColor: "#ffffff",
    scale: renderScale,
  });
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    return canvas;
  }

  if (canvas.height === targetHeight) {
    return canvas;
  }

  const scale = targetHeight / canvas.height;
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.height = targetHeight;
  scaledCanvas.width = Math.max(1, Math.round(canvas.width * scale));

  const context = scaledCanvas.getContext("2d");
  if (!context) {
    return canvas;
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  return scaledCanvas;
};

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c62525" : "#3852c6";
};

const copyImage = async () => {
  setStatus("");

  try {
    const canvas = await renderToCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    if (!blob) {
      throw new Error("Could not create image blob.");
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);

    setStatus("Copied image to clipboard.");
  } catch (error) {
    setStatus(`Copy failed: ${error.message}`, true);
  }
};

const saveImage = async () => {
  setStatus("");

  try {
    const canvas = await renderToCanvas();
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "equation.png";
    link.click();

    setStatus("Saved PNG.");
  } catch (error) {
    setStatus(`Save failed: ${error.message}`, true);
  }
};

inputEl.addEventListener("input", renderEquation);
inputEl.addEventListener("keydown", (event) => {
  const pairs = {
    "{": "}",
    "(": ")",
    "[": "]",
  };

  const closeChar = pairs[event.key];
  if (!closeChar) {
    return;
  }

  event.preventDefault();

  const start = inputEl.selectionStart;
  const end = inputEl.selectionEnd;
  const value = inputEl.value;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  inputEl.value = `${before}${event.key}${selected}${closeChar}${after}`;
  const caretPos = start + 1 + selected.length;
  inputEl.setSelectionRange(caretPos, caretPos);
  renderEquation();
});
copyBtn.addEventListener("click", copyImage);
saveBtn.addEventListener("click", saveImage);
heightMode.addEventListener("change", () => {
  const isAuto = heightMode.value === "auto";
  heightInput.disabled = isAuto;
  heightInputGroup.classList.toggle("is-hidden", isAuto);
});

heightInput.disabled = true;
heightInputGroup.classList.add("is-hidden");

renderEquation();
