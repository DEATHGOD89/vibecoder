/* ==========================================================================
   PromptFlow AI - Main App Controller & Orchestrator (app.js)
   ========================================================================== */

import { StorageManager } from './storage.js';
import { EliteTemplates } from './templates.js';
import { PromptDoctor } from './doctor.js';
import { PromptEnhancer } from './enhancer.js';

// --- Web Audio UI Synth System ---
const SoundFX = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    playSoftBeep() {
        if (!StorageManager.getPreferences().soundFeedback) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.008, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    },
    
    playSuccessChime() {
        if (!StorageManager.getPreferences().soundFeedback) return;
        this.init();
        
        const playTone = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
            
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(this.ctx.currentTime + delay);
            osc.stop(this.ctx.currentTime + delay + duration);
        };
        
        playTone(523.25, 0, 0.15); // C5
        playTone(659.25, 0.08, 0.2); // E5
        playTone(783.99, 0.16, 0.35); // G5
    }
};

// --- Custom Markdown Parser ---
function renderMarkdownToHtml(md) {
    if (!md) return '<p class="placeholder-text">Your perfectly compiled prompt will load here. Type a raw draft on the left or use the Architect and click <strong>Enhance</strong>.</p>';
    
    let html = md;
    
    // Basic Sanitization
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        if (lang && lang.toLowerCase() === 'mermaid') {
            // Unescape entities in mermaid code so mermaid.js can parse it properly
            const unescaped = code.trim()
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
            return `<div class="mermaid" style="background-color: rgba(0,0,0,0.1); border: 1px solid var(--border-color); border-radius: 6px; padding: 14px; display: flex; justify-content: center; overflow-x: auto; margin-bottom: 16px;">${unescaped}</div>`;
        }
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Headings
    html = html.replace(/^\s*# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/^\s*## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^\s*### (.*?)$/gm, '<h3>$1</h3>');
    
    // Blockquotes
    html = html.replace(/^\s*&gt;\s*(.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ol>${match}</ol>`);
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    
    // Paragraph splits
    html = html.split(/\n{2,}/).map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<div class="mermaid"')) {
            return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    return html;
}

// --- DOM Cache Elements ---
const DOM = {
    // Nav elements
    navBtns: document.querySelectorAll('.nav-btn'),
    tabPages: document.querySelectorAll('.tab-page'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeToggleLabel: document.getElementById('themeToggleLabel'),
    
    // Quick Enhance Panel
    rawThoughtInput: document.getElementById('rawThoughtInput'),
    quickCharCount: document.getElementById('quickCharCount'),
    clearQuickBtn: document.getElementById('clearQuickBtn'),
    enhanceBtn: document.getElementById('enhanceBtn'),
    
    // Quick Enhance Toggles
    shieldTruncation: document.getElementById('shieldTruncation'),
    shieldComments: document.getElementById('shieldComments'),
    shieldPlanFirst: document.getElementById('shieldPlanFirst'),
    shieldTailwind: document.getElementById('shieldTailwind'),
    
    // Architect Panel
    archRole: document.getElementById('archRole'),
    archGoal: document.getElementById('archGoal'),
    archTasks: document.getElementById('archTasks'),
    archConstraints: document.getElementById('archConstraints'),
    archFormat: document.getElementById('archFormat'),
    resetArchitectBtn: document.getElementById('resetArchitectBtn'),
    compileArchitectBtn: document.getElementById('compileArchitectBtn'),
    
    // Library Panel
    libraryGrid: document.getElementById('libraryGrid'),
    filterChips: document.querySelectorAll('.filter-chip'),
    
    // Settings Panel
    apiProvider: document.getElementById('apiProvider'),
    apiKeyVal: document.getElementById('apiKeyVal'),
    apiKeyWrapper: document.getElementById('apiKeyWrapper'),
    apiModel: document.getElementById('apiModel'),
    toggleApiKeyVis: document.getElementById('toggleApiKeyVis'),
    saveApiConfigBtn: document.getElementById('saveApiConfigBtn'),
    
    prefAutoCopy: document.getElementById('prefAutoCopy'),
    prefMarkdownPreview: document.getElementById('prefMarkdownPreview'),
    prefSoundFeedback: document.getElementById('prefSoundFeedback'),
    clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
    
    // Prompt Doctor Console
    doctorVerdict: document.getElementById('doctorVerdict'),
    doctorScoreRing: document.getElementById('doctorScoreRing'),
    doctorScoreText: document.getElementById('doctorScoreText'),
    doctorAdviceText: document.getElementById('doctorAdviceText'),
    
    chkRole: document.getElementById('chkRole'),
    chkConstraints: document.getElementById('chkConstraints'),
    chkGoal: document.getElementById('chkGoal'),
    chkFormat: document.getElementById('chkFormat'),
    chkLength: document.getElementById('chkLength'),
    
    // Output Workspace
    viewPreviewBtn: document.getElementById('viewPreviewBtn'),
    viewRawBtn: document.getElementById('viewRawBtn'),
    promptMarkdownPreview: document.getElementById('promptMarkdownPreview'),
    promptRawPreview: document.getElementById('promptRawPreview'),
    outputLoader: document.getElementById('outputLoader'),
    
    valWordCount: document.getElementById('valWordCount'),
    valTokenCount: document.getElementById('valTokenCount'),
    downloadMarkdownBtn: document.getElementById('downloadMarkdownBtn'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    
    // History Drawer
    historyDrawerBtn: document.getElementById('historyDrawerBtn'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    historyDrawer: document.getElementById('historyDrawer'),
    closeHistoryDrawerBtn: document.getElementById('closeHistoryDrawerBtn'),
    historySearchInput: document.getElementById('historySearchInput'),
    historyArchiveList: document.getElementById('historyArchiveList'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer'),
    
    // Phase 2 Elements
    quickLanguage: document.getElementById('quickLanguage'),
    exportBackupBtn: document.getElementById('exportBackupBtn'),
    importBackupInput: document.getElementById('importBackupInput'),
    sharePromptLinkBtn: document.getElementById('sharePromptLinkBtn'),
    viewDiffBtn: document.getElementById('viewDiffBtn'),
    promptDiffContainer: document.getElementById('promptDiffContainer'),
    diffInputBox: document.getElementById('diffInputBox'),
    diffOutputBox: document.getElementById('diffOutputBox')
};

// --- App State ---
const State = {
    activePrompt: '',
    activeScore: 0,
    currentTab: 'quick-enhance'
};

// --- Toast System ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.2s reverse forwards';
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}

// --- Dynamic Heuristic Diagnostic Trigger ---
function runLiveDiagnosis(text) {
    const analysis = PromptDoctor.analyze(text);
    
    // Animate Diagnostic Circle
    DOM.doctorScoreText.textContent = analysis.score;
    
    // 326.7 is the stroke-dasharray (circumference of r=52 circle)
    const offset = 326.7 - (326.7 * analysis.score) / 100;
    DOM.doctorScoreRing.style.strokeDashoffset = offset;
    
    // Score Color Adaptation
    let color = '#ef4444'; // Red
    if (analysis.score >= 85) color = '#10b981'; // Mint Green
    else if (analysis.score >= 50) color = '#f59e0b'; // Amber Copper
    DOM.doctorScoreRing.style.stroke = color;
    
    // Verdict Badge
    DOM.doctorVerdict.className = `badge ${analysis.colorClass}`;
    DOM.doctorVerdict.textContent = analysis.verdict;
    
    // Render Advice
    DOM.doctorAdviceText.innerHTML = analysis.advice;
    
    // Checklist checkmarks
    const updateCheckState = (elem, passed) => {
        elem.className = `checklist-item ${passed ? 'passed' : ''}`;
        const icon = elem.querySelector('.chk-icon');
        icon.setAttribute('data-lucide', passed ? 'check-circle-2' : 'circle-dashed');
    };
    
    updateCheckState(DOM.chkRole, analysis.checklist.hasRole);
    updateCheckState(DOM.chkConstraints, analysis.checklist.hasConstraints);
    updateCheckState(DOM.chkGoal, analysis.checklist.hasGoal);
    updateCheckState(DOM.chkFormat, analysis.checklist.hasFormat);
    updateCheckState(DOM.chkLength, analysis.checklist.hasLength);
    
    lucide.createIcons();
    
    return analysis.score;
}

// --- Cost & Latency Auditor Calculations ---
function runAuditorCalculations(promptText) {
    const words = promptText ? promptText.split(/\s+/).filter(Boolean).length : 0;
    const tokens = Math.round(words * 1.35);
    
    // Financial Cost Calculations (Assumes prompt tokens represent 1:1 input/output token balance)
    const costFlashVal = ((tokens * 0.075) + (tokens * 0.30)) / 1000000;
    const costGptVal = ((tokens * 2.50) + (tokens * 10.00)) / 1000000;
    const costDeepseekVal = ((tokens * 0.14) + (tokens * 0.28)) / 1000000;
    const costClaudeVal = ((tokens * 3.00) + (tokens * 15.00)) / 1000000;
    
    const costGeminiElem = document.getElementById('costGemini');
    const costGptElem = document.getElementById('costGpt');
    const costDeepseekElem = document.getElementById('costDeepseek');
    const costClaudeElem = document.getElementById('costClaude');
    
    if (costGeminiElem) costGeminiElem.textContent = `$${costFlashVal.toFixed(6)}`;
    if (costGptElem) costGptElem.textContent = `$${costGptVal.toFixed(6)}`;
    if (costDeepseekElem) costDeepseekElem.textContent = `$${costDeepseekVal.toFixed(6)}`;
    if (costClaudeElem) costClaudeElem.textContent = `$${costClaudeVal.toFixed(6)}`;
}

// --- Sloppy-to-Perfect Diff Builder ---
function runDiffComparisonText() {
    const rawInput = DOM.rawThoughtInput.value.trim() || 'Awaiting input...';
    const enhancedOutput = State.activePrompt || 'Awaiting enhancement...';
    
    // Slurry of fluff words to highlight in red
    const fluffPhrases = [
        /\bi want to\b/gi,
        /\bhelp me\b/gi,
        /\bplease help\b/gi,
        /\bgenerate a\b/gi,
        /\bwrite a\b/gi,
        /\bmake sure\b/gi,
        /\bso basically\b/gi,
        /\bkind of\b/gi,
        /\bsort of\b/gi,
        /\bno error\b/gi,
        /\bthat's it\b/gi,
        /\bi don't think\b/gi,
        /\bsomeone want to\b/gi,
        /\bi just want\b/gi,
        /\bjust let me know\b/gi,
        /\bplease first let me know\b/gi
    ];
    
    let highlightedInput = rawInput;
    fluffPhrases.forEach(regex => {
        highlightedInput = highlightedInput.replace(regex, match => `<span class="highlight-red">${match}</span>`);
    });
    
    // Elite system markers to highlight in green
    const headerPhrases = [
        /# Role/g,
        /# Context & Goal/g,
        /# Specific Checklist Deliverables/g,
        /# Strict Rules & Constraints/g,
        /# Desired Output Format/g,
        /\[STRICT CONSTRAINT\]/g,
        /Anti-Truncation/g,
        /Comment Preservation/g,
        /Architectural Plan First/g,
        /Framework Locking/g
    ];
    
    let highlightedOutput = enhancedOutput
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    headerPhrases.forEach(phrase => {
        const regex = new RegExp(phrase instanceof RegExp ? phrase.source : phrase, 'g');
        highlightedOutput = highlightedOutput.replace(regex, match => `<span class="highlight-green">${match}</span>`);
    });
    
    // Highlight international structural headers if present
    const translatedHeaders = [
        /# Rol/g, /# Contexto y Objetivo/g, /# Entregables Especिफिकोस/g, /# Reglas y Restricciones Estrictas/g, /# Formato de Salida Deseado/g,
        /# Rôle/g, /# Contexte et Objectif/g, /# Livrables Spécifiques/g, /# Règles et Contraintes Strictes/g, /# Format de Sortie Souhaité/g,
        /# 役割/g, /# 文脈と主要目標/g, /# 具体的な成果物チェックリスト/g, /# 厳格なルールと制約事項/g, /# 希望する出力形式/g,
        /# Rolle/g, /# Kontext & Hauptziel/g, /# Spezifische Ergebnisse/g, /# Strikte Regeln & Einschränkungen/g, /# Gewünschtes Ausgabeformat/g,
        /# भूमिका/g, /# संदर्भ और मुख्य लक्ष्य/g, /# विशिष्ट डिलिवरेबल्स/g, /# सख्त नियम और सीमाएं/g, /# वांछित आउटपुट प्रारूप/g
    ];
    translatedHeaders.forEach(regex => {
        highlightedOutput = highlightedOutput.replace(regex, match => `<span class="highlight-green">${match}</span>`);
    });
    
    DOM.diffInputBox.innerHTML = highlightedInput;
    DOM.diffOutputBox.innerHTML = highlightedOutput;
}

// --- Output Refresh UI ---
function updateWorkspace(promptText) {
    State.activePrompt = promptText;
    
    // Set raw textarea
    DOM.promptRawPreview.value = promptText;
    
    // Render HTML Preview
    DOM.promptMarkdownPreview.innerHTML = renderMarkdownToHtml(promptText);
    
    // Count Words & Tokens (Approximation: 1 word ~ 1.3 tokens)
    const words = promptText ? promptText.split(/\s+/).filter(Boolean).length : 0;
    DOM.valWordCount.textContent = words;
    DOM.valTokenCount.textContent = Math.round(words * 1.35);
    
    // Diagnose workspace prompt
    State.activeScore = runLiveDiagnosis(promptText);
    
    // Call auditor metrics calculations
    runAuditorCalculations(promptText);
    
    // Rebuild diff highlighting
    runDiffComparisonText();
    
    // Mermaid dynamic drawing execution
    if (window.mermaid && DOM.promptMarkdownPreview.querySelectorAll('.mermaid').length > 0) {
        setTimeout(() => {
            try {
                window.mermaid.run();
            } catch (e) {
                console.error("Mermaid drawing error:", e);
            }
        }, 50);
    }
}

// --- Prompt History Renderer ---
function drawHistoryArchive() {
    const history = StorageManager.getHistory();
    DOM.historyCountBadge.textContent = history.length;
    
    if (history.length === 0) {
        DOM.historyArchiveList.innerHTML = `
            <div class="empty-history-text">
                <p>No prompts in your archive yet.</p>
                <small>Any prompt you enhance will automatically be recorded here.</small>
            </div>
        `;
        return;
    }
    
    const searchVal = DOM.historySearchInput.value.toLowerCase().trim();
    
    const filteredHistory = history.filter(item => {
        return item.title.toLowerCase().includes(searchVal) || 
               item.rawThought.toLowerCase().includes(searchVal) ||
               item.enhancedPrompt.toLowerCase().includes(searchVal);
    });
    
    DOM.historyArchiveList.innerHTML = '';
    
    filteredHistory.forEach(item => {
        const dateStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        const card = document.createElement('div');
        card.className = 'history-card-item';
        card.setAttribute('data-id', item.id);
        
        card.innerHTML = `
            <div class="history-card-header">
                <span class="history-time">${dateStr}</span>
                <button class="history-delete-btn" title="Delete Archive" data-id="${item.id}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
            <h4>${item.title}</h4>
            <p>${item.rawThought}</p>
        `;
        
        // Restore archive trigger
        card.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete-btn')) return;
            
            updateWorkspace(item.enhancedPrompt);
            DOM.rawThoughtInput.value = item.rawThought;
            DOM.quickCharCount.textContent = `${item.rawThought.length} chars`;
            
            // Switch tabs visually if not in quick enhance
            if (State.currentTab !== 'quick-enhance') {
                switchTab('quick-enhance');
            }
            
            closeDrawer();
            showToast('Prompt loaded from archive!');
            SoundFX.playSoftBeep();
        });
        
        // Delete archive trigger
        card.querySelector('.history-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            StorageManager.deleteHistoryItem(item.id);
            drawHistoryArchive();
            showToast('Item deleted from archive.', 'error');
            SoundFX.playSoftBeep();
        });
        
        DOM.historyArchiveList.appendChild(card);
    });
    
    lucide.createIcons();
}

// --- Drawer Toggles ---
function openDrawer() {
    DOM.historyDrawer.classList.add('open');
    DOM.drawerOverlay.classList.add('open');
    drawHistoryArchive();
    SoundFX.playSoftBeep();
}

function closeDrawer() {
    DOM.historyDrawer.classList.remove('open');
    DOM.drawerOverlay.classList.remove('open');
    SoundFX.playSoftBeep();
}

// --- Tab System Handler ---
function switchTab(tabId) {
    State.currentTab = tabId;
    
    // Toggle Nav Buttons
    DOM.navBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-tab') === tabId;
        btn.classList.toggle('active', isActive);
    });
    
    // Toggle Page Visibilities
    DOM.tabPages.forEach(page => {
        const isCurrent = page.id === `tab-${tabId}`;
        page.classList.toggle('active', isCurrent);
    });
    
    SoundFX.playSoftBeep();
}

// --- Render Elite Prompt Library ---
function drawPromptLibrary() {
    DOM.libraryGrid.innerHTML = '';
    
    EliteTemplates.forEach(tpl => {
        const item = document.createElement('div');
        item.className = 'library-item card';
        item.setAttribute('data-category', tpl.category);
        
        item.innerHTML = `
            <div class="library-item-header">
                <span class="library-badge">${tpl.category}</span>
                <i data-lucide="${tpl.icon}"></i>
            </div>
            <h4>${tpl.title}</h4>
            <p>${tpl.description}</p>
        `;
        
        item.addEventListener('click', () => {
            updateWorkspace(tpl.prompt);
            
            // Auto fill inputs to make it easy
            if (tpl.category === 'coding') {
                DOM.rawThoughtInput.value = 'Optimize this system:\n[Paste your code here]';
            } else {
                DOM.rawThoughtInput.value = 'Teach me:\n[Paste your topic here]';
            }
            DOM.quickCharCount.textContent = `${DOM.rawThoughtInput.value.length} chars`;
            
            switchTab('quick-enhance');
            showToast('Template template loaded!');
            SoundFX.playSuccessChime();
        });
        
        DOM.libraryGrid.appendChild(item);
    });
    
    lucide.createIcons();
}

// --- Main Event Binding ---
function bindEvents() {
    
    // Sound FX init hook
    document.body.addEventListener('click', () => {
        SoundFX.init();
    }, { once: true });
    
    // Interactive Tab Switches
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });
    
    // Theme Toggle
    DOM.themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark-theme');
        document.body.classList.toggle('dark-theme', !isDark);
        document.body.classList.toggle('light-theme', isDark);
        
        const activeTheme = isDark ? 'light' : 'dark';
        StorageManager.saveTheme(activeTheme);
        DOM.themeToggleLabel.textContent = isDark ? 'Light Theme' : 'Dark Theme';
        
        SoundFX.playSoftBeep();
        showToast(`Theme switched to ${activeTheme} mode.`);
    });
    
    // Quick Enhance Character Counts & dynamic checking
    DOM.rawThoughtInput.addEventListener('input', () => {
        const val = DOM.rawThoughtInput.value;
        DOM.quickCharCount.textContent = `${val.length} chars`;
    });
    
    DOM.clearQuickBtn.addEventListener('click', () => {
        DOM.rawThoughtInput.value = '';
        DOM.quickCharCount.textContent = '0 chars';
        SoundFX.playSoftBeep();
        showToast('Input cleared.');
    });
    
    // Core AI Enhance Core Trigger
    DOM.enhanceBtn.addEventListener('click', async () => {
        const rawThought = DOM.rawThoughtInput.value.trim();
        if (!rawThought) {
            showToast('Please type a thought or prompt first!', 'error');
            return;
        }
        
        DOM.outputLoader.style.display = 'flex';
        SoundFX.playSoftBeep();
        
        try {
            const apiConfig = StorageManager.getApiConfig();
            
            const shields = {
                antiTruncation: DOM.shieldTruncation.checked,
                preserveComments: DOM.shieldComments.checked,
                planFirst: DOM.shieldPlanFirst.checked,
                tailwindLock: DOM.shieldTailwind.checked
            };
            
            const enhancedPrompt = await PromptEnhancer.enhanceWithAi(rawThought, apiConfig, shields, DOM.quickLanguage.value);
            
            // Update UI Workspace
            updateWorkspace(enhancedPrompt);
            
            // Save to local storage
            StorageManager.saveHistoryItem(rawThought, enhancedPrompt, State.activeScore);
            drawHistoryArchive();
            
            // Auto copy configuration
            if (DOM.prefAutoCopy.checked) {
                await navigator.clipboard.writeText(enhancedPrompt);
                showToast('Enhanced prompt copied to clipboard!');
            } else {
                showToast('Prompt enhanced successfully!');
            }
            
            SoundFX.playSuccessChime();
            
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Enhancement failed.', 'error');
        } finally {
            DOM.outputLoader.style.display = 'none';
        }
    });
    
    // Architect Assemble
    DOM.compileArchitectBtn.addEventListener('click', () => {
        const goal = DOM.archGoal.value.trim();
        const role = DOM.archRole.value.trim();
        
        if (!goal && !role) {
            showToast('Specify at least a Core Goal or Role!', 'error');
            return;
        }
        
        const fields = {
            role,
            goal,
            tasks: DOM.archTasks.value.trim(),
            constraints: DOM.archConstraints.value.trim(),
            format: DOM.archFormat.value
        };
        
        const compiledPrompt = PromptEnhancer.assembleArchitectPrompt(fields);
        updateWorkspace(compiledPrompt);
        
        // Auto Save to history drawer
        const summaryText = goal || `Role: ${role}`;
        StorageManager.saveHistoryItem(summaryText, compiledPrompt, State.activeScore);
        drawHistoryArchive();
        
        if (DOM.prefAutoCopy.checked) {
            navigator.clipboard.writeText(compiledPrompt);
            showToast('Assembled prompt copied to clipboard!');
        } else {
            showToast('Prompt assembled successfully!');
        }
        
        // Show Workspace view mode
        DOM.promptMarkdownPreview.classList.remove('hidden');
        DOM.promptRawPreview.classList.add('hidden');
        DOM.viewPreviewBtn.classList.add('active');
        DOM.viewRawBtn.classList.remove('active');
        
        SoundFX.playSuccessChime();
    });
    
    DOM.resetArchitectBtn.addEventListener('click', () => {
        DOM.archRole.value = '';
        DOM.archGoal.value = '';
        DOM.archTasks.value = '';
        DOM.archConstraints.value = '';
        DOM.archFormat.selectedIndex = 0;
        
        SoundFX.playSoftBeep();
        showToast('Architect variables reset.');
    });
    
    // Settings Provider display adjustments
    DOM.apiProvider.addEventListener('change', () => {
        const prov = DOM.apiProvider.value;
        DOM.apiKeyWrapper.style.display = prov === 'none' ? 'none' : 'flex';
        
        // Update model lists dynamically
        DOM.apiModel.innerHTML = '';
        if (prov === 'gemini') {
            DOM.apiModel.innerHTML = `
                <option value="gemini-1.5-flash">gemini-1.5-flash (Lightning fast)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Highly analytical)</option>
            `;
        } else if (prov === 'openai') {
            DOM.apiModel.innerHTML = `
                <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective & quick)</option>
                <option value="gpt-4o">gpt-4o (Ultra-premium reasoning)</option>
            `;
        } else {
            DOM.apiModel.innerHTML = `
                <option value="smart-local">Smart Local Heuristics Compiler</option>
            `;
        }
    });
    
    DOM.toggleApiKeyVis.addEventListener('click', () => {
        const isPass = DOM.apiKeyVal.type === 'password';
        DOM.apiKeyVal.type = isPass ? 'text' : 'password';
        DOM.toggleApiKeyVis.querySelector('i').setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
        lucide.createIcons();
    });
    
    DOM.saveApiConfigBtn.addEventListener('click', () => {
        const config = {
            provider: DOM.apiProvider.value,
            key: DOM.apiKeyVal.value.trim(),
            model: DOM.apiModel.value
        };
        
        StorageManager.saveApiConfig(config);
        
        // Save toggles
        const prefs = {
            autoCopy: DOM.prefAutoCopy.checked,
            markdownPreview: DOM.prefMarkdownPreview.checked,
            soundFeedback: DOM.prefSoundFeedback.checked
        };
        StorageManager.savePreferences(prefs);
        
        SoundFX.playSuccessChime();
        showToast('API and Preferences updated.');
    });
    
    DOM.clearAllHistoryBtn.addEventListener('click', () => {
        if (confirm('CRITICAL: Are you sure you want to delete all cached settings, saved API Keys, and prompt history?')) {
            StorageManager.clearAllData();
            
            // Reload default UI
            DOM.apiKeyVal.value = '';
            DOM.apiProvider.value = 'none';
            DOM.apiProvider.dispatchEvent(new Event('change'));
            
            DOM.prefAutoCopy.checked = true;
            DOM.prefMarkdownPreview.checked = true;
            DOM.prefSoundFeedback.checked = false;
            
            updateWorkspace('');
            drawHistoryArchive();
            
            showToast('All storage data purged completely.', 'error');
            SoundFX.playSoftBeep();
        }
    });
    
    // Workspace Output View toggles
    DOM.viewPreviewBtn.addEventListener('click', () => {
        DOM.promptMarkdownPreview.classList.remove('hidden');
        DOM.promptRawPreview.classList.add('hidden');
        DOM.promptDiffContainer.classList.add('hidden');
        DOM.viewPreviewBtn.classList.add('active');
        DOM.viewRawBtn.classList.remove('active');
        DOM.viewDiffBtn.classList.remove('active');
        SoundFX.playSoftBeep();
    });
    
    DOM.viewRawBtn.addEventListener('click', () => {
        DOM.promptMarkdownPreview.classList.add('hidden');
        DOM.promptRawPreview.classList.remove('hidden');
        DOM.promptDiffContainer.classList.add('hidden');
        DOM.viewPreviewBtn.classList.remove('active');
        DOM.viewRawBtn.classList.add('active');
        DOM.viewDiffBtn.classList.remove('active');
        SoundFX.playSoftBeep();
    });

    DOM.viewDiffBtn.addEventListener('click', () => {
        DOM.promptMarkdownPreview.classList.add('hidden');
        DOM.promptRawPreview.classList.add('hidden');
        DOM.promptDiffContainer.classList.remove('hidden');
        DOM.viewPreviewBtn.classList.remove('active');
        DOM.viewRawBtn.classList.remove('active');
        DOM.viewDiffBtn.classList.add('active');
        runDiffComparisonText();
        SoundFX.playSoftBeep();
    });

    // Backup JSON Export
    DOM.exportBackupBtn.addEventListener('click', () => {
        try {
            const backupData = {
                history: StorageManager.getHistory(),
                theme: StorageManager.getTheme(),
                preferences: StorageManager.getPreferences(),
                apiConfig: StorageManager.getApiConfig()
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `promptflow_backup_${Date.now()}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('JSON Backup exported successfully!');
            SoundFX.playSuccessChime();
        } catch (e) {
            console.error(e);
            showToast('Backup export failed.', 'error');
        }
    });

    // Backup JSON Import
    DOM.importBackupInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.history) {
                    localStorage.setItem('promptflow_history', JSON.stringify(data.history));
                }
                if (data.theme) {
                    StorageManager.saveTheme(data.theme);
                }
                if (data.preferences) {
                    StorageManager.savePreferences(data.preferences);
                }
                if (data.apiConfig) {
                    StorageManager.saveApiConfig(data.apiConfig);
                }
                
                // Refresh App State & UI completely
                initApp();
                showToast('JSON Backup imported & restored successfully!');
                SoundFX.playSuccessChime();
            } catch (err) {
                console.error(err);
                showToast('Invalid backup file structure.', 'error');
            }
        };
        reader.readAsText(file);
    });

    // Base64 Cloud Share Link Generator
    DOM.sharePromptLinkBtn.addEventListener('click', async () => {
        const rawThought = DOM.rawThoughtInput.value.trim();
        if (!rawThought) {
            showToast('Please type a thought or prompt to share first!', 'error');
            return;
        }
        
        const shareData = {
            raw: rawThought,
            lang: DOM.quickLanguage.value,
            shields: {
                truncation: DOM.shieldTruncation.checked,
                comments: DOM.shieldComments.checked,
                planFirst: DOM.shieldPlanFirst.checked,
                tailwind: DOM.shieldTailwind.checked
            }
        };
        
        try {
            // Encode safely with support for Unicode characters
            const jsonStr = JSON.stringify(shareData);
            const base64Str = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode('0x' + p1);
            }));
            
            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(base64Str)}`;
            
            await navigator.clipboard.writeText(shareUrl);
            showToast('Share Link copied to clipboard!');
            SoundFX.playSuccessChime();
        } catch (e) {
            console.error("Encoding share link failed:", e);
            showToast('Failed to generate share link.', 'error');
        }
    });
    
    // Copy Clipboard Trigger
    DOM.copyPromptBtn.addEventListener('click', async () => {
        if (!State.activePrompt) {
            showToast('No prompt in workspace to copy.', 'error');
            return;
        }
        
        await navigator.clipboard.writeText(State.activePrompt);
        showToast('Prompt copied to clipboard!');
        SoundFX.playSuccessChime();
    });
    
    // Download Markdown File Trigger
    DOM.downloadMarkdownBtn.addEventListener('click', () => {
        if (!State.activePrompt) {
            showToast('No prompt in workspace to download.', 'error');
            return;
        }
        
        const blob = new Blob([State.activePrompt], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.setAttribute('download', `promptflow_${Date.now()}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Markdown file downloaded.');
        SoundFX.playSuccessChime();
    });
    
    // History Drawer Events
    DOM.historyDrawerBtn.addEventListener('click', openDrawer);
    DOM.closeHistoryDrawerBtn.addEventListener('click', closeDrawer);
    DOM.drawerOverlay.addEventListener('click', closeDrawer);
    
    DOM.historySearchInput.addEventListener('input', drawHistoryArchive);
    
    // Library filter chip toggles
    DOM.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const filter = chip.getAttribute('data-filter');
            const items = DOM.libraryGrid.querySelectorAll('.library-item');
            
            items.forEach(item => {
                const cat = item.getAttribute('data-category');
                if (filter === 'all' || cat === filter) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
            
            SoundFX.playSoftBeep();
        });
    });
    
    // Sidebar Collapse Trigger
    const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            toggleSidebar();
        });
    }
}

// --- Split Pane resizer for workspace and performance console ---
function initResizer() {
    const resizer = document.getElementById('resizerBar');
    const rightPanel = document.querySelector('.performance-console');
    const container = document.querySelector('.main-content');
    
    if (!resizer || !rightPanel || !container) return;
    
    // Load saved layout width from storage
    const savedWidth = localStorage.getItem('promptflow_layout_right_width');
    if (savedWidth && window.innerWidth > 1024) {
        rightPanel.style.width = savedWidth + 'px';
    }
    
    let startX, startWidth;
    
    resizer.addEventListener('mousedown', (e) => {
        // Only allow left click
        if (e.button !== 0) return;
        
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(rightPanel).width, 10);
        
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        // Sound feedback
        SoundFX.playSoftBeep();
        
        function onMouseMove(e) {
            // Dragging to the left increases the right panel's width
            const deltaX = startX - e.clientX;
            let newWidth = startWidth + deltaX;
            
            // Apply boundaries constraints (Min: 280px, Max: 60% of container width or 800px)
            const containerWidth = container.getBoundingClientRect().width;
            const maxAllowed = Math.min(800, containerWidth * 0.6);
            
            if (newWidth < 280) newWidth = 280;
            if (newWidth > maxAllowed) newWidth = maxAllowed;
            
            rightPanel.style.width = newWidth + 'px';
        }
        
        function onMouseUp() {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save width to localStorage
            const finalWidth = rightPanel.getBoundingClientRect().width;
            localStorage.setItem('promptflow_layout_right_width', finalWidth);
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// --- Sidebar Collapse / Expand Logic ---
function toggleSidebar(forceState) {
    const container = document.querySelector('.app-container');
    const btn = document.getElementById('sidebarCollapseBtn');
    if (!container || !btn) return;
    
    const isCurrentlyCollapsed = container.classList.contains('sidebar-collapsed');
    const shouldCollapse = forceState !== undefined ? forceState : !isCurrentlyCollapsed;
    
    container.classList.toggle('sidebar-collapsed', shouldCollapse);
    
    // Update Lucide icon
    const icon = btn.querySelector('i');
    if (icon) {
        icon.setAttribute('data-lucide', shouldCollapse ? 'panel-left-open' : 'panel-left-close');
    }
    lucide.createIcons();
    
    // Save preference
    localStorage.setItem('promptflow_sidebar_collapsed', shouldCollapse);
    
    // Beep feedback
    SoundFX.playSoftBeep();
}

// --- Initializing Application ---
function initApp() {
    
    // 0. Sidebar Collapse Check & Restore
    const sidebarCollapsed = localStorage.getItem('promptflow_sidebar_collapsed') === 'true';
    if (sidebarCollapsed && window.innerWidth > 1024) {
        toggleSidebar(true);
    }
    
    // 1. Theme Check & Paint
    const savedTheme = StorageManager.getTheme();
    document.body.className = savedTheme === 'dark' ? 'dark-theme' : 'light-theme';
    DOM.themeToggleLabel.textContent = savedTheme === 'dark' ? 'Dark Theme' : 'Light Theme';
    
    // 2. Load API & preferences into controls
    const apiConfig = StorageManager.getApiConfig();
    DOM.apiProvider.value = apiConfig.provider;
    DOM.apiKeyVal.value = apiConfig.key || '';
    DOM.apiProvider.dispatchEvent(new Event('change'));
    DOM.apiModel.value = apiConfig.model;
    
    const prefs = { ...StorageManager.getPreferences() };
    DOM.prefAutoCopy.checked = prefs.autoCopy;
    DOM.prefMarkdownPreview.checked = prefs.markdownPreview;
    DOM.prefSoundFeedback.checked = prefs.soundFeedback;
    
    if (prefs.markdownPreview) {
        DOM.viewPreviewBtn.click();
    } else {
        DOM.viewRawBtn.click();
    }
    
    // 3. Draw static components
    drawPromptLibrary();
    drawHistoryArchive();
    
    // 4. Bind listeners
    bindEvents();
    
    // Layout drag resizer init
    initResizer();
    
    // 5. Build Lucide Icons
    lucide.createIcons();
    
    // 6. Final diagnostic run on empty state
    runLiveDiagnosis('');
    
    // 7. Check for shared Base64 query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    if (shareParam) {
        try {
            // Decode Base64 safely with support for Unicode
            const decodedJsonStr = decodeURIComponent(atob(shareParam).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const data = JSON.parse(decodedJsonStr);
            
            if (data.raw) {
                DOM.rawThoughtInput.value = data.raw;
                DOM.rawThoughtInput.dispatchEvent(new Event('input'));
            }
            if (data.lang) {
                DOM.quickLanguage.value = data.lang;
            }
            if (data.shields) {
                DOM.shieldTruncation.checked = !!data.shields.truncation;
                DOM.shieldComments.checked = !!data.shields.comments;
                DOM.shieldPlanFirst.checked = !!data.shields.planFirst;
                DOM.shieldTailwind.checked = !!data.shields.tailwind;
            }
            
            switchTab('quick-enhance');
            showToast('Workspace loaded from share link!');
            
            // Clean up the URL query parameter so refresh doesn't trigger it again
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error('Decoding share parameter failed:', e);
            showToast('Invalid share link.', 'error');
        }
    }
}

// Kickstart
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('load', () => {
    // If standard browser DOM load is delayed
    if (!DOM.rawThoughtInput) {
        initApp();
    }
});
