import re

with open('static/js/app.js', 'r') as f:
    content = f.read()

# 1. Implement toggleDetection, replace startDetection and stopDetection
toggle_logic = """
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
"""
content = re.sub(r'async function startDetection\(\).*?showToast\(\'🔴 Detection Paused\'\);\n}', toggle_logic, content, flags=re.DOTALL)


# 2. Update switchPage to include pause/resume logic
switch_page_logic = """
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
"""
content = re.sub(r'function switchPage\(pageId, navElement\) \{.*?\n\}', switch_page_logic.strip(), content, flags=re.DOTALL)


with open('static/js/app.js', 'w') as f:
    f.write(content)
