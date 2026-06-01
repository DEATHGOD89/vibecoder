/* ==========================================================================
   PromptFlow AI - Storage Manager Module (storage.js)
   ========================================================================== */

const STORAGE_KEYS = {
    API_CONFIG: 'promptflow_api_config',
    HISTORY: 'promptflow_history',
    PREFERENCES: 'promptflow_preferences',
    THEME: 'promptflow_theme'
};

const DEFAULT_PREFERENCES = {
    autoCopy: true,
    markdownPreview: true,
    soundFeedback: false
};

const DEFAULT_API_CONFIG = {
    provider: 'none',
    key: '',
    model: 'gemini-1.5-flash'
};

export const StorageManager = {
    
    // --- API Configuration ---
    getApiConfig() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.API_CONFIG);
            return data ? JSON.parse(data) : { ...DEFAULT_API_CONFIG };
        } catch (e) {
            console.error('Failed to read API config', e);
            return { ...DEFAULT_API_CONFIG };
        }
    },

    saveApiConfig(config) {
        try {
            const current = this.getApiConfig();
            const updated = { ...current, ...config };
            localStorage.setItem(STORAGE_KEYS.API_CONFIG, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.error('Failed to save API config', e);
            return false;
        }
    },

    // --- Preferences ---
    getPreferences() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
            return data ? JSON.parse(data) : { ...DEFAULT_PREFERENCES };
        } catch (e) {
            console.error('Failed to read preferences', e);
            return { ...DEFAULT_PREFERENCES };
        }
    },

    savePreferences(prefs) {
        try {
            const current = this.getPreferences();
            const updated = { ...current, ...prefs };
            localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.error('Failed to save preferences', e);
            return false;
        }
    },

    // --- Theme Config ---
    getTheme() {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    },

    saveTheme(theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },

    // --- Prompt History Database ---
    getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to read prompt history', e);
            return [];
        }
    },

    saveHistoryItem(rawThought, enhancedPrompt, score) {
        try {
            const history = this.getHistory();
            
            // Extract a title from raw thought (first 30 characters)
            let title = rawThought.trim().split('\n')[0];
            if (title.length > 40) {
                title = title.substring(0, 37) + '...';
            }
            if (!title) {
                title = "Assembled Prompt " + (history.length + 1);
            }
            
            const newItem = {
                id: 'pf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                title: title,
                rawThought: rawThought,
                enhancedPrompt: enhancedPrompt,
                score: score,
                timestamp: new Date().toISOString(),
                wordCount: enhancedPrompt.split(/\s+/).filter(Boolean).length
            };
            
            // Add to front of the array
            history.unshift(newItem);
            
            // Cap history at 50 entries to keep browser storage healthy
            if (history.length > 50) {
                history.pop();
            }
            
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
            return newItem;
        } catch (e) {
            console.error('Failed to save prompt item to history', e);
            return null;
        }
    },

    deleteHistoryItem(id) {
        try {
            let history = this.getHistory();
            history = history.filter(item => item.id !== id);
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
            return true;
        } catch (e) {
            console.error('Failed to delete history item', e);
            return false;
        }
    },

    clearAllData() {
        try {
            localStorage.removeItem(STORAGE_KEYS.API_CONFIG);
            localStorage.removeItem(STORAGE_KEYS.HISTORY);
            localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
            localStorage.removeItem(STORAGE_KEYS.THEME);
            return true;
        } catch (e) {
            console.error('Failed to purge local storage', e);
            return false;
        }
    }
};
