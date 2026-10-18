const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const originalPreview = document.getElementById("original-preview");
const originalWrapper = document.getElementById("original-wrapper");
const preview = document.getElementById("preview");
const previewWrapper = document.getElementById("preview-wrapper");
const previewOverlay = document.getElementById("preview-overlay");
const resultDiv = document.getElementById("result");
const selectBtn = document.getElementById("select-btn");
const clearBtn = document.getElementById("clear-btn");
const downloadBtn = document.getElementById("download-btn");
const loading = document.getElementById("loading");
const statusPill = document.getElementById("status-pill");
const scanBar = document.getElementById("scan-bar");
const statTotal = document.getElementById("stat-total");
const statPlastic = document.getElementById("stat-plastic");
const statAquatic = document.getElementById("stat-aquatic");
const statConfidence = document.getElementById("stat-confidence");
const bgParticles = document.querySelector(".bg-particles");
const bgOrbA = document.querySelector(".orb-a");
const bgOrbB = document.querySelector(".orb-b");
const bgGrid = document.querySelector(".bg-grid");

let currentDetections = [];
let currentObjectUrl = "";
let scanInterval = null;
let parallaxFrame = null;

// Drag events
dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
});

fileElem.addEventListener("change", () => {
    handleFile(fileElem.files[0]);
});

selectBtn.addEventListener("click", () => {
    fileElem.click();
});

clearBtn.addEventListener("click", () => {
    resetUI(true);
});

downloadBtn.addEventListener("click", downloadResultImage);

window.addEventListener("mousemove", (event) => {
    const xRatio = (event.clientX / window.innerWidth - 0.5) * 2;
    const yRatio = (event.clientY / window.innerHeight - 0.5) * 2;

    if (parallaxFrame) {
        cancelAnimationFrame(parallaxFrame);
    }

    parallaxFrame = requestAnimationFrame(() => {
        if (bgParticles) {
            bgParticles.style.transform = `translate(${(-xRatio * 10).toFixed(2)}px, ${(-yRatio * 10).toFixed(2)}px)`;
        }

        if (bgGrid) {
            bgGrid.style.transform = `translate(${(-xRatio * 4).toFixed(2)}px, ${(-yRatio * 4).toFixed(2)}px)`;
        }

        if (bgOrbA) {
            bgOrbA.style.transform = `translate(${(xRatio * 16).toFixed(2)}px, ${(yRatio * 12).toFixed(2)}px)`;
        }

        if (bgOrbB) {
            bgOrbB.style.transform = `translate(${(-xRatio * 18).toFixed(2)}px, ${(-yRatio * 14).toFixed(2)}px)`;
        }
    });
});

function setStatus(label, classes) {
    statusPill.textContent = label;
    statusPill.className = `rounded-full px-3 py-1 text-xs font-medium ${classes}`;
}

function isAquaticLabel(label) {
    const text = String(label || "").toLowerCase();
    return text.includes("fish") || text.includes("turtle") || text.includes("aquatic") || text.includes("marine");
}

function updateStats(detections) {
    const total = detections.length;
    let plasticCount = 0;
    let aquaticCount = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;

    detections.forEach((det) => {
        if (isAquaticLabel(det.label)) {
            aquaticCount += 1;
        } else {
            plasticCount += 1;
        }

        if (Number.isFinite(det.confidence)) {
            confidenceSum += det.confidence;
            confidenceCount += 1;
        }
    });

    statTotal.textContent = String(total);
    statPlastic.textContent = String(plasticCount);
    statAquatic.textContent = String(aquaticCount);

    const avgConfidence = confidenceCount ? Math.round((confidenceSum / confidenceCount) * 100) : 0;
    statConfidence.textContent = `${avgConfidence}%`;
}

function resetStats() {
    statTotal.textContent = "0";
    statPlastic.textContent = "0";
    statAquatic.textContent = "0";
    statConfidence.textContent = "0%";
}

function startScanProgress() {
    if (scanInterval) {
        clearInterval(scanInterval);
    }

    let progress = 16;
    scanBar.style.width = `${progress}%`;

    scanInterval = setInterval(() => {
        progress = progress < 86 ? progress + Math.random() * 10 : 86;
        scanBar.style.width = `${Math.round(progress)}%`;
    }, 200);
}

function stopScanProgress(success) {
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    scanBar.style.width = success ? "100%" : "24%";
}

function extractJson(rawText) {
    if (!rawText) {
        return null;
    }

    const cleaned = rawText.replace(/```json|```/gi, "").trim();
    const firstBrace = cleaned.indexOf("[");
    const lastBrace = cleaned.lastIndexOf("]");

    if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
        return null;
    }

    try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    } catch {
        return null;
    }
}

function clearOverlay() {
    previewOverlay.innerHTML = "";
}

function revokeObjectUrl() {
    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = "";
    }
}

function normalizeDetections(parsed) {
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((item) => {
            const label = typeof item.label === "string" ? item.label.trim() : "unknown";
            return {
                label,
                confidence: Number(item.confidence),
                x: Number(item.x),
                y: Number(item.y),
                width: Number(item.width),
                height: Number(item.height)
            };
        })
        .filter((item) => {
            return Number.isFinite(item.x)
                && Number.isFinite(item.y)
                && Number.isFinite(item.width)
                && Number.isFinite(item.height)
                && item.width > 0
                && item.height > 0;
        });
}

function drawDetections(detections) {
    clearOverlay();

    if (!detections.length || !preview.naturalWidth || !preview.naturalHeight) {
        return;
    }

    const scaleX = preview.clientWidth / preview.naturalWidth;
    const scaleY = preview.clientHeight / preview.naturalHeight;

    detections.forEach((det) => {
        const box = document.createElement("div");
        const boxTypeClass = isAquaticLabel(det.label) ? "is-aquatic" : "is-plastic";

        box.className = `detection-box ${boxTypeClass}`;
        box.style.left = `${Math.max(0, det.x * scaleX)}px`;
        box.style.top = `${Math.max(0, det.y * scaleY)}px`;
        box.style.width = `${Math.max(2, det.width * scaleX)}px`;
        box.style.height = `${Math.max(2, det.height * scaleY)}px`;

        const label = document.createElement("span");
        label.className = "box-label";
        const conf = Number.isFinite(det.confidence) ? ` ${(det.confidence * 100).toFixed(0)}%` : "";
        label.textContent = `${det.label || "object"}${conf}`;

        box.appendChild(label);
        previewOverlay.appendChild(box);
    });
}

function revealPredictionPanel() {
    previewWrapper.classList.remove("hidden");
    requestAnimationFrame(() => {
        drawDetections(currentDetections);
    });
}

function resetUI(askForUpload) {
    currentDetections = [];
    clearOverlay();
    revokeObjectUrl();
    fileElem.value = "";

    originalPreview.removeAttribute("src");
    preview.removeAttribute("src");

    originalWrapper.classList.add("hidden");
    previewWrapper.classList.add("hidden");

    loading.classList.add("hidden");
    loading.classList.remove("flex");

    downloadBtn.disabled = true;
    resetStats();

    setStatus("Idle", "bg-slate-800 text-slate-300");
    resultDiv.innerHTML = `
        <div class="rounded-xl border border-white/10 bg-slate-800/60 p-4 text-sm text-slate-300">
            Upload an image to view detection insights.
        </div>
    `;

    if (askForUpload) {
        fileElem.click();
    }
}

preview.addEventListener("load", () => {
    drawDetections(currentDetections);
});

window.addEventListener("resize", () => {
    drawDetections(currentDetections);
});

function renderResult(rawResultText) {
    const parsed = extractJson(rawResultText);
    const detections = normalizeDetections(parsed);

    currentDetections = detections;
    updateStats(detections);
    revealPredictionPanel();

    if (detections.length) {
        const wasteCount = detections.filter((det) => !isAquaticLabel(det.label)).length;
        const aquaticCount = detections.filter((det) => isAquaticLabel(det.label)).length;
        const defaultFilter = wasteCount > 0 ? "waste" : "aquatic";

        resultDiv.innerHTML = `
            <div class="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                ${detections.length} object${detections.length > 1 ? "s" : ""} detected and localized.
            </div>
            <div class="table-shell p-4">
                <p class="mb-2 text-xs uppercase tracking-wider text-slate-300">Quick Filter</p>
                <select id="quick-filter-select" class="quick-detection-select w-full rounded-lg border border-cyan-300/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none">
                    <option value="waste" ${defaultFilter === "waste" ? "selected" : ""}>Waste</option>
                    <option value="aquatic" ${defaultFilter === "aquatic" ? "selected" : ""}>Aquatic</option>
                </select>
                <p class="mt-4 mb-2 text-xs uppercase tracking-wider text-slate-300">All Detections</p>
                <p id="filtered-count" class="mb-2 text-xs text-slate-400"></p>
                <div class="detection-scroll-container max-h-72 overflow-y-auto pr-1">
                    <ul id="filtered-detection-list" class="space-y-2">
                    </ul>
                </div>
            </div>
        `;

        const quickFilterSelect = document.getElementById("quick-filter-select");
        const filteredCount = document.getElementById("filtered-count");
        const filteredList = document.getElementById("filtered-detection-list");

        const renderFilteredList = (filterType) => {
            const filtered = detections.filter((det) => {
                return filterType === "aquatic" ? isAquaticLabel(det.label) : !isAquaticLabel(det.label);
            });

            filteredCount.textContent = `${filtered.length} ${filterType} detection${filtered.length === 1 ? "" : "s"}`;

            if (!filtered.length) {
                filteredList.innerHTML = `
                    <li class="rounded-xl border border-white/10 bg-slate-800/65 p-3 text-xs text-slate-300">
                        No ${filterType} detections found for this image.
                    </li>
                `;
                return;
            }

            filteredList.innerHTML = filtered.map((det, index) => {
                const conf = Number.isFinite(det.confidence) ? det.confidence.toFixed(2) : "N/A";
                const aquatic = isAquaticLabel(det.label);
                return `
                    <li class="detection-item rounded-xl border border-white/10 bg-slate-800/65 p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="label-pill ${aquatic ? "aquatic" : "plastic"}">${det.label}</span>
                            <span class="text-xs text-slate-300">#${index + 1}</span>
                        </div>
                        <div class="mt-2 grid gap-1 text-xs text-slate-300 sm:grid-cols-3">
                            <p><span class="text-slate-400">Confidence:</span> ${conf}</p>
                            <p><span class="text-slate-400">Position:</span> (${Math.round(det.x)}, ${Math.round(det.y)})</p>
                            <p><span class="text-slate-400">Size:</span> ${Math.round(det.width)} x ${Math.round(det.height)}</p>
                        </div>
                    </li>
                `;
            }).join("");
        };

        quickFilterSelect.addEventListener("change", (event) => {
            renderFilteredList(event.target.value);
        });

        renderFilteredList(defaultFilter);

        setStatus(`Detected ${detections.length}`, "bg-emerald-500/20 text-emerald-200");
        downloadBtn.disabled = false;
        return;
    }

    clearOverlay();
    resultDiv.innerHTML = `
        <div class="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            No valid detections found in model output.
        </div>
    `;

    setStatus("No detections", "bg-amber-400/20 text-amber-100");
    downloadBtn.disabled = true;
}

function downloadResultImage() {
    if (!preview.naturalWidth || !preview.naturalHeight) {
        return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = preview.naturalWidth;
    canvas.height = preview.naturalHeight;

    ctx.drawImage(preview, 0, 0, canvas.width, canvas.height);

    currentDetections.forEach((det) => {
        const aquatic = isAquaticLabel(det.label);
        const x = Math.round(det.x);
        const y = Math.round(det.y);
        const width = Math.round(det.width);
        const height = Math.round(det.height);
        const label = `${det.label} ${Math.round((det.confidence || 0) * 100)}%`;

        ctx.lineWidth = 3;
        ctx.strokeStyle = aquatic ? "#22c55e" : "#f97316";
        ctx.strokeRect(x, y, width, height);

        ctx.font = "600 18px Sora, sans-serif";
        const textWidth = ctx.measureText(label).width + 14;
        const textY = Math.max(24, y - 8);

        ctx.fillStyle = aquatic ? "rgba(21, 128, 61, 0.88)" : "rgba(194, 65, 12, 0.88)";
        ctx.fillRect(x, textY - 22, textWidth, 24);
        ctx.fillStyle = "#ecfeff";
        ctx.fillText(label, x + 7, textY - 5);
    });

    const link = document.createElement("a");
    link.download = "aquascan-result.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
        setStatus("Invalid file", "bg-rose-500/20 text-rose-200");
        resultDiv.innerHTML = `
            <div class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                Please upload a valid image file.
            </div>
        `;
        return;
    }

    currentDetections = [];
    clearOverlay();
    revokeObjectUrl();
    downloadBtn.disabled = true;
    resetStats();

    currentObjectUrl = URL.createObjectURL(file);
    originalPreview.src = currentObjectUrl;
    preview.src = currentObjectUrl;
    originalWrapper.classList.remove("hidden");
    previewWrapper.classList.add("hidden");

    loading.classList.remove("hidden");
    setStatus("Analyzing", "bg-cyan-500/20 text-cyan-200");
    startScanProgress();

    resultDiv.innerHTML = `
        <div class="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Working on your image analysis...
        </div>
    `;

    let formData = new FormData();
    formData.append("image", file);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        renderResult(data.result || "");
        stopScanProgress(true);
    })
    .catch((error) => {
        setStatus("Failed", "bg-rose-500/20 text-rose-200");
        stopScanProgress(false);
        resultDiv.innerHTML = `
            <div class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                Upload failed: ${error.message}
            </div>
        `;
    })
    .finally(() => {
        loading.classList.add("hidden");
    });
}