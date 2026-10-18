/* ============================================================
   EcoVision AI — app.js  (v2 — Multi-Feature Edition)

   Features:
     ✅ Green/Red glowing bounding boxes per category
     ✅ Per-box directional sorting arrows (← left / → right)
     ✅ Carbon footprint facts drawn on canvas + shown in HUD
     ✅ Multi-language: English / Tamil (press E or T)
     ✅ Voice feedback in selected language
   ============================================================ */

'use strict';

// ── DOM ──────────────────────────────────────────────────────
const rawVideo      = document.getElementById('rawVideo');
const captureCanvas = document.getElementById('captureCanvas');
const displayCanvas = document.getElementById('displayCanvas');
const ctx           = displayCanvas.getContext('2d');
const capCtx        = captureCanvas.getContext('2d');

const labelText       = document.getElementById('labelText');
const labelIcon       = document.getElementById('labelIcon');
const badge           = document.getElementById('classificationBadge');
const badgeText       = document.getElementById('badgeText');
const instructionText = document.getElementById('instructionText');
const confValue       = document.getElementById('confValue');
const confidenceFill  = document.getElementById('confidenceFill');
const hudObjects      = document.getElementById('hudObjects');
const hudBio          = document.getElementById('hudBio');
const hudNonBio       = document.getElementById('hudNonBio');
const leftBin         = document.getElementById('leftBin');
const rightBin        = document.getElementById('rightBin');
const toast           = document.getElementById('toast');
const btnVoice        = document.getElementById('btnVoice');
const permError       = document.getElementById('permError');
const carbonFactEl    = document.getElementById('carbonFact');
const langIndicator   = document.getElementById('langIndicator');
const btnLang         = document.getElementById('btnLang');

// Waste log panels
const logListBio      = document.getElementById('logListBio');
const logListNonBio   = document.getElementById('logListNonBio');
const logCountBio     = document.getElementById('logCountBio');
const logCountNonBio  = document.getElementById('logCountNonBio');

let logBioCount    = 0;
let logNonBioCount = 0;

// ── Config ───────────────────────────────────────────────────
const INFER_MS   = 700;
const BOX_LINGER = 900;
const BOX_FADE   = 500;
const STRIP_H    = 230;

// ── State ────────────────────────────────────────────────────
let voiceEnabled    = true;
let detectionActive = true;
let isBusy          = false;
let lastCategory    = null;
let lastLabel       = null;
let rafId           = null;
let currentBoxes    = [];
let boxTimestamp    = 0;
let currentLang     = 'en';   // 'en' or 'ta'

// ── Multi-Page State ─────────────────────────────────────────
const sessionLogs = [];
let activeModels = [0]; // Default to yolov8n.pt only
let categoryChartInstance = null;
let timelineChartInstance = null;
let topClassesChartInstance = null;
let timelineLabels = [];
let timelineDataDeg = [];
let timelineDataNonDeg = [];

// ── 🌍 Carbon Footprint Facts ────────────────────────────────
const CARBON_FACTS = {
    // Non-degradable
    'bottle':        { years: '450 years',   icon: '🧴', fact: 'Plastic bottles take 450 years to decompose!' },
    'cup':           { years: '50 years',    icon: '🥤', fact: 'Plastic cups take 50 years to decompose!' },
    'wine glass':    { years: '1 million yrs', icon: '🍷', fact: 'Glass takes over 1 million years in a landfill!' },
    'cell phone':    { years: '1,000+ years', icon: '📱', fact: 'E-waste contains toxic metals, lasts 1,000+ yrs!' },
    'laptop':        { years: '1,000+ years', icon: '💻', fact: 'Electronics leach toxins for 1,000+ years!' },
    'fork':          { years: '200 years',   icon: '🍴', fact: 'Plastic cutlery takes up to 200 years to break down!' },
    'knife':         { years: '200 years',   icon: '🔪', fact: 'Plastic knives persist in soil for 200 years!' },
    'spoon':         { years: '200 years',   icon: '🥄', fact: 'Plastic spoons take 200 years to decompose!' },
    'bowl':          { years: '80 years',    icon: '🍜', fact: 'Plastic bowls take ~80 years to break down!' },
    'bag':           { years: '20 years',    icon: '👜', fact: 'Plastic bags take 10-20 years to decompose!' },
    'backpack':      { years: '500+ years',  icon: '🎒', fact: 'Synthetic backpacks persist for 500+ years!' },
    'umbrella':      { years: '200 years',   icon: '☂️',  fact: 'Umbrella plastics take 200 years to degrade!' },
    'vase':          { years: '1M+ years',   icon: '🏺', fact: 'Ceramic/glass vases last over 1 million years!' },
    'scissors':      { years: '100 years',   icon: '✂️',  fact: 'Metal scissors take 100 years to rust away!' },
    'toothbrush':    { years: '500 years',   icon: '🪥', fact: 'Every toothbrush ever made still exists!' },
    'car':           { years: '100+ years',  icon: '🚗', fact: 'Car parts take over 100 years to decompose!' },
    'bicycle':       { years: '100+ years',  icon: '🚲', fact: 'Metal bicycle frames persist for 100+ years!' },
    'skateboard':    { years: '450 years',   icon: '🛹', fact: 'Plastic parts on skateboards last 450 years!' },
    'tv':            { years: '1,000+ years',icon: '📺', fact: 'TV screens contain toxic chemicals, last 1000+ yrs!' },
    // Degradable
    'banana':        { years: '2-5 weeks',   icon: '🍌', fact: 'Banana peels decompose naturally in 2-5 weeks!' },
    'apple':         { years: '2 months',    icon: '🍎', fact: 'Apple cores decompose in about 2 months!' },
    'orange':        { years: '6 months',    icon: '🍊', fact: 'Orange peels take around 6 months to decompose!' },
    'sandwich':      { years: '1-3 weeks',   icon: '🥪', fact: 'Food waste decomposes in as little as 1-3 weeks!' },
    'pizza':         { years: '1-2 weeks',   icon: '🍕', fact: 'Pizza scraps decompose in 1-2 weeks!' },
    'donut':         { years: '1-2 weeks',   icon: '🍩', fact: 'Organic pastry waste decomposes in 1-2 weeks!' },
    'cake':          { years: '1-2 weeks',   icon: '🎂', fact: 'Organic food decomposes in 1-2 weeks!' },
    'broccoli':      { years: '1 month',     icon: '🥦', fact: 'Vegetables decompose in about 1 month!' },
    'carrot':        { years: '1 month',     icon: '🥕', fact: 'Carrots compost naturally in about 1 month!' },
    'hot dog':       { years: '2-4 weeks',   icon: '🌭', fact: 'Cooked food decomposes in 2-4 weeks!' },
    'paper':         { years: '2-6 weeks',   icon: '📄', fact: 'Paper decomposes in just 2-6 weeks — recycle it!' },
    'book':          { years: '2-6 months',  icon: '📚', fact: 'Books take 2-6 months — donate before you toss!' },
};

const DEFAULT_FACT = { years: 'Unknown', icon: '♻️', fact: 'Every item matters — classify and dispose wisely!' };

// ── 🌐 Multi-Language Strings ────────────────────────────────
const LANG_STRINGS = {
    en: {
        badge_degradable:     '✅  DEGRADABLE',
        badge_non_degradable: '⚠️  NON-DEGRADABLE',
        badge_scanning:       '◉  SCANNING',
        instruction_right:    '♻️  Put it in the RIGHT dustbin',
        instruction_left:     '🚯  Put it in the LEFT dustbin',
        instruction_scan:     'Point camera at a waste item',
        bin_left_label:       'NON-DEGRADABLE',
        bin_left_sub:         'Left Bin',
        bin_right_label:      'DEGRADABLE',
        bin_right_sub:        'Right Bin',
        toast_lang:           '🌐 Language: English',
        voice_degradable:     (l) => `${l} detected. Degradable waste. Please put it in the right dustbin.`,
        voice_non_degradable: (l) => `${l} detected. Non-degradable waste. Please put it in the left dustbin.`,
        voice_lang:           'en-US',
        arrow_right:          '→ RIGHT BIN',
        arrow_left:           '← LEFT BIN',
        label_name:           'EN',
    },
    ta: {
        badge_degradable:     '✅  சிதைவுக்குரியது',
        badge_non_degradable: '⚠️  சிதைவற்றது',
        badge_scanning:       '◉  ஸ்கேனிங்...',
        instruction_right:    '♻️  வலது தொட்டியில் போடுங்கள்',
        instruction_left:     '🚯  இடது தொட்டியில் போடுங்கள்',
        instruction_scan:     'கழிவுப் பொருளை காமிருக்கு காட்டுங்கள்',
        bin_left_label:       'சிதைவற்றது',
        bin_left_sub:         'இடது தொட்டி',
        bin_right_label:      'சிதைவுக்குரியது',
        bin_right_sub:        'வலது தொட்டி',
        toast_lang:           '🌐 மொழி: தமிழ்',
        voice_degradable:     (l) => `${l} கண்டறியப்பட்டது. சிதைவுக்குரியது. வலது தொட்டியில் போடுங்கள்.`,
        voice_non_degradable: (l) => `${l} கண்டறியப்பட்டது. சிதைவற்றது. இடது தொட்டியில் போடுங்கள்.`,
        voice_lang:           'ta-IN',
        arrow_right:          '→ வலது தொட்டி',
        arrow_left:           '← இடது தொட்டி',
        label_name:           'தமிழ்',
    },
};

// ── Colours ──────────────────────────────────────────────────
const COLOR = {
    degradable:     { stroke: '#00e676', glow: 'rgba(0,230,118,0.55)', fill: 'rgba(0,230,118,0.08)', text: '#fff', shadow: '0 0 20px #00e676' },
    non_degradable: { stroke: '#ff1744', glow: 'rgba(255,23,68,0.55)',  fill: 'rgba(255,23,68,0.08)',  text: '#fff', shadow: '0 0 20px #ff1744' },
    unknown:        { stroke: '#00b0ff', glow: 'rgba(0,176,255,0.40)',  fill: 'rgba(0,176,255,0.06)',  text: '#fff', shadow: '0 0 20px #00b0ff' },
};

// ── Category → UI ────────────────────────────────────────────
function getCAT(category) {
    const L = LANG_STRINGS[currentLang];
    return {
        degradable: {
            badgeClass:  'badge-degradable',
            badgeLabel:  L.badge_degradable,
            icon:        '🌿',
            instruction: L.instruction_right,
            confGrad:    'linear-gradient(90deg,#00b0ff,#00e676)',
            activeBin:   'right',
            binClass:    'bin-active-green',
            voice:       L.voice_degradable,
        },
        non_degradable: {
            badgeClass:  'badge-non-degradable',
            badgeLabel:  L.badge_non_degradable,
            icon:        '🗑️',
            instruction: L.instruction_left,
            confGrad:    'linear-gradient(90deg,#ff6b6b,#ff1744)',
            activeBin:   'left',
            binClass:    'bin-active-red',
            voice:       L.voice_non_degradable,
        },
        unknown: {
            badgeClass:  'badge-unknown',
            badgeLabel:  L.badge_scanning,
            icon:        '🔍',
            instruction: L.instruction_scan,
            confGrad:    'linear-gradient(90deg,#00b0ff,#00e676)',
            activeBin:   null,
            binClass:    null,
            voice:       null,
        },
    }[category] || {
        badgeClass: 'badge-unknown', badgeLabel: L.badge_scanning, icon: '🔍',
        instruction: L.instruction_scan, confGrad: 'linear-gradient(90deg,#00b0ff,#00e676)',
        activeBin: null, binClass: null, voice: null,
    };
}

// ── Voice ─────────────────────────────────────────────────────
const synth = window.speechSynthesis;
function speak(text) {
    if (!voiceEnabled || !synth) return;
    try {
        synth.cancel();
        const utter  = new SpeechSynthesisUtterance(text);
        utter.lang   = LANG_STRINGS[currentLang].voice_lang;
        utter.rate   = 0.9;
        utter.pitch  = 1.1;
        utter.volume = 1.0;
        const voices = synth.getVoices();
        const langPrefix = currentLang === 'ta' ? 'ta' : 'en';
        const pick = voices.find(v => v.lang.startsWith(langPrefix))
                  || voices.find(v => v.lang.startsWith('en'));
        if (pick) utter.voice = pick;
        synth.speak(utter);
    } catch (_) {}
}
if (synth?.onvoiceschanged !== undefined) synth.onvoiceschanged = () => synth.getVoices();

// ── Language toggle ───────────────────────────────────────────
function setLanguage(lang) {
    currentLang = lang;
    const L = LANG_STRINGS[lang];

    // Update lang indicator pill
    if (langIndicator) langIndicator.textContent = `🌐 ${L.label_name}`;
    if (btnLang) btnLang.textContent = lang === 'en' ? '🌐 தமிழ்' : '🌐 English';

    // Update bin labels
    const binLeftLabel  = document.querySelector('.bin-left  .bin-label');
    const binLeftSub    = document.querySelector('.bin-left  .bin-sub');
    const binRightLabel = document.querySelector('.bin-right .bin-label');
    const binRightSub   = document.querySelector('.bin-right .bin-sub');
    if (binLeftLabel)  binLeftLabel.textContent  = L.bin_left_label;
    if (binLeftSub)    binLeftSub.textContent     = L.bin_left_sub;
    if (binRightLabel) binRightLabel.textContent  = L.bin_right_label;
    if (binRightSub)   binRightSub.textContent    = L.bin_right_sub;

    // Force UI refresh with current category
    lastCategory = null;
    lastLabel    = null;

    showToast(L.toast_lang);
}

function toggleLanguage() {
    setLanguage(currentLang === 'en' ? 'ta' : 'en');
}

// ── Keyboard shortcuts ─────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'e') setLanguage('en');
    if (key === 't') setLanguage('ta');
    if (key === 's') toggleDetection();
    if (key === 'x') toggleDetection();
    if (key === 'c') captureFrame();
    if (key === 'v') toggleVoice();
});

// ── Canvas resize ─────────────────────────────────────────────
const cameraWrap = document.getElementById('cameraWrap');
function resizeCanvas() {
    if (cameraWrap) {
        displayCanvas.width  = cameraWrap.clientWidth;
        displayCanvas.height = cameraWrap.clientHeight;
    } else {
        displayCanvas.width  = window.innerWidth;
        displayCanvas.height = window.innerHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Polyfill: rounded rect ────────────────────────────────────
function fillRoundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y,     x + w, y + r,     r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x,     y + h, x,     y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x,     y,     x + r, y,         r);
    c.closePath();
    c.fill();
}

// ── Draw sorting arrow on canvas ──────────────────────────────
function drawSortArrow(box, x1, y1, bw, bh, col, alpha) {
    const L        = LANG_STRINGS[currentLang];
    const isDeg    = box.category === 'degradable';
    const arrowTxt = isDeg ? L.arrow_right : L.arrow_left;

    const fSize = Math.max(10, Math.min(13, bw / 9));
    ctx.font    = `800 ${fSize}px 'Exo 2', Arial, sans-serif`;
    const tw    = ctx.measureText(arrowTxt).width;
    const ph    = fSize + 8;
    const pw    = tw + 16;

    // Place arrow at bottom-center of the bounding box
    const arrowX = x1 + (bw - pw) / 2;
    const arrowY = y1 + bh - ph - 6;
    if (arrowY < y1 + 20) return;   // too small, skip

    ctx.save();
    ctx.globalAlpha = alpha * 0.92;

    // Arrow pill background — pulsing via globalAlpha already
    ctx.fillStyle = col.stroke;
    fillRoundRect(ctx, arrowX, arrowY, pw, ph, 4);

    ctx.fillStyle   = '#000';
    ctx.globalAlpha = alpha;
    ctx.fillText(arrowTxt, arrowX + 8, arrowY + ph - 4);
    ctx.restore();
}

// ── Draw carbon fact pill below box ───────────────────────────
function drawCarbonPill(box, x1, y1, bw, bh, col, alpha) {
    const lbl  = box.label.toLowerCase();
    const info = CARBON_FACTS[lbl] || DEFAULT_FACT;

    const pillTxt = `${info.icon} ${info.years}`;
    const fSize   = Math.max(9, Math.min(12, bw / 10));
    ctx.font      = `600 ${fSize}px 'Manrope', Arial, sans-serif`;
    const tw      = ctx.measureText(pillTxt).width;
    const ph      = fSize + 8;
    const pw      = tw + 16;

    // Place below the bounding box
    const pillX = x1 + (bw - pw) / 2;
    const pillY = y1 + bh + 6;
    const ch    = displayCanvas.height;
    if (pillY + ph > ch - 10) return;  // off screen, skip

    ctx.save();
    ctx.globalAlpha = alpha * 0.88;

    // Dark translucent pill
    ctx.fillStyle = 'rgba(5,10,20,0.85)';
    fillRoundRect(ctx, pillX, pillY, pw, ph, 4);

    // Pill border in category color
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = 1;
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeRect(pillX, pillY, pw, ph);

    // Fact text
    ctx.fillStyle   = '#fff';
    ctx.globalAlpha = alpha;
    ctx.fillText(pillTxt, pillX + 8, pillY + ph - 4);
    ctx.restore();
}

// ── Draw one bounding box ─────────────────────────────────────
function drawBox(box, alpha) {
    try {
        const cw = displayCanvas.width;
        const ch = displayCanvas.height;

        const x1 = box.x1 * cw;
        const y1 = box.y1 * ch;
        const x2 = box.x2 * cw;
        const y2 = box.y2 * ch;
        const bw = x2 - x1;
        const bh = y2 - y1;
        if (bw < 1 || bh < 1) return;

        const col = COLOR[box.category] || COLOR.unknown;

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── Glowing shadow effect
        ctx.shadowColor = col.stroke;
        ctx.shadowBlur  = 18;

        // ── Translucent fill
        ctx.fillStyle = col.fill;
        ctx.fillRect(x1, y1, bw, bh);

        // ── Border with glow
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth   = 2.5;
        ctx.strokeRect(x1, y1, bw, bh);

        // ── HUD L-corner brackets (thicker)
        ctx.shadowBlur  = 8;
        const cs = Math.min(bw * 0.22, bh * 0.22, 22);
        ctx.lineWidth   = 3.5;
        ctx.strokeStyle = col.stroke;
        const corners = [
            [x1, y1,  1,  1],
            [x2, y1, -1,  1],
            [x1, y2,  1, -1],
            [x2, y2, -1, -1],
        ];
        corners.forEach(([px, py, sx, sy]) => {
            ctx.beginPath();
            ctx.moveTo(px + sx * cs, py);
            ctx.lineTo(px, py);
            ctx.lineTo(px, py + sy * cs);
            ctx.stroke();
        });

        ctx.shadowBlur = 0;

        // ── Label pill (top)
        const fSize     = Math.max(11, Math.min(14, bw / 10));
        ctx.font        = `700 ${fSize}px 'Exo 2', Arial, sans-serif`;
        const labelStr  = `${box.label}  ${box.confidence}%`;
        const tw        = ctx.measureText(labelStr).width;
        const ph        = fSize + 10;
        const pw        = tw + 18;
        const pillY     = y1 - ph - 5 >= 0 ? y1 - ph - 5 : y1 + 4;

        ctx.fillStyle = col.stroke;
        fillRoundRect(ctx, x1, pillY, pw, ph, 4);

        ctx.fillStyle   = '#000';
        ctx.globalAlpha = alpha;
        ctx.fillText(labelStr, x1 + 9, pillY + ph - 5);

        ctx.restore();

        // ── Sorting arrow (inside box, bottom area)
        drawSortArrow(box, x1, y1, bw, bh, col, alpha);

        // ── Carbon fact pill (below box)
        drawCarbonPill(box, x1, y1, bw, bh, col, alpha);

    } catch (e) {
        // Swallow individual box errors — never crash the loop
    }
}

// ── RENDER LOOP — crash-safe ──────────────────────────────────
function startRenderLoop() {
    function render() {
        try {
            const cw = displayCanvas.width;
            const ch = displayCanvas.height;

            if (rawVideo.readyState >= rawVideo.HAVE_CURRENT_DATA) {
                const vw = rawVideo.videoWidth  || cw;
                const vh = rawVideo.videoHeight || ch;
                const scale = Math.max(cw / vw, ch / vh);
                const dw    = vw * scale;
                const dh    = vh * scale;
                const dx    = (cw - dw) / 2;
                const dy    = (ch - dh) / 2;
                ctx.drawImage(rawVideo, dx, dy, dw, dh);
            } else {
                ctx.fillStyle = '#050a0e';
                ctx.fillRect(0, 0, cw, ch);
            }

            if (currentBoxes.length > 0) {
                const age = Date.now() - boxTimestamp;
                let alpha = 1;
                if (age > BOX_LINGER) {
                    alpha = Math.max(0, 1 - (age - BOX_LINGER) / BOX_FADE);
                }
                if (alpha > 0) {
                    currentBoxes.forEach(box => drawBox(box, alpha));
                }
            }
        } catch (err) {
            console.warn('[EcoVision] Render error (continuing):', err);
        }
        rafId = requestAnimationFrame(render);
    }
    rafId = requestAnimationFrame(render);
}

// ── INFERENCE ─────────────────────────────────────────────────
function scheduleInference() {
    setTimeout(async () => {
        try {
            if (detectionActive) await sendFrame();
        } catch (_) {}
        scheduleInference();
    }, INFER_MS);
}

async function sendFrame() {
    if (isBusy) return;
    if (!rawVideo.videoWidth || !rawVideo.videoHeight) return;

    isBusy = true;
    try {
        const vw = rawVideo.videoWidth;
        const vh = rawVideo.videoHeight;

        captureCanvas.width  = vw;
        captureCanvas.height = vh;
        capCtx.drawImage(rawVideo, 0, 0, vw, vh);

        const b64 = captureCanvas.toDataURL('image/jpeg', 0.72);

        const res = await fetch('/detect', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ 
                frame: b64,
                active_models: activeModels 
            }),
        });

        if (!res.ok) return;
        const data = await res.json();

        currentBoxes = Array.isArray(data.boxes) ? data.boxes : [];
        boxTimestamp = Date.now();
        updateUI(data);

    } finally {
        isBusy = false;
    }
}

// ── Update HUD ────────────────────────────────────────────────
function updateUI({ label, category, confidence, objects, bio, nonbio }) {
    const cfg = getCAT(category);

    labelText.textContent           = label || 'Scanning...';
    labelIcon.textContent           = cfg.icon;
    badge.className                 = cfg.badgeClass;
    badgeText.innerHTML             = cfg.badgeLabel;
    instructionText.textContent     = cfg.instruction;
    confValue.textContent           = confidence;
    confidenceFill.style.width      = `${confidence}%`;
    confidenceFill.style.background = cfg.confGrad;
    hudObjects.textContent = objects;
    hudBio.textContent     = bio;
    hudNonBio.textContent  = nonbio;

    // ── Carbon fact in HUD
    if (carbonFactEl) {
        if (objects > 0 && label && label !== 'Nothing Detected') {
            const lbl  = label.toLowerCase();
            const info = CARBON_FACTS[lbl] || DEFAULT_FACT;
            carbonFactEl.textContent = `${info.icon} ${info.fact}`;
            carbonFactEl.style.display = 'block';
        } else {
            carbonFactEl.style.display = 'none';
        }
    }

    leftBin.className  = 'bin-panel bin-left';
    rightBin.className = 'bin-panel bin-right';
    if (cfg.activeBin === 'left')  leftBin.classList.add(cfg.binClass);
    if (cfg.activeBin === 'right') rightBin.classList.add(cfg.binClass);

    const changed = category !== lastCategory || label !== lastLabel;
    
    // Always log to history if it's a valid object
    if (changed && objects > 0) {
        addLogEntry(category, label, confidence);
    }

    if (changed && cfg.voice && objects > 0) {
        speak(cfg.voice(label));
        lastCategory = category;
        lastLabel    = label;
    }
    if (objects === 0) { lastCategory = null; lastLabel = null; }
}

// ── Waste Log Entry ───────────────────────────────────────────
function addLogEntry(category, label, confidence) {
    const isDeg = category === 'degradable';
    const list  = isDeg ? logListBio : logListNonBio;

    if (isDeg) logCountBio.textContent    = ++logBioCount;
    else       logCountNonBio.textContent = ++logNonBioCount;

    const empty = list.querySelector('.log-empty');
    if (empty) empty.remove();

    const now  = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Store in global history array
    sessionLogs.unshift({
        time: time,
        label: label,
        category: category,
        confidence: confidence
    });
    
    // Refresh History table and Charts if they are visible, or simply update them in background
    renderHistoryTable();
    updateCharts();

    // Get carbon fact for log
    const info = CARBON_FACTS[label.toLowerCase()] || DEFAULT_FACT;

    const entry = document.createElement('div');
    entry.className = 'log-item';
    entry.innerHTML = `
        <span class="log-item-name">${label}</span>
        <span class="log-item-time">${info.icon} ${info.years} &nbsp;|&nbsp; ${time}</span>
    `;
    list.prepend(entry);

    const entries = list.querySelectorAll('.log-item');
    if (entries.length > 30) entries[entries.length - 1].remove();
}

// ── Camera ────────────────────────────────────────────────────
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
            audio: false,
        });

        rawVideo.srcObject = stream;
        rawVideo.onloadedmetadata = () => {
            rawVideo.play().then(() => {
                showToast('🚀 EcoVision AI — Camera Ready');
                startRenderLoop();
                scheduleInference();
                setLanguage('en');  // init language labels
            }).catch(err => {
                console.error('Video play error:', err);
                permError.style.display = 'flex';
            });
        };
    } catch (err) {
        console.error('Camera access error:', err);
        permError.style.display = 'flex';
        showToast('❌ Camera permission denied');
    }
}

// ── Controls ──────────────────────────────────────────────────

function toggleDetection() {
    const btn = document.getElementById('btnToggle');
    if (detectionActive) {
        try { fetch('/stop'); } catch (_) {}
        detectionActive = false;
        currentBoxes = [];
        updateUI({ label: 'Paused', category: 'unknown', confidence: 0, objects: 0, bio: 0, nonbio: 0 });
        showToast('🔴 Detection Paused');
        if(btn) { btn.textContent = '▶ Start'; btn.className = 'btn btn-primary btn-sm'; }
    } else {
        try { fetch('/start'); } catch (_) {}
        detectionActive = true;
        showToast('🟢 Detection Started');
        if(btn) { btn.textContent = '⏹ Pause'; btn.className = 'btn btn-warning btn-sm'; }
    }
}


async function captureFrame() {
    try {
        const res  = await fetch('/capture');
        const data = await res.json();
        showToast(data.status === 'saved' ? `📷 Saved: ${data.file}` : '⚠️ Nothing to capture');
    } catch (_) {
        showToast('⚠️ Capture failed');
    }
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    btnVoice.classList.toggle('active-voice', voiceEnabled);
    btnVoice.classList.toggle('muted-voice', !voiceEnabled);
    btnVoice.textContent = voiceEnabled ? '🔊 VOICE' : '🔇 MUTED';
    showToast(voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off');
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── SPA Routing ───────────────────────────────────────────────
function switchPage(pageId, navElement) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    // Show target page
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');

    // Update nav classes
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (navElement) {
        navElement.classList.add('active');
    }

    // Pause detection when not on dashboard
    if (pageId === 'dashboard') {
        if (!detectionActive) toggleDetection(); // resume
    } else {
        if (detectionActive) toggleDetection(); // pause
    }

    // Handle special actions on page switch
    if (pageId === 'analytics') {
        updateCharts(); // ensure charts resize and render correctly when shown
    }
}

// ── History Page Logic ────────────────────────────────────────
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    const filterCategory = document.getElementById('filterCategory').value;
    const filterClass = document.getElementById('filterClass').value.toLowerCase();

    // Filter logs
    const filtered = sessionLogs.filter(log => {
        if (filterCategory !== 'all' && log.category !== filterCategory) return false;
        if (filterClass && !log.label.toLowerCase().includes(filterClass)) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center log-empty">No history matches filters</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(log => {
        const catBadge = log.category === 'degradable' 
            ? '<span class="badge badge-bio">Degradable</span>' 
            : '<span class="badge badge-nonbio">Non-Degradable</span>';
        
        return `
            <tr>
                <td>${log.time}</td>
                <td style="font-weight: 600;">${log.label}</td>
                <td>${catBadge}</td>
                <td>${log.confidence}%</td>
            </tr>
        `;
    }).join('');
}

// ── Analytics Page Logic (Chart.js) ───────────────────────────
function initCharts() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // 1. Category Doughnut Chart
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCat) {
        categoryChartInstance = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Degradable', 'Non-Degradable'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#00e676', '#ff1744'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Timeline Line Chart
    const ctxTime = document.getElementById('timelineChart')?.getContext('2d');
    if (ctxTime) {
        timelineChartInstance = new Chart(ctxTime, {
            type: 'line',
            data: {
                labels: timelineLabels,
                datasets: [
                    {
                        label: 'Total Degradable',
                        data: timelineDataDeg,
                        borderColor: '#00e676',
                        backgroundColor: 'rgba(0, 230, 118, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Total Non-Degradable',
                        data: timelineDataNonDeg,
                        borderColor: '#ff1744',
                        backgroundColor: 'rgba(255, 23, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Start a ticker to update timeline every 1 minute (60000ms)
        setInterval(() => {
            const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
            timelineLabels.push(now);
            
            // Plot the cumulative total of objects detected so far
            timelineDataDeg.push(logBioCount);
            timelineDataNonDeg.push(logNonBioCount);
            
            if (timelineLabels.length > 20) {
                timelineLabels.shift();
                timelineDataDeg.shift();
                timelineDataNonDeg.shift();
            }
            if (timelineChartInstance) timelineChartInstance.update('none');
        }, 60000);
    }

    // 3. Top Classes Bar Chart
    const ctxTop = document.getElementById('topClassesChart')?.getContext('2d');
    if (ctxTop) {
        topClassesChartInstance = new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Count',
                    data: [],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
}

function updateCharts() {
    if (!categoryChartInstance) return;

    // Update category breakdown
    categoryChartInstance.data.datasets[0].data = [logBioCount, logNonBioCount];
    categoryChartInstance.update();

    // Update Top 5 Classes
    if (topClassesChartInstance && sessionLogs.length > 0) {
        const counts = {};
        sessionLogs.forEach(log => {
            counts[log.label] = (counts[log.label] || 0) + 1;
        });
        
        // Sort and pick top 5
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        topClassesChartInstance.data.labels = sorted.map(i => i[0]);
        topClassesChartInstance.data.datasets[0].data = sorted.map(i => i[1]);
        topClassesChartInstance.update();
    }
}

// ── Settings Page Logic ───────────────────────────────────────
async function fetchModels() {
    try {
        const res = await fetch('/api/models');
        const models = await res.json();
        
        const container = document.getElementById('modelsList');
        if (!container) return;

        container.innerHTML = models.map(m => `
            <div class="model-item">
                <div class="model-info">
                    <h4>${m.name}</h4>
                    <p class="text-muted" style="font-size: 0.9rem; margin:0; margin-bottom: 4px;">${m.desc}</p>
                    <p class="text-muted" style="font-size: 0.8rem; margin:0; color: var(--accent-primary);"><strong>Detects:</strong> ${m.classes}</p>
                </div>
                <div>
                    <label class="switch">
                        <input type="checkbox" 
                               onchange="toggleModel(${m.id}, this.checked)"
                               ${activeModels.includes(m.id) ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error("Failed to fetch models", e);
    }
}

window.toggleModel = function(id, isChecked) {
    if (isChecked) {
        if (!activeModels.includes(id)) activeModels.push(id);
    } else {
        activeModels = activeModels.filter(m => m !== id);
    }
    showToast(`Model ${isChecked ? 'Enabled' : 'Disabled'}`);
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    startCamera();
    initCharts();
    fetchModels();
});
// ── Theme Logic ────────────────────────────────────────────────
function toggleTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('app-theme', theme);
}

// Load theme on start
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = savedTheme;
        toggleTheme(savedTheme);
    }
});
