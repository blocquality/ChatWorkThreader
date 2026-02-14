/**
 * ChatWork Threader - Popup Script
 * Settings management and i18n
 */

// Internationalization (i18n) translations
const i18n = {
  en: {
    header_description: 'Display messages in threaded view',
    tab_usage: '📖 Usage',
    tab_settings: '⚙️ Settings',
    how_to_use: '📖 How to Use',
    step1: 'Open a ChatWork chat room',
    step2: 'Click the 🌳 button at the bottom right',
    step3: 'Thread list will be displayed',
    step4: 'Click a thread to jump to that message',
    badge_legend: '🏷️ Badge Legend',
    badge_root: 'Root',
    badge_root_desc: 'Message that has replies',
    badge_reply: 'Reply',
    badge_reply_desc: 'Reply to another message',
    badge_both: 'Root+Reply',
    badge_both_desc: 'A reply that also has replies',
    language_setting: 'Language',
    display_language: 'Display Language',
    theme_setting: 'Theme',
    color_theme: 'Color Theme',
    theme_system: 'System default',
    theme_light: 'Light',
    theme_dark: 'Dark',
    collapsed_lines_setting: 'Thread Display',
    collapsed_lines_label: 'Max thread head lines when collapsed',
    collapsed_lines_placeholder: 'Blank = show all',
    auto_save_notice: 'Settings are saved automatically'
  },
  ja: {
    header_description: 'メッセージをスレッド表示',
    tab_usage: '📖 使い方',
    tab_settings: '⚙️ 設定',
    how_to_use: '📖 使い方',
    step1: 'ChatWorkのチャットルームを開く',
    step2: '右下の🌳ボタンをクリック',
    step3: 'スレッド一覧が表示されます',
    step4: 'スレッドをクリックでメッセージにジャンプ',
    badge_legend: '🏷️ バッジの説明',
    badge_root: 'ルート',
    badge_root_desc: '返信があるメッセージ',
    badge_reply: '返信',
    badge_reply_desc: '他のメッセージへの返信',
    badge_both: 'ルート+返信',
    badge_both_desc: '返信かつ返信を持つメッセージ',
    language_setting: '言語',
    display_language: '表示言語',
    theme_setting: 'テーマ',
    color_theme: 'カラーテーマ',
    theme_system: 'システム設定に従う',
    theme_light: 'ライト',
    theme_dark: 'ダーク',
    collapsed_lines_setting: 'スレッド表示',
    collapsed_lines_label: 'スレッドヘッド折り畳み時の最大表示行数',
    collapsed_lines_placeholder: '未設定 = 全行表示',
    auto_save_notice: '設定は自動的に保存されます'
  }
};

// Default settings
const defaultSettings = {
  language: 'en',
  theme: 'system',
  collapsedMaxLines: null
};

// Storage key
const SETTINGS_KEY = 'cw-threader-settings';

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    return { ...defaultSettings, ...result[SETTINGS_KEY] };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return defaultSettings;
  }
}

/**
 * Save settings to chrome.storage
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    // Notify content scripts about settings change
    chrome.tabs.query({ url: 'https://www.chatwork.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          type: 'CW_THREADER_SETTINGS_CHANGED', 
          settings 
        }).catch(() => {
          // Tab might not have content script loaded
        });
      });
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

/**
 * Apply translations to the page
 */
function applyTranslations(lang) {
  const translations = i18n[lang] || i18n.en;
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });

  // Update select option translations
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    const options = themeSelect.querySelectorAll('option');
    options.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key && translations[key]) {
        option.textContent = translations[key];
      }
    });
  }

  // Update placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[key]) {
      el.placeholder = translations[key];
    }
  });

  // Update HTML lang attribute
  document.documentElement.lang = lang;
}

/**
 * Apply theme to the page
 */
function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');

  let isDark = false;
  if (theme === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    body.classList.add(isDark ? 'theme-dark' : 'theme-light');
  } else {
    isDark = theme === 'dark';
    body.classList.add(`theme-${theme}`);
  }

  // Force style on input elements (Chrome ignores CSS for native inputs)
  const inputs = document.querySelectorAll('.setting-input-number');
  inputs.forEach(input => {
    if (isDark) {
      input.style.backgroundColor = '#374151';
      input.style.color = '#e2e8f0';
      input.style.borderColor = 'transparent';
    } else {
      input.style.backgroundColor = '';
      input.style.color = '';
      input.style.borderColor = '';
    }
  });
}

/**
 * Initialize tabs functionality
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');

      // Update active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active tab pane
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === `tab-${tabId}`) {
          pane.classList.add('active');
        }
      });
    });
  });
}

/**
 * Initialize settings controls
 */
async function initSettings() {
  const settings = await loadSettings();

  // Language select
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = settings.language;
    languageSelect.addEventListener('change', async (e) => {
      settings.language = e.target.value;
      await saveSettings(settings);
      applyTranslations(settings.language);
    });
  }

  // Theme select
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = settings.theme;
    themeSelect.addEventListener('change', async (e) => {
      settings.theme = e.target.value;
      await saveSettings(settings);
      applyTheme(settings.theme);
    });
  }

  // Collapsed max lines input
  const collapsedLinesInput = document.getElementById('collapsed-lines-input');
  if (collapsedLinesInput) {
    collapsedLinesInput.value = settings.collapsedMaxLines || '';
    collapsedLinesInput.addEventListener('input', async (e) => {
      const val = e.target.value.trim();
      settings.collapsedMaxLines = val === '' ? null : Math.max(1, parseInt(val, 10) || 1);
      if (settings.collapsedMaxLines !== null) {
        collapsedLinesInput.value = settings.collapsedMaxLines;
      }
      await saveSettings(settings);
    });
  }

  // Apply initial settings
  applyTranslations(settings.language);
  applyTheme(settings.theme);
}

/**
 * Listen for system theme changes
 */
function initSystemThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const settings = await loadSettings();
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSettings();
  initSystemThemeListener();
});
