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
    features_title: '🔍 Features',
    feature_thread_view: 'Thread View:',
    feature_thread_view_desc: 'Display messages as a threaded conversation',
    feature_search: 'Search:',
    feature_search_desc: 'Search messages within threads',
    feature_search_nav: 'Search Navigation:',
    feature_search_nav_desc: 'Navigate between search results using ▲▼ buttons',
    feature_filter: 'Filter by Speaker:',
    feature_filter_desc: 'Show only messages from a specific person',
    feature_participation: 'My Participation:',
    feature_participation_desc: 'Show only threads you participated in',
    feature_flat: 'Flat Mode:',
    feature_flat_desc: 'Toggle between tree view and flat list',
    feature_pin: 'Pin Thread:',
    feature_pin_desc: 'Pin important threads to the top of the list',
    feature_collapse: 'Collapse/Expand:',
    feature_collapse_desc: 'Toggle thread replies open or closed by clicking the reply count',
    feature_copy: 'Copy Message:',
    feature_copy_desc: 'Copy message text to clipboard with the 📋 button',
    feature_preview: 'Preview:',
    feature_preview_desc: 'Click preview buttons on files and links to view content',
    feature_jump: 'Jump to Message:',
    feature_jump_desc: 'Click a message to scroll to it in ChatWork',
    feature_track_origin: 'Track Origin:',
    feature_track_origin_desc: 'Auto-load and trace back to the original parent message',
    feature_display_in_thread: 'Display in Thread:',
    feature_display_in_thread_desc: 'Jump from ChatWork messages to the thread panel via the button',
    feature_resize: 'Panel Resize:',
    feature_resize_desc: 'Drag the left edge of the panel to adjust its width',
    feature_highlight: 'Mention Highlight:',
    feature_highlight_desc: 'Messages addressed to you are highlighted in green',
    shortcuts_title: '⌨️ Keyboard Shortcuts',
    shortcut_toggle: 'Toggle thread panel',
    shortcut_close: 'Close panel / Clear search',
    settings_info_title: '⚙️ Settings',
    settings_info_desc: 'Configure language, theme, and collapsed line count in the Settings tab',
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
    features_title: '🔍 機能一覧',
    feature_thread_view: 'スレッド表示:',
    feature_thread_view_desc: 'メッセージをスレッド形式で表示',
    feature_search: '検索:',
    feature_search_desc: 'スレッド内のメッセージを検索',
    feature_search_nav: '検索ナビゲーション:',
    feature_search_nav_desc: '▲▼ボタンで検索結果間を移動',
    feature_filter: '発言者フィルター:',
    feature_filter_desc: '特定の人のメッセージのみ表示',
    feature_participation: '自分の参加:',
    feature_participation_desc: '自分が参加したスレッドのみ表示',
    feature_flat: 'フラットモード:',
    feature_flat_desc: 'ツリー表示とフラットリストの切り替え',
    feature_pin: 'ピン止め:',
    feature_pin_desc: '重要なスレッドをリスト上部に固定表示',
    feature_collapse: '折り畳み/展開:',
    feature_collapse_desc: '返信数クリックでスレッドの返信を開閉',
    feature_copy: 'メッセージコピー:',
    feature_copy_desc: '📋ボタンでメッセージ本文をクリップボードにコピー',
    feature_preview: 'プレビュー:',
    feature_preview_desc: 'ファイルやリンクのプレビューボタンをクリックして内容を表示',
    feature_jump: 'メッセージにジャンプ:',
    feature_jump_desc: 'メッセージをクリックでChatWork上でスクロール',
    feature_track_origin: '元メッセージ追跡:',
    feature_track_origin_desc: '未読み込みの親メッセージを自動ロードして辿る',
    feature_display_in_thread: 'スレッドで表示:',
    feature_display_in_thread_desc: 'ChatWork本体のメッセージからスレッドパネルへジャンプ',
    feature_resize: 'パネルリサイズ:',
    feature_resize_desc: 'パネル左端をドラッグして幅を調整',
    feature_highlight: 'メンションハイライト:',
    feature_highlight_desc: '自分宛てのメッセージが緑色でハイライト表示',
    shortcuts_title: '⌨️ キーボードショートカット',
    shortcut_toggle: 'スレッドパネルの切り替え',
    shortcut_close: 'パネルを閉じる / 検索をクリア',
    settings_info_title: '⚙️ 設定',
    settings_info_desc: '設定タブで言語・テーマ・折り畳み行数を変更できます',
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
