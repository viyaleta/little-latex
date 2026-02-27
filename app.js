const inputEl = document.getElementById("latex-input");
const renderTarget = document.getElementById("render-target");
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");
const copyBtn = document.getElementById("copy-btn");
const saveBtn = document.getElementById("save-btn");
const heightMode = document.getElementById("height-mode");
const heightInput = document.getElementById("height-input");
const heightInputGroup = document.getElementById("height-input-group");
const copyLatexBtn = document.getElementById("copy-latex-btn");
const copyMathmlBtn = document.getElementById("copy-mathml-btn");
const clearLatexBtn = document.getElementById("clear-latex-btn");
const clipboardNoteEl = document.getElementById("clipboard-note");
const equationLookupInput = document.getElementById("equation-lookup");
const equationInsertBtn = document.getElementById("equation-insert");
const equationList = document.getElementById("equation-list");
const lookupStatusEl = document.getElementById("lookup-status");
const lookupToggleBtn = document.getElementById("lookup-toggle-btn");
const lookupPanel = document.getElementById("lookup-panel");
const helperButtons = document.querySelectorAll(".helper-btn");
const helpersToggleBtn = document.getElementById("helpers-toggle-btn");
const helpersPanel = document.getElementById("helpers-panel");

const HELPER_SELECTION_TOKEN = "[[sel]]";
const HELPER_CURSOR_TOKEN = "[[cur]]";
const HELPER_NEWLINE_TOKEN = "[[nl]]";

let equationLibrary = [];
let equationIndex = new Map();

const normalizeEquationName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\\s]/g, "")
    .replace(/\\s+/g, " ")
    .trim();

const buildEquationIndex = (library) => {
  const index = new Map();
  library.forEach((entry) => {
    entry.names.forEach((name) => {
      const key = normalizeEquationName(name);
      if (key && !index.has(key)) {
        index.set(key, entry);
      }
    });
  });
  return index;
};

const setLookupStatus = (message, isError = false) => {
  if (!lookupStatusEl) {
    return;
  }
  lookupStatusEl.textContent = message;
  lookupStatusEl.classList.toggle("is-error", isError);
};

const populateEquationDatalist = (library) => {
  if (!equationList) {
    return;
  }
  equationList.innerHTML = "";
  const names = new Set();
  library.forEach((entry) => {
    entry.names.forEach((name) => names.add(name));
  });
  [...names]
    .sort((a, b) => a.localeCompare(b))
    .forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      equationList.appendChild(option);
    });
};

const loadEquationLibrary = async () => {
  try {
    const response = await fetch("./equations.json");
    if (!response.ok) {
      throw new Error("Failed to load equation list.");
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Equation list format is invalid.");
    }
    equationLibrary = data;
    equationIndex = buildEquationIndex(equationLibrary);
    populateEquationDatalist(equationLibrary);
    setLookupStatus("");
  } catch (error) {
    setLookupStatus(
      "Could not load equation list. Run a local server and refresh.",
      true
    );
  }
};

const getClipboardSupportNote = () => {
  const ua = navigator.userAgent || "";
  const isDuckDuckGo = /DuckDuckGo/i.test(ua);
  const isChrome = /Chrome|Chromium/i.test(ua) && !/Edg|OPR|Brave/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave/i.test(ua);

  if (isDuckDuckGo) {
    return "Clipboard copy may be blocked in DuckDuckGo. If it fails, use manual copy.";
  }
  if (isChrome || isEdge) {
    return "Clipboard copy works in Chrome and Edge (secure context required).";
  }
  if (isFirefox) {
    return "Clipboard copy works in Firefox (secure context required).";
  }
  if (isSafari) {
    return "Clipboard copy may be restricted in Safari. If it fails, use manual copy.";
  }
  return "Clipboard copy works in most modern browsers (secure context required).";
};

const normalizeLatexValue = (value) => {
  let normalized = value
    .replace(/\\begin\{align\*\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\*\}/g, "\\end{aligned}")
    .replace(/\\begin\{align\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\}/g, "\\end{aligned}");
  normalized = normalized.replace(/\n/g, (match, offset) => {
    const prevChar = offset > 0 ? normalized[offset - 1] : "";
    return prevChar === "\\" ? "\n" : "\\\\\n";
  });
  return normalized;
};

const renderEquation = () => {
  const rawValue = inputEl.value;
  const value = rawValue.trim();
  errorEl.textContent = "";

  if (!value) {
    renderTarget.textContent = "Type LaTeX to see a preview.";
    return;
  }

  try {
    const normalizedValue = normalizeLatexValue(value);
    katex.render(normalizedValue, renderTarget, {
      throwOnError: true,
      displayMode: true,
    });
  } catch (error) {
    renderTarget.textContent = "";
    errorEl.textContent = error.message;
  }
};

const findEquationByName = (query) => {
  if (!query) {
    return null;
  }
  return equationIndex.get(normalizeEquationName(query)) || null;
};

const insertEquationFromLookup = () => {
  if (!equationLookupInput) {
    return;
  }
  if (!equationLibrary.length) {
    setLookupStatus("Equation list not loaded yet.", true);
    return;
  }
  const query = equationLookupInput.value.trim();
  if (!query) {
    setLookupStatus("Type an equation name to insert it.", true);
    return;
  }
  const match = findEquationByName(query);
  if (!match) {
    setLookupStatus("No match found. Try another name.", true);
    return;
  }
  const separator = inputEl.value && !inputEl.value.endsWith("\n") ? "\n" : "";
  inputEl.value = `${inputEl.value}${separator}${match.latex}`;
  renderEquation();
  setLookupStatus(`Inserted: ${match.names[0]}`);
};

const insertHelperTemplate = (template) => {
  if (!inputEl) {
    return;
  }
  const normalizedTemplate = template.replace(/\\\\/g, "\\");
  const start = inputEl.selectionStart ?? inputEl.value.length;
  const end = inputEl.selectionEnd ?? inputEl.value.length;
  const selection = inputEl.value.slice(start, end);
  const cursorMarker = "__CURSOR__";
  let filled = normalizedTemplate.replaceAll(HELPER_SELECTION_TOKEN, selection);
  filled = filled.replaceAll(HELPER_NEWLINE_TOKEN, "\n");
  filled = filled.replaceAll(HELPER_CURSOR_TOKEN, cursorMarker);

  const before = inputEl.value.slice(0, start);
  const after = inputEl.value.slice(end);
  const cursorIndex = filled.indexOf(cursorMarker);
  const insertText = cursorIndex >= 0 ? filled.replace(cursorMarker, "") : filled;
  const newCursorPos =
    cursorIndex >= 0 ? before.length + cursorIndex : before.length + insertText.length;

  inputEl.value = `${before}${insertText}${after}`;
  inputEl.focus();
  inputEl.setSelectionRange(newCursorPos, newCursorPos);
  renderEquation();
};

const renderToCanvas = async () => {
  const inputValue = inputEl.value || "";
  const latexLineBreaks = (inputValue.match(/\\\\/g) || []).length;
  const newlineBreaks = (inputValue.match(/\n/g) || []).length;
  const combinedBreaks = (inputValue.match(/\\\\\n/g) || []).length;
  const totalBreaks = latexLineBreaks + newlineBreaks - combinedBreaks;
  const lineCount = Math.max(1, totalBreaks + 1);
  const targetHeight =
    heightMode.value === "auto"
      ? 64 * lineCount
      : parseInt(heightInput.value, 10);

  const renderScale = 2.2;
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

const copyLatex = async () => {
  setStatus("");
  try {
    await navigator.clipboard.writeText(inputEl.value || "");
    setStatus("Copied LaTeX.");
  } catch (error) {
    setStatus(`Copy failed: ${error.message}`, true);
  }
};

const copyMathml = async () => {
  setStatus("");
  try {
    const value = (inputEl.value || "").trim();
    if (!value) {
      throw new Error("Nothing to copy.");
    }
    const normalizedValue = normalizeLatexValue(value);
    const mathml = katex.renderToString(normalizedValue, {
      throwOnError: true,
      output: "mathml",
      displayMode: true,
    });
    await navigator.clipboard.writeText(mathml);
    setStatus("Copied MathML.");
  } catch (error) {
    setStatus(`Copy failed: ${error.message}`, true);
  }
};

const clearLatex = () => {
  inputEl.value = "";
  renderEquation();
  setStatus("Cleared LaTeX.");
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

loadEquationLibrary();

if (equationLookupInput && equationInsertBtn) {
  equationInsertBtn.addEventListener("click", insertEquationFromLookup);
  equationLookupInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      insertEquationFromLookup();
    }
  });
  equationLookupInput.addEventListener("input", () => {
    setLookupStatus("");
  });
}

if (lookupToggleBtn && lookupPanel) {
  lookupToggleBtn.addEventListener("click", () => {
    const isHidden = lookupPanel.classList.toggle("is-hidden");
    lookupToggleBtn.textContent = isHidden
      ? "Show equation lookup"
      : "Hide equation lookup";
    if (!isHidden) {
      equationLookupInput?.focus();
    }
  });
}

if (helpersToggleBtn && helpersPanel) {
  helpersToggleBtn.addEventListener("click", () => {
    const isHidden = helpersPanel.classList.toggle("is-hidden");
    helpersToggleBtn.textContent = isHidden ? "Show LaTeX helpers" : "Hide LaTeX helpers";
    if (!isHidden) {
      inputEl?.focus();
    }
  });
}

if (copyLatexBtn) {
  copyLatexBtn.addEventListener("click", copyLatex);
}

if (copyMathmlBtn) {
  copyMathmlBtn.addEventListener("click", copyMathml);
}

if (clearLatexBtn) {
  clearLatexBtn.addEventListener("click", clearLatex);
}

helperButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const template = button.getAttribute("data-template");
    if (!template) {
      return;
    }
    insertHelperTemplate(template);
  });
});

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

if (clipboardNoteEl) {
  clipboardNoteEl.textContent = getClipboardSupportNote();
}
