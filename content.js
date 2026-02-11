/**
 * ChatWork Threader - Content Script
 * ChatWorkのメッセージをスレッド形式でツリー表示する
 */

(function() {
  'use strict';

  // スレッドパネルが既に存在するかチェック
  if (document.getElementById('cw-threader-panel')) {
    return;
  }

  // Global settings storage key
  const SETTINGS_KEY = 'cw-threader-settings';

  // Default settings
  const defaultSettings = {
    language: 'en',
    theme: 'system'
  };

  // Current settings cache
  let currentSettings = { ...defaultSettings };

  // Content script i18n translations
  const contentI18n = {
    en: {
      // Tab titles
      tab_threads: 'Threads',
      tab_settings: 'Settings',
      tab_help: 'Help',
      // Controls
      close: 'Close',
      refresh: 'Refresh',
      filter_all: 'All',
      filter_by_speaker: 'Filter by Speaker',
      my_participation: 'My Participation Only',
      my_participation_tooltip: 'Show only threads where you replied or were replied to',
      flat_mode: 'Flat',
      search_placeholder: 'Search messages...',
      search_clear: 'Clear',
      search_prev: 'Previous Result',
      search_next: 'Next Result',
      // Settings
      language_label: 'Language',
      theme_label: 'Theme',
      theme_system: 'System default',
      theme_light: 'Light',
      theme_dark: 'Dark',
      settings_auto_save: 'Settings are saved automatically',
      // Help
      help_how_to_use: '📖 How to Use',
      help_step1: 'Open a ChatWork chat room',
      help_step2: 'Press <kbd>Shift</kbd>+<kbd>S</kbd> or click the button at the bottom right',
      help_step3: 'Thread list will be displayed',
      help_step4: 'Click a thread to jump to that message',
      help_features: '🔍 Features',
      feature_thread_view: 'Thread View:',
      feature_thread_view_desc: 'Display messages as a threaded conversation',
      feature_search: 'Search:',
      feature_search_desc: 'Search messages within threads',
      feature_filter: 'Filter by Speaker:',
      feature_filter_desc: 'Show only messages from a specific person',
      feature_participation: 'My Participation:',
      feature_participation_desc: 'Show only threads you participated in',
      feature_flat: 'Flat Mode:',
      feature_flat_desc: 'Toggle between tree view and flat list',
      feature_preview: 'Preview:',
      feature_preview_desc: 'Hover over links to preview content',
      feature_jump: 'Jump to Message:',
      feature_jump_desc: 'Click a message to scroll to it in ChatWork',
      help_badge_legend: '🏷️ Badge Legend',
      badge_root: 'Root',
      badge_root_desc: 'Message that has replies',
      badge_reply: 'Reply',
      badge_reply_desc: 'Reply to another message',
      badge_both: 'Root+Reply',
      badge_both_desc: 'A reply that also has replies',
      help_shortcuts: '⌨️ Keyboard Shortcuts',
      shortcut_toggle: 'Toggle thread panel',
      shortcut_close: 'Close panel / Clear search',
      // Dynamic text
      no_threads: 'No threads found',
      no_matching_threads: 'No matching threads',
      pin_thread: 'Pin thread',
      unpin_thread: 'Unpin thread',
      track_origin: 'Track origin message',
      reply_count_suffix: ' Reply',
      matches_suffix: ' matches',
      no_matches: 'No matches',
      preview_btn: 'Preview',
      copy_message: 'Copy message',
      toggle_title: 'Toggle thread view (Shift+S)',
      display_in_thread: 'Display in Thread List',
    },
    ja: {
      // Tab titles
      tab_threads: 'スレッド',
      tab_settings: '設定',
      tab_help: 'ヘルプ',
      // Controls
      close: '閉じる',
      refresh: '更新',
      filter_all: 'すべて',
      filter_by_speaker: '発言者でフィルター',
      my_participation: '自分の参加のみ',
      my_participation_tooltip: '自分が返信した、または返信を受けたスレッドのみ表示',
      flat_mode: 'フラット',
      search_placeholder: 'メッセージを検索...',
      search_clear: 'クリア',
      search_prev: '前の結果',
      search_next: '次の結果',
      // Settings
      language_label: '言語',
      theme_label: 'テーマ',
      theme_system: 'システム設定に従う',
      theme_light: 'ライト',
      theme_dark: 'ダーク',
      settings_auto_save: '設定は自動的に保存されます',
      // Help
      help_how_to_use: '📖 使い方',
      help_step1: 'ChatWorkのチャットルームを開く',
      help_step2: '<kbd>Shift</kbd>+<kbd>S</kbd>を押すか、右下のボタンをクリック',
      help_step3: 'スレッド一覧が表示されます',
      help_step4: 'スレッドをクリックでメッセージにジャンプ',
      help_features: '🔍 機能一覧',
      feature_thread_view: 'スレッド表示:',
      feature_thread_view_desc: 'メッセージをスレッド形式で表示',
      feature_search: '検索:',
      feature_search_desc: 'スレッド内のメッセージを検索',
      feature_filter: '発言者フィルター:',
      feature_filter_desc: '特定の人のメッセージのみ表示',
      feature_participation: '自分の参加:',
      feature_participation_desc: '自分が参加したスレッドのみ表示',
      feature_flat: 'フラットモード:',
      feature_flat_desc: 'ツリー表示とフラットリストの切り替え',
      feature_preview: 'プレビュー:',
      feature_preview_desc: 'リンクをホバーしてコンテンツをプレビュー',
      feature_jump: 'メッセージにジャンプ:',
      feature_jump_desc: 'メッセージをクリックでChatWork上でスクロール',
      help_badge_legend: '🏷️ バッジの説明',
      badge_root: 'ルート',
      badge_root_desc: '返信があるメッセージ',
      badge_reply: '返信',
      badge_reply_desc: '他のメッセージへの返信',
      badge_both: 'ルート+返信',
      badge_both_desc: '返信かつ返信を持つメッセージ',
      help_shortcuts: '⌨️ キーボードショートカット',
      shortcut_toggle: 'スレッドパネルの切り替え',
      shortcut_close: 'パネルを閉じる / 検索をクリア',
      // Dynamic text
      no_threads: 'スレッドが見つかりません',
      no_matching_threads: '一致するスレッドがありません',
      pin_thread: 'スレッドをピン止め',
      unpin_thread: 'ピン止めを解除',
      track_origin: '元のメッセージを辿る',
      reply_count_suffix: ' 件の返信',
      matches_suffix: ' 件一致',
      no_matches: '一致なし',
      preview_btn: 'プレビュー',
      copy_message: 'メッセージをコピー',
      toggle_title: 'スレッド表示の切り替え (Shift+S)',
      display_in_thread: 'スレッド一覧に表示',
    }
  };

  /**
   * Get translated text for the given key
   */
  function t(key) {
    const lang = currentSettings.language || 'en';
    const translations = contentI18n[lang] || contentI18n.en;
    return translations[key] || contentI18n.en[key] || key;
  }

  /**
   * Apply translations to all elements with data-ct-i18n attributes
   */
  function applyContentTranslations() {
    // Translate textContent
    document.querySelectorAll('[data-ct-i18n]').forEach(el => {
      const key = el.getAttribute('data-ct-i18n');
      const translated = t(key);
      if (translated) el.textContent = translated;
    });

    // Translate innerHTML (for elements with HTML content like kbd tags)
    document.querySelectorAll('[data-ct-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-ct-i18n-html');
      const translated = t(key);
      if (translated) el.innerHTML = translated;
    });

    // Translate title attributes
    document.querySelectorAll('[data-ct-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-ct-i18n-title');
      const translated = t(key);
      if (translated) el.title = translated;
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-ct-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-ct-i18n-placeholder');
      const translated = t(key);
      if (translated) el.placeholder = translated;
    });

    // Translate alt attributes
    document.querySelectorAll('[data-ct-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-ct-i18n-alt');
      const translated = t(key);
      if (translated) el.alt = translated;
    });

    // Update language select value
    const langSelect = document.getElementById('cw-threader-language-select');
    if (langSelect) {
      langSelect.value = currentSettings.language || 'en';
    }
  }

  /**
   * Load settings from chrome.storage.sync
   */
  async function loadGlobalSettings() {
    if (!isExtensionContextValid()) return defaultSettings;
    try {
      const result = await chrome.storage.sync.get(SETTINGS_KEY);
      currentSettings = { ...defaultSettings, ...result[SETTINGS_KEY] };
      return currentSettings;
    } catch (error) {
      console.error('[ChatWorkThreader] Failed to load settings:', error);
      return defaultSettings;
    }
  }

  /**
   * Apply theme to the page
   * @param {string} theme - 'system', 'light', or 'dark'
   */
  function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('cw-threader-light', 'cw-threader-dark');

    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (effectiveTheme === 'dark') {
      body.classList.add('cw-threader-dark');
    } else {
      body.classList.add('cw-threader-light');
    }
  }

  /**
   * Initialize settings and apply theme
   */
  async function initializeSettings() {
    const settings = await loadGlobalSettings();
    applyTheme(settings.theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentSettings.theme === 'system') {
        applyTheme('system');
      }
    });

    // Listen for settings changes from popup
    if (isExtensionContextValid()) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'CW_THREADER_SETTINGS_CHANGED') {
          currentSettings = message.settings;
          applyTheme(currentSettings.theme);
          applyContentTranslations();
          // Update language select if open
          const langSelect = document.getElementById('cw-threader-language-select');
          if (langSelect) langSelect.value = currentSettings.language || 'en';
        }
      });
    }
  }

  // Initialize settings on load
  initializeSettings();

  /**
   * 拡張機能のコンテキストが有効かチェック
   * 拡張機能がリロードされると無効になる
   */
  function isExtensionContextValid() {
    try {
      return chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  /**
   * 現在のルームIDをURLから取得
   */
  function getCurrentRoomId() {
    const match = window.location.hash.match(/#!rid(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * 現在ログインしているユーザーのAID（アカウントID）を取得
   * ChatWorkの様々な場所から取得を試みる
   */
  function getCurrentUserAid() {
    // 方法1: グローバル変数から取得（ChatWorkが設定している場合）
    if (typeof CW !== 'undefined' && CW.myid) {
      console.log('[ChatWorkThreader] AID取得: CW.myid =', CW.myid);
      return CW.myid.toString();
    }
    
    // 方法2: RM.ac オブジェクトから取得（新しいChatWork構造）
    if (typeof RM !== 'undefined' && RM.ac && RM.ac.aid) {
      console.log('[ChatWorkThreader] AID取得: RM.ac.aid =', RM.ac.aid);
      return RM.ac.aid.toString();
    }
    
    // 方法3: ACグローバルオブジェクトから取得
    if (typeof AC !== 'undefined' && AC.myid) {
      console.log('[ChatWorkThreader] AID取得: AC.myid =', AC.myid);
      return AC.myid.toString();
    }
    
    // 方法4: ページ内のユーザープロフィール要素から取得
    const myProfileLink = document.querySelector('[data-myid]');
    if (myProfileLink) {
      const aid = myProfileLink.getAttribute('data-myid');
      console.log('[ChatWorkThreader] AID取得: data-myid =', aid);
      return aid;
    }
    
    // 方法5: _myStatusAreaから取得（アイコン画像のsrcにaidが含まれることがある）
    const myStatusArea = document.getElementById('_myStatusArea');
    if (myStatusArea) {
      const avatarImg = myStatusArea.querySelector('img');
      if (avatarImg && avatarImg.src) {
        const aidMatch = avatarImg.src.match(/avatar\/(\d+)/);
        if (aidMatch) {
          console.log('[ChatWorkThreader] AID取得: _myStatusArea avatar =', aidMatch[1]);
          return aidMatch[1];
        }
      }
    }
    
    // 方法6: サイドバーのマイ情報エリアから取得
    const sidebarMyInfo = document.querySelector('#_sidebarMainMyInfo [data-aid], #_sidebarMainMyInfo img[src*="avatar"]');
    if (sidebarMyInfo) {
      const aid = sidebarMyInfo.getAttribute('data-aid');
      if (aid) {
        console.log('[ChatWorkThreader] AID取得: sidebarMyInfo data-aid =', aid);
        return aid;
      }
      const src = sidebarMyInfo.getAttribute('src');
      if (src) {
        const aidMatch = src.match(/avatar\/(\d+)/);
        if (aidMatch) {
          console.log('[ChatWorkThreader] AID取得: sidebarMyInfo avatar =', aidMatch[1]);
          return aidMatch[1];
        }
      }
    }
    
    // 方法7: inputタグのmyIdから取得
    const myIdInput = document.querySelector('input[name="myid"]');
    if (myIdInput) {
      console.log('[ChatWorkThreader] AID取得: input myid =', myIdInput.value);
      return myIdInput.value;
    }
    
    // 方法8: ヘッダーのアバター画像から取得
    const headerAvatar = document.querySelector('header img[src*="avatar"], #_header img[src*="avatar"]');
    if (headerAvatar && headerAvatar.src) {
      const aidMatch = headerAvatar.src.match(/avatar\/(\d+)/);
      if (aidMatch) {
        console.log('[ChatWorkThreader] AID取得: header avatar =', aidMatch[1]);
        return aidMatch[1];
      }
    }
    
    // 方法9: 任意のアバター画像（自分のプロフィール関連）から取得
    const profileAvatars = document.querySelectorAll('[class*="myProfile"] img[src*="avatar"], [class*="MyProfile"] img[src*="avatar"], [id*="myProfile"] img[src*="avatar"]');
    for (const avatar of profileAvatars) {
      if (avatar.src) {
        const aidMatch = avatar.src.match(/avatar\/(\d+)/);
        if (aidMatch) {
          console.log('[ChatWorkThreader] AID取得: profile avatar =', aidMatch[1]);
          return aidMatch[1];
        }
      }
    }

    // 方法10: scriptタグ内のACを検索
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.textContent) {
        const acMatch = script.textContent.match(/AC\s*=\s*{[^}]*myid\s*:\s*["'](\d+)["']/);
        if (acMatch) {
          console.log('[ChatWorkThreader] AID取得: script AC.myid =', acMatch[1]);
          return acMatch[1];
        }
        // もう1つのパターン
        const myidMatch = script.textContent.match(/["']myid["']\s*:\s*["'](\d+)["']/);
        if (myidMatch) {
          console.log('[ChatWorkThreader] AID取得: script myid =', myidMatch[1]);
          return myidMatch[1];
        }
        // aid パターン
        const aidMatch = script.textContent.match(/["']aid["']\s*:\s*["']?(\d+)["']?/);
        if (aidMatch) {
          console.log('[ChatWorkThreader] AID取得: script aid =', aidMatch[1]);
          return aidMatch[1];
        }
      }
    }
    
    // 方法11: localStorageから取得を試みる
    try {
      const cwData = localStorage.getItem('cwData');
      if (cwData) {
        const parsed = JSON.parse(cwData);
        if (parsed && parsed.myid) {
          console.log('[ChatWorkThreader] AID取得: localStorage =', parsed.myid);
          return parsed.myid.toString();
        }
      }
    } catch (e) {
      // JSON解析エラーは無視
    }
    
    console.log('[ChatWorkThreader] 警告: AIDを取得できませんでした');
    return null;
  }

  /**
   * トグル状態をストレージに保存
   */
  function saveToggleState(roomId, mid, isOpen) {
    if (!roomId || !mid) return;
    if (!isExtensionContextValid()) return;
    const key = `toggle_${roomId}_${mid}`;
    try {
      chrome.storage.local.set({ [key]: isOpen });
    } catch (e) {
      // 拡張機能のコンテキストが無効化された場合は無視
    }
  }

  /**
   * トグル状態をストレージから取得
   */
  async function getToggleState(roomId, mid) {
    if (!roomId || !mid) return true; // デフォルトは開いた状態
    if (!isExtensionContextValid()) return true;
    const key = `toggle_${roomId}_${mid}`;
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : true;
    } catch (e) {
      // 拡張機能のコンテキストが無効化された場合はデフォルト値を返す
      return true;
    }
  }

  /**
   * ピン止め状態をストレージに保存
   * @param {string} roomId - チャットルームID
   * @param {string} mid - メッセージID
   * @param {boolean} isPinned - ピン止め状態
   */
  function savePinnedState(roomId, mid, isPinned) {
    if (!roomId || !mid) return;
    if (!isExtensionContextValid()) return;
    const key = `pinned_${roomId}`;
    try {
      chrome.storage.local.get(key, (result) => {
        const pinnedSet = new Set(result[key] || []);
        if (isPinned) {
          pinnedSet.add(mid);
        } else {
          pinnedSet.delete(mid);
        }
        chrome.storage.local.set({ [key]: Array.from(pinnedSet) });
      });
    } catch (e) {
      // 拡張機能のコンテキストが無効化された場合は無視
    }
  }

  /**
   * ピン止め状態をストレージから取得（特定のルームの全ピン止めスレッド）
   * @param {string} roomId - チャットルームID
   * @returns {Promise<Set<string>>} ピン止めされたメッセージIDのセット
   */
  async function getPinnedThreads(roomId) {
    if (!roomId) return new Set();
    if (!isExtensionContextValid()) return new Set();
    const key = `pinned_${roomId}`;
    try {
      const result = await chrome.storage.local.get(key);
      return new Set(result[key] || []);
    } catch (e) {
      // 拡張機能のコンテキストが無効化された場合は空セットを返す
      return new Set();
    }
  }

  /**
   * 高速スムーズスクロール
   * 標準のscrollIntoViewよりも速いアニメーションでスクロールする
   * @param {Element} element - スクロール対象の要素
   * @param {Object} options - オプション
   * @param {string} options.block - 'start', 'center', 'end' (default: 'start')
   * @param {number} options.duration - アニメーション時間（ms）(default: 300)
   * @param {Function} options.onComplete - スクロール完了時のコールバック
   */
  function fastSmoothScrollTo(element, options = {}) {
    const { block = 'start', duration = 300, onComplete } = options;
    
    // スクロールコンテナを取得
    const scrollContainer = element.closest('#_timeLine, ._timeLine, [role="log"], .cw-threader-content') 
      || element.closest('[style*="overflow"]')
      || document.scrollingElement 
      || document.documentElement;
    
    // 要素の位置を計算
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer === document.documentElement || scrollContainer === document.scrollingElement
      ? { top: 0, height: window.innerHeight }
      : scrollContainer.getBoundingClientRect();
    
    let targetOffset;
    if (block === 'start') {
      targetOffset = elementRect.top - containerRect.top;
    } else if (block === 'center') {
      targetOffset = elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
    } else if (block === 'end') {
      targetOffset = elementRect.top - containerRect.top - containerRect.height + elementRect.height;
    } else {
      targetOffset = elementRect.top - containerRect.top;
    }
    
    const startScrollTop = scrollContainer.scrollTop;
    const targetScrollTop = startScrollTop + targetOffset;
    const startTime = performance.now();
    
    // イージング関数（easeOutCubic）
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      
      scrollContainer.scrollTop = startScrollTop + (targetScrollTop - startScrollTop) * easedProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    }
    
    requestAnimationFrame(animate);
  }

  /**
   * メッセージデータを解析してスレッド構造を構築
   */
  class ThreadBuilder {
    constructor() {
      this.messages = new Map(); // mid -> message data
      this.threads = new Map();  // root mid -> thread tree
      this.replyMap = new Map(); // mid -> parent mid
      this.childrenMap = new Map(); // mid -> [child mids]
      this.allMessages = []; // すべてのメッセージを時系列で保持
    }

    /**
     * MIDからメッセージのルート要素を取得
     * @param {string} mid - メッセージID
     * @returns {Element|null}
     */
    findMessageRootByMid(mid) {
      const midStr = String(mid);
      const esc = CSS.escape(midStr);

      // いまのChatWorkはこれが一番当たりやすい
      let el = document.querySelector(`div._message[data-mid="${esc}"]`);
      if (el) return el;

      // id が "_messageId{mid}" の形で生えてることもある
      el = document.getElementById(`_messageId${midStr}`);
      if (el) return el.closest('div._message') ?? el;

      // 最後の保険（data-mid をどこかが持ってれば拾う）
      el = document.querySelector(`[data-mid="${esc}"]`);
      if (el) return el.closest('div._message') ?? el;

      return null;
    }

    /**
     * メッセージが自分宛てかどうかを判定
     * @param {Element} messageElement - メッセージ要素（_message クラスを持つ要素）
     * @param {string} mid - メッセージID（デバッグ用）
     * @returns {boolean}
     */
    isMessageToMe(messageElement, mid) {
      // 方法1: _message 要素自体に mentioned クラスがあるかチェック
      // ChatWorkの現在の構造: <div class="_message mentioned"> または <div class="_message bordered">
      if (messageElement.classList.contains('mentioned')) {
        // console.log(`[ChatWorkThreader] 自分宛て検出 (mentionedクラス): MID=${mid}`);
        return true;
      }
      
      // 方法2: クラス名に "mention" を含むかチェック（styled-components対応）
      const classList = Array.from(messageElement.classList);
      const hasMentionClass = classList.some(cls => 
        cls.toLowerCase().includes('mention') && !cls.toLowerCase().includes('reply')
      );
      if (hasMentionClass) {
        // console.log(`[ChatWorkThreader] 自分宛て検出 (mentionを含むクラス): MID=${mid}, classes=${classList.join(',')}`);
        return true;
      }
      
      // 方法3: 親要素の .timelineMessage を探す（旧構造対応）
      let timelineMessage = messageElement.closest('.timelineMessage');
      
      // 方法4: 見つからない場合、MIDから再取得を試みる
      if (!timelineMessage && mid) {
        const rootEl = this.findMessageRootByMid(mid);
        if (rootEl) {
          // rootEl自体にmentionedクラスがあるかチェック
          if (rootEl.classList.contains('mentioned')) {
            // console.log(`[ChatWorkThreader] 自分宛て検出 (findMessageRoot経由): MID=${mid}`);
            return true;
          }
          // rootElのクラス名にmentionを含むかチェック
          const rootClassList = Array.from(rootEl.classList);
          const rootHasMention = rootClassList.some(cls => 
            cls.toLowerCase().includes('mention') && !cls.toLowerCase().includes('reply')
          );
          if (rootHasMention) {
            // console.log(`[ChatWorkThreader] 自分宛て検出 (findMessageRoot mentionクラス): MID=${mid}`);
            return true;
          }
          timelineMessage = rootEl.closest('.timelineMessage');
        }
      }
      
      // 方法5: 親要素を辿って timelineMessage--mention クラスを探す（旧構造対応）
      if (!timelineMessage) {
        let parent = messageElement.parentElement;
        while (parent && parent !== document.body) {
          // 親にmentionedクラスがあるかチェック
          if (parent.classList && parent.classList.contains('mentioned')) {
            // console.log(`[ChatWorkThreader] 自分宛て検出 (親要素mentionedクラス): MID=${mid}`);
            return true;
          }
          if (parent.classList && parent.classList.contains('timelineMessage')) {
            timelineMessage = parent;
            break;
          }
          if (parent.classList && parent.classList.contains('timelineMessage--mention')) {
            // console.log(`[ChatWorkThreader] 自分宛て検出 (timelineMessage--mention): MID=${mid}`);
            return true;
          }
          parent = parent.parentElement;
        }
      }
      
      // timelineMessage が見つかった場合は旧ロジックでチェック
      if (timelineMessage) {
        const hasMention = timelineMessage.classList.contains('timelineMessage--mention');
        const hasJump = timelineMessage.classList.contains('timelineMessage--jumpMessage');
        
        if (hasMention && !hasJump) {
          // console.log(`[ChatWorkThreader] 自分宛て検出 (timelineMessage): MID=${mid}`);
          return true;
        }
      }
      
      return false;
    }

    /**
     * メッセージが自分から送信されたかどうかを判定
     * 自分が送信したメッセージには編集・削除ボタンがある
     * @param {Element} messageElement - メッセージ要素（_message クラスを持つ要素）
     * @param {string} mid - メッセージID（デバッグ用）
     * @returns {boolean}
     */
    isMessageFromMe(messageElement, mid) {
      // 方法1: 編集ボタンがあるかチェック（自分のメッセージのみ編集可能）
      const editButton = messageElement.querySelector('[data-testid="message-edit-button"], [class*="editButton"], ._messageEditButton, [aria-label*="編集"], [aria-label*="edit"]');
      if (editButton) {
        return true;
      }
      
      // 方法2: 削除ボタンがあるかチェック（自分のメッセージのみ削除可能）
      const deleteButton = messageElement.querySelector('[data-testid="message-delete-button"], [class*="deleteButton"], ._messageDeleteButton, [aria-label*="削除"], [aria-label*="delete"]');
      if (deleteButton) {
        return true;
      }
      
      // 方法3: メッセージメニュー内に編集・削除オプションがあるかチェック
      const menuWithEdit = messageElement.querySelector('[data-cwui-lt-dn-menu-item="edit"], [data-action="edit"]');
      if (menuWithEdit) {
        return true;
      }
      
      // 方法4: 親要素を辿ってmyMessage系のクラスを探す
      let parent = messageElement;
      while (parent && parent !== document.body) {
        if (parent.classList) {
          const classList = Array.from(parent.classList);
          const hasMyMessageClass = classList.some(cls => 
            cls.toLowerCase().includes('mymessage') || 
            cls.toLowerCase().includes('my-message') ||
            cls.toLowerCase().includes('own-message') ||
            cls.toLowerCase().includes('self-message')
          );
          if (hasMyMessageClass) {
            return true;
          }
        }
        parent = parent.parentElement;
      }
      
      return false;
    }

    /**
     * ページからメッセージを収集
     */
    collectMessages() {
      // _message クラスを持つ実際のメッセージ要素のみを収集（返信バッジ内の参照を除外）
      const messageElements = document.querySelectorAll('[data-mid]._message');
      let lastUserName = '';
      let lastAvatarUrl = '';

      // AID → Avatar URL マップを構築（ページ全体のアバター画像から）
      // To先や返信先のアバターURL解決に使用
      this.aidAvatarMap = new Map();
      const allAvatarImgs = document.querySelectorAll('img.userIconImage, img[data-testid="user-icon"], img[src*="avatar"], img[src*="ico_default"]');
      allAvatarImgs.forEach(img => {
        const src = img.src || '';
        if (!src) return;
        // data-aid属性から取得
        let aid = img.getAttribute('data-aid');
        // 親要素のdata-aidから取得
        if (!aid) {
          const parent = img.closest('[data-aid]');
          if (parent) aid = parent.getAttribute('data-aid');
        }
        // URLからAIDを抽出（avatar/XXXX パターン）
        if (!aid) {
          const aidMatch = src.match(/avatar\/(?:ico_default_\w+\.png|(\d+)|(\w+)\.\w+\.?\w*)/);
          // ico_default パターンはAIDを持たないのでスキップ
        }
        if (aid && !this.aidAvatarMap.has(aid)) {
          this.aidAvatarMap.set(aid, src);
        }
      });
      
      // デバッグ: 自分宛てメッセージのMIDを収集
      const toMeMids = [];
      
      messageElements.forEach(el => {
        const mid = el.getAttribute('data-mid');
        const rid = el.getAttribute('data-rid');
        
        if (!mid) return;

        // 自分宛てかどうかを判定（midも渡す）
        const isToMe = this.isMessageToMe(el, mid);
        
        // 自分が送信したメッセージかどうかを判定
        const isFromMe = this.isMessageFromMe(el, mid);
        
        // デバッグ: 自分宛てと判定されたMIDを収集
        if (isToMe) {
          toMeMids.push(mid);
        }

        // ユーザー名を取得（連続投稿の場合は前のユーザー名を使用）
        // 引用要素内のユーザー名は除外する
        const userNameEl = el.querySelector('[data-testid="timeline_user-name"]');
        let userName = '';
        if (userNameEl) {
          // 引用要素内にないか確認
          const isInQuote = userNameEl.closest('.chatQuote, .dev_quote, [data-cwopen="[qt]"], [data-cwtag^="[qt"]');
          if (!isInQuote) {
            userName = userNameEl.textContent.trim();
          }
        }
        
        // アバター画像を取得（引用要素内のアバターは除外）
        let avatarUrl = '';
        const avatarEls = el.querySelectorAll('.userIconImage');
        for (const avatarEl of avatarEls) {
          // 引用要素内にないか確認
          const isInQuote = avatarEl.closest('.chatQuote, .dev_quote, [data-cwopen="[qt]"], [data-cwtag^="[qt"]');
          if (!isInQuote) {
            avatarUrl = avatarEl.src;
            break;
          }
        }
        
        // メッセージ送信者のAIDを取得（引用要素内のAIDは除外）
        let senderAid = null;
        const aidEls = el.querySelectorAll('[data-aid]');
        for (const aidEl of aidEls) {
          // 引用要素内・返信バッジ内・To宛先内にないか確認
          const isInQuote = aidEl.closest('.chatQuote, .dev_quote, [data-cwopen="[qt]"], [data-cwtag^="[qt"]');
          const isInReply = aidEl.closest('[data-cwtag^="[rp"]');
          const isInTo = aidEl.closest('[data-cwtag^="[to" i]');
          if (!isInQuote && !isInReply && !isInTo) {
            senderAid = aidEl.getAttribute('data-aid');
            break;
          }
        }
        // アバター画像URLからも取得を試みる
        if (!senderAid && avatarUrl) {
          const aidMatch = avatarUrl.match(/avatar\/(\d+)/);
          if (aidMatch) {
            senderAid = aidMatch[1];
          }
        }

        // ユーザー名がない場合は前のメッセージの送信者を使用（ChatWorkの連続投稿表示）
        if (!userName && lastUserName) {
          userName = lastUserName;
          avatarUrl = avatarUrl || lastAvatarUrl;
        }
        
        // 次のメッセージ用に保存
        if (userName) {
          lastUserName = userName;
          lastAvatarUrl = avatarUrl;
        }

        // メッセージ本文を取得（<pre>内の要素から抽出）
        const preEl = el.querySelector('pre');
        let messageText = '';
        let replyTargetUserName = null;
        let quotedMessage = null;  // 引用メッセージ（後方互換用）
        let quoteAuthor = null;    // 引用元発言者情報 { name, avatarUrl, timestamp }
        let filePreviewInfo = [];  // ファイルプレビュー情報 { fileId, mimeType, fileName, fileSize }
        let externalLinks = [];    // 外部リンク情報 { url, title, type }
        let quoteExternalLinks = [];  // 引用内の外部リンク情報
        let toTargets = [];  // To先ユーザー
        let messageSegments = [];  // メッセージセグメント（テキストと引用を順序付きで保持）
        
        if (preEl) {
          // 引用を取得（[qt]タグ、または .chatQuote クラス）
          const quoteTags = preEl.querySelectorAll('[data-cwtag^="[qt"], [data-cwopen="[qt]"], .chatQuote, .dev_quote');
          quoteTags.forEach(quoteTag => {
            // 引用元発言者情報を取得
            if (!quoteAuthor) {
              // 発言者名を取得（.chatQuote__title 内の [data-cwtag^="[pname"] または ._nameAid）
              const quoteTitle = quoteTag.querySelector('.chatQuote__title');
              if (quoteTitle) {
                // 発言者名
                const pnameEl = quoteTitle.querySelector('[data-cwtag^="[pname"]');
                const nameEl = pnameEl || quoteTitle.querySelector('[class*="_nameAid"]');
                const authorName = nameEl ? nameEl.textContent.trim() : '';
                
                // アバター画像
                const avatarEl = quoteTitle.querySelector('img[data-testid="user-icon"], img[class*="avatar"], .userIconImage');
                const authorAvatarUrl = avatarEl ? avatarEl.src : '';
                
                // タイムスタンプ
                const timestampEl = quoteTitle.querySelector('.quoteTimeStamp, .chatQuote__timeStamp, [data-cwtag^="[date"]');
                const authorTimestamp = timestampEl ? timestampEl.textContent.trim() : '';
                
                if (authorName) {
                  quoteAuthor = {
                    name: authorName,
                    avatarUrl: authorAvatarUrl,
                    timestamp: authorTimestamp
                  };
                }
              }
            }
            
            // 引用テキスト部分を取得（.quoteText クラスを優先）
            const quoteTextEl = quoteTag.querySelector('.quoteText');
            if (quoteTextEl) {
              // .quoteText 内のテキストを取得（プレビューボタンのテキストは除外）
              const textNodes = [];
              const walker = document.createTreeWalker(
                quoteTextEl,
                NodeFilter.SHOW_TEXT,
                {
                  acceptNode: (node) => {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    // プレビューボタン内のテキストは除外
                    if (parent.closest('._previewLink, [data-type*="preview"]')) {
                      return NodeFilter.FILTER_REJECT;
                    }
                    // タイムスタンプは除外
                    if (parent.closest('.quoteTimeStamp, .chatQuote__timeStamp, [data-cwtag^="[date"]')) {
                      return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                  }
                }
              );
              let textNode;
              while (textNode = walker.nextNode()) {
                const text = textNode.textContent;
                if (text && text.trim()) {
                  textNodes.push(text);
                }
              }
              const qText = textNodes.join('').trim();
              if (qText) {
                quotedMessage = quotedMessage ? quotedMessage + '\n' + qText : qText;
              }
              
              // 引用内の外部リンクとプレビューボタンを収集
              const quoteLinks = quoteTextEl.querySelectorAll('a[href]');
              quoteLinks.forEach(link => {
                const href = link.getAttribute('href') || '';
                // ChatWork内部リンクやダウンロードURLは除外
                if (!href || 
                    href.startsWith('#') || 
                    href.startsWith('javascript:') ||
                    href.includes('chatwork.com') ||
                    href.includes('/gateway/') ||
                    href.includes('download_file') ||
                    link.classList.contains('_previewLink')) {
                  return;
                }
                
                // 近くにプレビューボタンがあるか確認
                const parentContainer = link.closest('[data-cwtag^="http"], [class*="url"], [class*="link"]') || link.parentElement;
                let hasPreviewButton = false;
                let previewElement = null;
                if (parentContainer) {
                  const previewBtn = parentContainer.querySelector('a._previewLink[data-url]');
                  if (previewBtn) {
                    hasPreviewButton = true;
                    previewElement = previewBtn;
                  }
                }
                
                // タイトルを取得
                let title = link.textContent?.trim() || '';
                if (title === href || title.length > 50) {
                  try {
                    const urlObj = new URL(href);
                    title = urlObj.hostname + (urlObj.pathname.length > 25 ? urlObj.pathname.substring(0, 25) + '...' : urlObj.pathname);
                  } catch {
                    title = href.length > 50 ? href.substring(0, 50) + '...' : href;
                  }
                }
                
                if (!quoteExternalLinks.some(l => l.url === href)) {
                  quoteExternalLinks.push({ 
                    url: href, 
                    title, 
                    hasPreviewButton, 
                    previewElement, 
                    isInQuote: true 
                  });
                }
              });
            } else {
              // 引用内容を取得（様々なクラス名に対応）
              // まず .quoteText 以外の引用テキスト要素を探す
              const quoteContent = quoteTag.querySelector('.sc-klVQfs, .chatTimeLineQuoteLine');
              if (quoteContent) {
                // タイトル部分（発言者名・タイムスタンプ）を除外してテキストを取得
                const textNodes = [];
                const walker = document.createTreeWalker(
                  quoteContent,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: (node) => {
                      const parent = node.parentElement;
                      if (!parent) return NodeFilter.FILTER_REJECT;
                      // タイトル・タイムスタンプ・プレビューボタンは除外
                      if (parent.closest('.chatQuote__title, .quoteTimeStamp, ._previewLink, [data-type*="preview"]')) {
                        return NodeFilter.FILTER_REJECT;
                      }
                      return NodeFilter.FILTER_ACCEPT;
                    }
                  }
                );
                let textNode;
                while (textNode = walker.nextNode()) {
                  const text = textNode.textContent;
                  if (text && text.trim()) {
                    textNodes.push(text);
                  }
                }
                const qText = textNodes.join('').trim();
                if (qText) {
                  quotedMessage = quotedMessage ? quotedMessage + '\n' + qText : qText;
                }
              }
              // quoteContent が見つからない場合は、引用全体からテキストを抽出（タイトル除外）
              if (!quotedMessage) {
                const textNodes = [];
                const walker = document.createTreeWalker(
                  quoteTag,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: (node) => {
                      const parent = node.parentElement;
                      if (!parent) return NodeFilter.FILTER_REJECT;
                      // タイトル・タイムスタンプ・プレビューボタン・アイコン部分は除外
                      if (parent.closest('.chatQuote__title, .chatQuote__quoteLeftArea, .quoteTimeStamp, ._previewLink, [data-type*="preview"], [data-cwtag^="[pname"]')) {
                        return NodeFilter.FILTER_REJECT;
                      }
                      return NodeFilter.FILTER_ACCEPT;
                    }
                  }
                );
                let textNode;
                while (textNode = walker.nextNode()) {
                  const text = textNode.textContent;
                  if (text && text.trim()) {
                    textNodes.push(text);
                  }
                }
                const qText = textNodes.join('').trim();
                if (qText) {
                  quotedMessage = quotedMessage ? quotedMessage + '\n' + qText : qText;
                }
              }
            }
          });
          
          // ファイルプレビューボタンを探す（ChatWorkのプレビュー機能を利用）
          // パターン1: data-file-id を持つプレビューボタン
          const previewButtons = preEl.querySelectorAll('a._filePreview[data-file-id], a[data-type="chatworkImagePreview"][data-file-id]');
          previewButtons.forEach(btn => {
            const fileId = btn.getAttribute('data-file-id');
            const mimeType = btn.getAttribute('data-mime-type') || 'image/png';
            // ファイル名とファイルサイズを取得（近くのダウンロードリンクから）
            // ChatWorkのHTML構造: <div data-cwopen="[download:FILEID]"><a href="...">ファイル名 (サイズ)</a> <a data-file-id>プレビュー</a></div>
            let parentEl = btn.closest('[data-cwopen*="download"]') || btn.closest('[class*="file"], [class*="File"]') || btn.parentElement;
            let fileName = '';
            let fileSize = btn.getAttribute('data-file-size') || '';
            
            if (parentEl) {
              // ダウンロードリンクを探す
              const downloadLink = parentEl.querySelector('a[href*="download_file"], a[href*="download"], a[download]');
              if (downloadLink) {
                const linkText = downloadLink.textContent?.trim() || '';
                // "ファイル名 (サイズ)" 形式からファイル名とサイズを分離
                const fileNameSizeMatch = linkText.match(/^(.+?)\s*\((\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))\)$/i);
                if (fileNameSizeMatch) {
                  fileName = fileNameSizeMatch[1].trim();
                  if (!fileSize) {
                    fileSize = fileNameSizeMatch[2].trim();
                  }
                } else {
                  fileName = linkText || downloadLink.getAttribute('download') || '';
                }
              }
              
              // ファイルサイズがまだ取得できていない場合、親要素のテキストから探す
              if (!fileSize) {
                const sizeEl = parentEl.querySelector('[class*="size"], [class*="Size"]');
                if (sizeEl) {
                  fileSize = sizeEl.textContent?.trim() || '';
                }
                if (!fileSize) {
                  const parentText = parentEl.textContent || '';
                  const sizeMatch = parentText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
                  if (sizeMatch) {
                    fileSize = sizeMatch[1];
                  }
                }
              }
            }
            
            if (!fileName) {
              fileName = `file_${fileId}`;
            }
            
            if (fileId && !filePreviewInfo.some(f => f.fileId === fileId)) {
              filePreviewInfo.push({ fileId, mimeType, fileName, fileSize, previewElement: btn });
            }
          });
          
          // パターン2: data-url にfile_idが含まれるプレビューボタン（_previewLink, chatworkFilePreview）
          const previewLinks = preEl.querySelectorAll('a._previewLink[data-url], a[data-type="chatworkFilePreview"][data-url]');
          previewLinks.forEach(btn => {
            const dataUrl = btn.getAttribute('data-url') || '';
            // data-url から file_id を抽出（例: gateway/download_file.php?bin=1&file_id=1951181298&preview=1）
            const fileIdMatch = dataUrl.match(/file_id=(\d+)/);
            const fileId = fileIdMatch ? fileIdMatch[1] : null;
            const mimeType = btn.getAttribute('data-mime-type') || 'application/octet-stream';
            // ファイル名とファイルサイズを取得（data-content-id または近くのダウンロードリンクから）
            let fileName = btn.getAttribute('data-content-id') || '';
            let fileSize = btn.getAttribute('data-file-size') || '';
            const parentEl = btn.closest('[data-cwopen*="download"]') || btn.parentElement;
            if (!fileName && parentEl) {
              const downloadLink = parentEl.querySelector('a[href*="download_file"]');
              if (downloadLink) {
                fileName = downloadLink.textContent?.trim() || '';
              }
            }
            // ファイルサイズを探す
            if (!fileSize && parentEl) {
              const sizeEl = parentEl.querySelector('[class*="size"], [class*="Size"]');
              if (sizeEl) {
                fileSize = sizeEl.textContent?.trim() || '';
              }
              if (!fileSize) {
                const parentText = parentEl.textContent || '';
                const sizeMatch = parentText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
                if (sizeMatch) {
                  fileSize = sizeMatch[1];
                }
              }
            }
            if (!fileName && fileId) {
              fileName = `file_${fileId}`;
            }
            
            if (fileId && !filePreviewInfo.some(f => f.fileId === fileId)) {
              filePreviewInfo.push({ fileId, mimeType, fileName, fileSize, previewElement: btn });
            }
          });
          
          // パターン3: data-file-id を持つ他の要素も確認（画像ファイル用）
          const fileElements = preEl.querySelectorAll('[data-file-id]');
          fileElements.forEach(el => {
            const fileId = el.getAttribute('data-file-id');
            const mimeType = el.getAttribute('data-mime-type') || '';
            // 画像ファイルのみ対象
            if (fileId && mimeType.startsWith('image/') && !filePreviewInfo.some(f => f.fileId === fileId)) {
              const fileName = el.textContent?.trim() || `file_${fileId}`;
              let fileSize = el.getAttribute('data-file-size') || '';
              // 親要素からファイルサイズを探す
              if (!fileSize) {
                const parentEl = el.closest('[class*="file"], [class*="File"]') || el.parentElement;
                if (parentEl) {
                  const sizeEl = parentEl.querySelector('[class*="size"], [class*="Size"]');
                  if (sizeEl) {
                    fileSize = sizeEl.textContent?.trim() || '';
                  }
                  if (!fileSize) {
                    const parentText = parentEl.textContent || '';
                    const sizeMatch = parentText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
                    if (sizeMatch) {
                      fileSize = sizeMatch[1];
                    }
                  }
                }
              }
              filePreviewInfo.push({ fileId, mimeType, fileName, fileSize, previewElement: el });
            }
          });
          
          // 外部リンクのプレビューボタンを収集
          // ChatWorkでは外部リンクの近くに「プレビュー」ボタンがある（_previewLinkクラス）
          const externalPreviewButtons = preEl.querySelectorAll('a._previewLink[data-url], a[data-preview-url], button[data-preview-url]');
          externalPreviewButtons.forEach(btn => {
            const previewUrl = btn.getAttribute('data-url') || btn.getAttribute('data-preview-url') || '';
            // ChatWork内部のファイルプレビューは除外（file_idがあるもの、またはURLにfile_idを含むもの）
            if (btn.hasAttribute('data-file-id') || btn.closest('._filePreview') || previewUrl.includes('file_id=')) {
              return;
            }
            // 返信バッジ内は除外
            if (btn.closest('[data-cwtag^="[rp"]') || btn.closest('._replyMessage')) {
              return;
            }
            
            // data-type が googledocs などの外部サービスの場合
            const dataType = btn.getAttribute('data-type') || '';
            if (dataType && dataType !== 'chatworkImagePreview' && dataType !== 'chatworkFilePreview') {
              // プレビューURLを使用
              const url = previewUrl;
              if (url && !externalLinks.some(l => l.url === url)) {
                // タイトルを取得（近くのリンクから）
                let title = '';
                const parentContainer = btn.closest('[data-cwtag^="http"], [class*="url"], [class*="link"]') || btn.parentElement;
                if (parentContainer) {
                  const linkEl = parentContainer.querySelector('a[href]:not(._previewLink)');
                  if (linkEl) {
                    title = linkEl.textContent?.trim() || '';
                  }
                }
                if (!title || title.length > 50) {
                  try {
                    const urlObj = new URL(url);
                    title = urlObj.hostname + (urlObj.pathname.length > 25 ? urlObj.pathname.substring(0, 25) + '...' : urlObj.pathname);
                  } catch {
                    title = url.length > 50 ? url.substring(0, 50) + '...' : url;
                  }
                }
                externalLinks.push({ url, title, previewElement: btn, hasPreviewButton: true });
              }
            }
          });
          
          // 外部リンクを収集（プレビューボタンがなかったもの用）
          const linkElements = preEl.querySelectorAll('a[href]');
          linkElements.forEach(link => {
            const href = link.getAttribute('href') || '';
            // 除外条件
            if (!href || 
                href.startsWith('#') || 
                href.startsWith('javascript:') || 
                href.includes('chatwork.com') ||           // ChatWork内部リンク
                href.includes('/gateway/') ||              // ChatWorkダウンロードURL
                href.includes('download_file') ||          // ダウンロードURL
                link.closest('[data-cwtag^="[rp"]') ||     // 返信バッジ内
                link.closest('._replyMessage') ||          // 返信メッセージ内
                link.closest('._filePreview') ||           // ファイルプレビュー内
                link.closest('[data-cwopen*="download"]') || // ダウンロードリンク内
                link.classList.contains('_previewLink') || // プレビューボタン自体
                link.hasAttribute('data-file-id')) {       // ファイルリンク
              return;
            }
            
            // 既に追加済みなら（プレビューボタンから追加された場合）スキップ
            if (externalLinks.some(l => l.url === href)) {
              return;
            }
            
            // 近くにプレビューボタンがあるか探す（_previewLinkクラス）
            const parentContainer = link.closest('[data-cwtag^="http"], [class*="url"], [class*="link"]') || link.parentElement;
            let hasPreviewButton = false;
            if (parentContainer) {
              const previewBtn = parentContainer.querySelector('a._previewLink[data-url]');
              hasPreviewButton = !!previewBtn;
            }
            
            // リンクのタイトルを取得
            let title = link.textContent?.trim() || '';
            // URLがそのまま表示されている場合は短縮表示
            if (title === href || title.length > 50) {
              try {
                const url = new URL(href);
                title = url.hostname + (url.pathname.length > 25 ? url.pathname.substring(0, 25) + '...' : url.pathname);
              } catch {
                title = href.length > 50 ? href.substring(0, 50) + '...' : href;
              }
            }
            
            externalLinks.push({ url: href, title, hasPreviewButton });
          });
          
          // To宛先を取得（名前・アバターURL・AIDをオブジェクトとして保持）
          // [toall] は別途処理するため除外
          const toTags = preEl.querySelectorAll('[data-cwtag^="[to" i]:not([data-cwtag="[toall]" i])');
          toTags.forEach(toTag => {
            const cwtag = toTag.getAttribute('data-cwtag') || '';
            // AIDを取得（[to:XXXX] 形式と [to aid=XXXX] 形式の両方に対応）
            let aid = null;
            const aidFormatMatch = cwtag.match(/aid=(\d+)/);
            if (aidFormatMatch) {
              aid = aidFormatMatch[1];
            } else {
              // [to:XXXX] 形式（コロン区切り）
              const colonFormatMatch = cwtag.match(/\[to:(\d+)\]/i);
              if (colonFormatMatch) {
                aid = colonFormatMatch[1];
              }
            }
            
            // アバターURLを取得（複数のセレクタパターンに対応）
            let toAvatarUrl = '';
            const toAvatarImg = toTag.querySelector('img[data-testid="user-icon"], img.userIconImage, img[src*="avatar"], img[src*="ico_default"]');
            if (toAvatarImg) {
              toAvatarUrl = toAvatarImg.src || '';
            }
            // ボタン内のアバターも確認
            if (!toAvatarUrl) {
              const btnImg = toTag.querySelector('button img[src*="avatar"], button img[src*="ico_default"], button img[data-testid="user-icon"]');
              if (btnImg) {
                toAvatarUrl = btnImg.src || '';
              }
            }
            // data-aidからアバターURLを推測（ChatWorkのアバターURLパターン）
            if (!toAvatarUrl && aid) {
              // ページ内の同じAIDのアバターを探す
              const existingAvatar = document.querySelector(`img[data-aid="${aid}"][src*="avatar"], img[data-aid="${aid}"][src*="ico_default"], [data-aid="${aid}"] img.userIconImage`);
              if (existingAvatar) {
                toAvatarUrl = existingAvatar.src || '';
              }
            }
            // AID→Avatarマップからフォールバック
            if (!toAvatarUrl && aid && this.aidAvatarMap && this.aidAvatarMap.has(aid)) {
              toAvatarUrl = this.aidAvatarMap.get(aid);
            }
            // それでも見つからない場合、_avatarAidXXXXクラスで探す
            if (!toAvatarUrl && aid) {
              const classAvatar = document.querySelector(`img._avatarAid${aid}`);
              if (classAvatar && classAvatar.src) {
                toAvatarUrl = classAvatar.src;
              }
            }
            
            // ユーザー名を取得（To要素のテキストコンテンツから）
            let toName = toTag.textContent?.trim() || '';
            
            // To要素の次のsiblingから「〇〇さん」形式の名前を取得
            if (!toName) {
              let nextNode = toTag.nextSibling;
              while (nextNode) {
                if (nextNode.nodeType === Node.TEXT_NODE) {
                  const text = nextNode.textContent.trim();
                  if (text) {
                    const nameMatch = text.match(/^(.+?)さん/);
                    toName = nameMatch ? nameMatch[1] : text;
                    break;
                  }
                } else if (nextNode.nodeType === Node.ELEMENT_NODE && nextNode.tagName === 'SPAN') {
                  const text = nextNode.textContent.trim();
                  if (text) {
                    const nameMatch = text.match(/^(.+?)さん/);
                    toName = nameMatch ? nameMatch[1] : text;
                    break;
                  }
                }
                nextNode = nextNode.nextSibling;
              }
            }
            
            if (toName || aid) {
              // 重複チェック（AIDまたは名前で）
              const isDuplicate = toTargets.some(t => (aid && t.aid === aid) || (!aid && t.name === toName));
              if (!isDuplicate) {
                toTargets.push({ name: toName, avatarUrl: toAvatarUrl, aid });
              }
            }
          });
          
          // ToAllも確認
          const toAllTag = preEl.querySelector('[data-cwtag="[toall]" i]');
          if (toAllTag) {
            const isDuplicate = toTargets.some(t => t.name === 'ALL');
            if (!isDuplicate) {
              toTargets.push({ name: 'ALL', avatarUrl: '', aid: null });
            }
          }
          
          // メッセージ本文を取得（DOM順序を保持してセグメント化）
          // 引用セレクタ
          const quoteSelectors = '[data-cwtag^="[qt"], [data-cwopen="[qt]"], .chatQuote, .dev_quote';
          
          // 除外するセレクタ（引用以外）
          // To/Re/ToAllはセグメントとして挙入するため、別管理
          const toReSelectors = [
            '[data-cwtag^="[rp"]',   // Reply バッジ
            '[data-cwtag^="[to" i]',   // To（大文字小文字両対応）
            '[data-cwtag="[toall]" i]', // ToAll（大文字小文字両対応）
          ];
          const nonQuoteExcludeSelectors = [
            ...toReSelectors,
            '.chatTimeLineReply',    // 返信バッジ表示部分
            '._replyMessage',        // 返信メッセージバッジ
            '._filePreview',         // プレビューボタン
            '._filePreviewButton',   // プレビューボタン
            '[data-type="chatworkImagePreview"]', // 画像プレビューボタン
            '._previewLink',         // 外部リンクプレビューボタン
            '[data-cwopen*="download"]', // ダウンロードリンク（ファイル名・サイズ）
            '.chatInfo [data-cwtag^="[preview"]' // 画像プレビュー領域
          ];
          
          // 全ての除外セレクタ（テキスト収集時用）
          const allExcludeSelectors = [
            ...nonQuoteExcludeSelectors,
            '[data-cwtag^="[qt"]',   // 引用（data-cwtag形式）
            '[data-cwopen="[qt]"]',  // 引用（data-cwopen形式）
            '.chatQuote',            // 引用コンテナ
            '.dev_quote'             // 引用コンテナ（別形式）
          ];

          // テキストノードを収集する関数
          const collectTextNodes = (element, excludeSelectors) => {
            const texts = [];
            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  // 除外セレクタに一致する要素内のテキストは除外
                  for (const selector of excludeSelectors) {
                    if (parent.closest(selector)) {
                      return NodeFilter.FILTER_REJECT;
                    }
                  }
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent;
              if (text && text.trim()) {
                texts.push(text);
              }
            }
            return texts;
          };
          
          // DOM順序でセグメントを収集
          // preEl内の各ノードを順番に処理して、テキストと引用の位置関係を保持
          const processNodeForSegments = (parentEl) => {
            const segments = [];
            let currentTextBuffer = [];
            
            // 再帰的に子ノードを処理する関数
            const processNode = (node) => {
              // テキストノードの場合
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text && text.length > 0) {
                  // 親が除外セレクタに一致するか確認
                  const parent = node.parentElement;
                  if (parent) {
                    let isExcluded = false;
                    for (const selector of nonQuoteExcludeSelectors) {
                      if (parent.closest(selector)) {
                        isExcluded = true;
                        break;
                      }
                    }
                    if (!isExcluded) {
                      currentTextBuffer.push(text);
                    }
                  }
                }
                return;
              }
              
              // 要素ノードの場合
              if (node.nodeType === Node.ELEMENT_NODE) {
                // 引用要素かチェック
                const isQuote = node.matches && node.matches(quoteSelectors);
                
                if (isQuote) {
                  // 現在のテキストバッファを先にセグメントに追加
                  if (currentTextBuffer.length > 0) {
                    const textContent = currentTextBuffer.join('');
                    if (textContent) {
                      segments.push({ type: 'text', content: textContent });
                    }
                    currentTextBuffer = [];
                  }
                  
                  // 引用セグメントを追加（引用テキストと発言者情報を取得）
                  const quoteInfo = extractQuoteInfo(node);
                  if (quoteInfo.text) {
                    segments.push({ 
                      type: 'quote', 
                      content: quoteInfo.text, 
                      author: quoteInfo.author,
                      externalLinks: quoteInfo.externalLinks || []
                    });
                  }
                  return; // 引用の子ノードはすでに処理済み
                }
                
                // To/Re/ToAll要素の場合、セグメントとして挿入
                const isToReElement = toReSelectors.some(sel => node.matches && node.matches(sel));
                if (isToReElement) {
                  // 現在のテキストバッファを先にセグメントに追加
                  if (currentTextBuffer.length > 0) {
                    const textContent = currentTextBuffer.join('');
                    if (textContent) {
                      segments.push({ type: 'text', content: textContent });
                    }
                    currentTextBuffer = [];
                  }
                  
                  const cwtag = node.getAttribute('data-cwtag') || '';
                  
                  // [rp] 返信バッジ
                  if (cwtag.match(/^\[rp\s/i)) {
                    const aidMatch = cwtag.match(/aid=(\d+)/i);
                    const rpAid = aidMatch ? aidMatch[1] : null;
                    let rpAvatarUrl = '';
                    const rpAvImg = node.querySelector('img[data-testid="user-icon"], img.userIconImage, img[src*="avatar"], img[src*="ico_default"]');
                    if (rpAvImg) rpAvatarUrl = rpAvImg.src || '';
                    if (!rpAvatarUrl) {
                      const rpBtnImg = node.querySelector('button img[src*="avatar"], button img[src*="ico_default"], button img[data-testid="user-icon"]');
                      if (rpBtnImg) rpAvatarUrl = rpBtnImg.src || '';
                    }
                    if (!rpAvatarUrl && rpAid && this.aidAvatarMap && this.aidAvatarMap.has(rpAid)) {
                      rpAvatarUrl = this.aidAvatarMap.get(rpAid);
                    }
                    segments.push({ type: 'reply', aid: rpAid, avatarUrl: rpAvatarUrl });
                  }
                  // [toall]
                  else if (cwtag.match(/^\[toall\]/i)) {
                    segments.push({ type: 'to', targets: [{ name: 'ALL', avatarUrl: '', aid: null }] });
                  }
                  // [to] / [To]
                  else if (cwtag.match(/^\[to/i)) {
                    let toAid = null;
                    const aidFmt = cwtag.match(/aid=(\d+)/i);
                    if (aidFmt) {
                      toAid = aidFmt[1];
                    } else {
                      const colonFmt = cwtag.match(/\[to:(\d+)\]/i);
                      if (colonFmt) toAid = colonFmt[1];
                    }
                    const matchingTarget = toTargets.find(t => toAid && t.aid === toAid);
                    if (matchingTarget) {
                      segments.push({ type: 'to', targets: [matchingTarget] });
                    } else {
                      const name = node.textContent?.trim() || '';
                      let avUrl = '';
                      if (toAid && this.aidAvatarMap && this.aidAvatarMap.has(toAid)) {
                        avUrl = this.aidAvatarMap.get(toAid);
                      }
                      if (name || toAid) {
                        segments.push({ type: 'to', targets: [{ name, avatarUrl: avUrl, aid: toAid }] });
                      }
                    }
                  }
                  return; // To/Reの子ノードはスキップ
                }
                
                // 除外セレクタに一致する要素はスキップ
                for (const selector of nonQuoteExcludeSelectors) {
                  if (node.matches && node.matches(selector)) {
                    return;
                  }
                }
                
                // 子ノードを再帰処理
                for (const child of node.childNodes) {
                  processNode(child);
                }
              }
            };
            
            // 引用情報を抽出する関数
            const extractQuoteInfo = (quoteTag) => {
              let author = null;
              let text = '';
              let links = [];
              
              // 発言者情報を取得
              const quoteTitle = quoteTag.querySelector('.chatQuote__title');
              if (quoteTitle) {
                const pnameEl = quoteTitle.querySelector('[data-cwtag^="[pname"]');
                const nameEl = pnameEl || quoteTitle.querySelector('[class*="_nameAid"]');
                const authorName = nameEl ? nameEl.textContent.trim() : '';
                
                const avatarEl = quoteTitle.querySelector('img[data-testid="user-icon"], img[class*="avatar"], .userIconImage');
                const authorAvatarUrl = avatarEl ? avatarEl.src : '';
                
                const timestampEl = quoteTitle.querySelector('.quoteTimeStamp, .chatQuote__timeStamp, [data-cwtag^="[date"]');
                const authorTimestamp = timestampEl ? timestampEl.textContent.trim() : '';
                
                if (authorName) {
                  author = {
                    name: authorName,
                    avatarUrl: authorAvatarUrl,
                    timestamp: authorTimestamp
                  };
                }
              }
              
              // 引用テキストを取得
              const quoteTextEl = quoteTag.querySelector('.quoteText');
              if (quoteTextEl) {
                const textNodes = [];
                const walker = document.createTreeWalker(
                  quoteTextEl,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: (node) => {
                      const parent = node.parentElement;
                      if (!parent) return NodeFilter.FILTER_REJECT;
                      if (parent.closest('._previewLink, [data-type*="preview"]')) {
                        return NodeFilter.FILTER_REJECT;
                      }
                      if (parent.closest('.quoteTimeStamp, .chatQuote__timeStamp, [data-cwtag^="[date"]')) {
                        return NodeFilter.FILTER_REJECT;
                      }
                      return NodeFilter.FILTER_ACCEPT;
                    }
                  }
                );
                let textNode;
                while (textNode = walker.nextNode()) {
                  const t = textNode.textContent;
                  if (t && t.trim()) {
                    textNodes.push(t);
                  }
                }
                text = textNodes.join('').trim();
                
                // 引用内の外部リンクを収集
                const quoteLinks = quoteTextEl.querySelectorAll('a[href]');
                quoteLinks.forEach(link => {
                  const href = link.getAttribute('href') || '';
                  if (!href || 
                      href.startsWith('#') || 
                      href.startsWith('javascript:') ||
                      href.includes('chatwork.com') ||
                      href.includes('/gateway/') ||
                      href.includes('download_file') ||
                      link.classList.contains('_previewLink')) {
                    return;
                  }
                  
                  const parentContainer = link.closest('[data-cwtag^="http"], [class*="url"], [class*="link"]') || link.parentElement;
                  let hasPreviewButton = false;
                  let previewElement = null;
                  if (parentContainer) {
                    const previewBtn = parentContainer.querySelector('a._previewLink[data-url]');
                    if (previewBtn) {
                      hasPreviewButton = true;
                      previewElement = previewBtn;
                    }
                  }
                  
                  let title = link.textContent?.trim() || '';
                  if (title === href || title.length > 50) {
                    try {
                      const urlObj = new URL(href);
                      title = urlObj.hostname + (urlObj.pathname.length > 25 ? urlObj.pathname.substring(0, 25) + '...' : urlObj.pathname);
                    } catch {
                      title = href.length > 50 ? href.substring(0, 50) + '...' : href;
                    }
                  }
                  
                  if (!links.some(l => l.url === href)) {
                    links.push({ url: href, title, hasPreviewButton, previewElement, isInQuote: true });
                  }
                });
              } else {
                // quoteTextがない場合、他の要素から取得
                const quoteContent = quoteTag.querySelector('.sc-klVQfs, .chatTimeLineQuoteLine');
                if (quoteContent) {
                  const textNodes = [];
                  const walker = document.createTreeWalker(
                    quoteContent,
                    NodeFilter.SHOW_TEXT,
                    {
                      acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        if (parent.closest('.chatQuote__title, .quoteTimeStamp, ._previewLink, [data-type*="preview"]')) {
                          return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                      }
                    }
                  );
                  let textNode;
                  while (textNode = walker.nextNode()) {
                    const t = textNode.textContent;
                    if (t && t.trim()) {
                      textNodes.push(t);
                    }
                  }
                  text = textNodes.join('').trim();
                }
                
                if (!text) {
                  const textNodes = [];
                  const walker = document.createTreeWalker(
                    quoteTag,
                    NodeFilter.SHOW_TEXT,
                    {
                      acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        if (parent.closest('.chatQuote__title, .chatQuote__quoteLeftArea, .quoteTimeStamp, ._previewLink, [data-type*="preview"], [data-cwtag^="[pname"]')) {
                          return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                      }
                    }
                  );
                  let textNode;
                  while (textNode = walker.nextNode()) {
                    const t = textNode.textContent;
                    if (t && t.trim()) {
                      textNodes.push(t);
                    }
                  }
                  text = textNodes.join('').trim();
                }
              }
              
              return { text, author, externalLinks: links };
            };
            
            // 全ての子ノードを処理
            for (const child of parentEl.childNodes) {
              processNode(child);
            }
            
            // 残りのテキストバッファをセグメントに追加
            if (currentTextBuffer.length > 0) {
              const textContent = currentTextBuffer.join('');
              if (textContent) {
                segments.push({ type: 'text', content: textContent });
              }
            }
            
            return segments;
          };
          
          // セグメントを収集
          messageSegments = processNodeForSegments(preEl);
          
          // 後方互換性のため、quotedMessage と quoteAuthor を設定
          // 引用セグメントから最初の引用を取得
          const firstQuoteSegment = messageSegments.find(seg => seg.type === 'quote');
          if (firstQuoteSegment) {
            quotedMessage = firstQuoteSegment.content;
            quoteAuthor = firstQuoteSegment.author;
            // 引用内の外部リンクもquoteExternalLinksに追加
            if (firstQuoteSegment.externalLinks) {
              quoteExternalLinks = [...quoteExternalLinks, ...firstQuoteSegment.externalLinks];
            }
          }
          
          // 全てのテキストセグメントを結合してmessageTextを作成
          const textSegments = messageSegments.filter(seg => seg.type === 'text');
          if (textSegments.length > 0) {
            let rawText = textSegments.map(seg => seg.content).join('\n').trim();
            
            // To先・返信先の「〇〇さん」の行をすべて除去
            // toTargetsに名前がある場合、それらに対応する「〇〇さん」パターンを除去
            const toNames = toTargets.map(t => t.name).filter(n => n && n !== 'ALL');
            
            // まず最初の「〇〇さん」を返信先ユーザー名として取得
            // ただし、返信タグ [rp] がある場合のみ返信先として扱う
            const replyTagExists = preEl.querySelector('[data-cwtag^="[rp"]');
            const userNameMatch = rawText.match(/^(.+?)さん[\r\n\s]+/);
            if (userNameMatch && replyTagExists) {
              replyTargetUserName = userNameMatch[1];
              // replyTargetUserNameがTo先名前と同じ場合は返信先としては扱わない
              // （To先の名前がテキスト先頭に来ているだけの可能性）
              const isAlsoToTarget = toTargets.some(t => t.name === replyTargetUserName);
              if (isAlsoToTarget && !preEl.querySelector('[data-cwtag^="[rp"]')?.getAttribute('data-cwtag')?.includes('aid=')) {
                replyTargetUserName = null;
              }
            }
            
            // To先の名前に一致する「〇〇さん」パターンをすべて除去
            if (toNames.length > 0) {
              for (const name of toNames) {
                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(escapedName + 'さん[\\r\\n\\s]*', 'g');
                rawText = rawText.replace(pattern, '');
              }
            }
            // 返信先の「〇〇さん」も除去（toTargetsに含まれない場合）
            if (replyTargetUserName) {
              const escapedName = replyTargetUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = new RegExp('^' + escapedName + 'さん[\\r\\n\\s]*');
              rawText = rawText.replace(pattern, '');
            }
            // 先頭・末尾の空白行を除去
            rawText = rawText.replace(/^[\r\n\s]+/, '').replace(/[\r\n\s]+$/, '');
            
            // セグメントも更新（全てのテキストセグメントをクリーンアップ）
            messageSegments.forEach(seg => {
              if (seg.type !== 'text') return;
              let segText = seg.content;
              if (toNames.length > 0) {
                for (const name of toNames) {
                  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  // 名前+さん の後のスペース・タブのみ除去（改行は保持）
                  const pattern = new RegExp(escapedName + 'さん[ \\t]*', 'g');
                  segText = segText.replace(pattern, '');
                }
              }
              if (replyTargetUserName) {
                const escapedName = replyTargetUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp('^' + escapedName + 'さん[ \\t]*');
                segText = segText.replace(pattern, '');
              }
              // 名前除去のみ行い、改行は保持する
              seg.content = segText;
            });
            
            messageText = rawText.trim();
          }
        }

        // タイムスタンプを取得
        const timeEl = el.querySelector('[data-tm]');
        const timestamp = timeEl ? timeEl.getAttribute('data-tm') : '';
        const timeText = timeEl ? timeEl.textContent.trim() : '';

        // 返信元を解析
        const replyTag = el.querySelector('[data-cwtag^="[rp"]');
        let parentMid = null;
        let parentAid = null;
        let parentAvatarUrl = '';
        if (replyTag) {
          const cwtag = replyTag.getAttribute('data-cwtag');
          // [rp aid=XXXX to=ROOMID-MESSAGEID] 形式をパース
          const match = cwtag.match(/to=(\d+)-(\d+)/);
          if (match) {
            parentMid = match[2];
          }
          // 返信先のユーザーIDを取得
          const aidMatch = cwtag.match(/aid=(\d+)/);
          if (aidMatch) {
            parentAid = aidMatch[1];
          }
          // 返信先アバターURLを取得
          const rpAvatarImg = replyTag.querySelector('img[data-testid="user-icon"], img.userIconImage, img[src*="avatar"], img[src*="ico_default"]');
          if (rpAvatarImg) {
            parentAvatarUrl = rpAvatarImg.src || '';
          }
          if (!parentAvatarUrl) {
            const rpBtnImg = replyTag.querySelector('button img[src*="avatar"], button img[src*="ico_default"], button img[data-testid="user-icon"]');
            if (rpBtnImg) {
              parentAvatarUrl = rpBtnImg.src || '';
            }
          }
          // AID→Avatarマップからフォールバック
          if (!parentAvatarUrl && parentAid && this.aidAvatarMap && this.aidAvatarMap.has(parentAid)) {
            parentAvatarUrl = this.aidAvatarMap.get(parentAid);
          }
          // _avatarAidXXXXクラスで探す
          if (!parentAvatarUrl && parentAid) {
            const classAvatar = document.querySelector(`img._avatarAid${parentAid}`);
            if (classAvatar && classAvatar.src) {
              parentAvatarUrl = classAvatar.src;
            }
          }
        }

        const messageData = {
          mid,
          rid,
          userName,
          messageText,
          timestamp,
          timeText,
          parentMid,
          parentUserName: replyTargetUserName, // 本文から取得したユーザー名を使用
          parentAid,
          parentAvatarUrl, // 返信先アバターURL
          avatarUrl,
          element: el,
          quotedMessage,   // 引用メッセージ（後方互換用）
          quoteAuthor,     // 引用元発言者情報 { name, avatarUrl, timestamp }
          filePreviewInfo, // ファイルプレビュー情報配列
          externalLinks,   // 外部リンク情報配列
          quoteExternalLinks, // 引用内の外部リンク情報配列
          toTargets,       // To先ユーザー配列
          senderAid,       // 送信者のAID
          isToMe,          // 自分宛てフラグ
          isFromMe,        // 自分が送信したメッセージフラグ
          messageSegments  // メッセージセグメント（テキストと引用を順序付きで保持）
        };

        this.messages.set(mid, messageData);
        this.allMessages.push(messageData);

        if (parentMid) {
          this.replyMap.set(mid, parentMid);
          
          if (!this.childrenMap.has(parentMid)) {
            this.childrenMap.set(parentMid, []);
          }
          this.childrenMap.get(parentMid).push(mid);
        }
      });
      
      // デバッグ: 自分宛てメッセージを出力
      // console.log('[ChatWorkThreader] 自分宛てメッセージ (isToMe=true) の MID一覧:', toMeMids);
      // console.log('[ChatWorkThreader] 自分宛てメッセージ数:', toMeMids.length, '/', messageElements.length, '件');

      // セカンドパス: 収集したメッセージの送信者情報を使ってAID→Avatarマップを補完し、
      // 未解決のTo先・返信先アバターを埋める
      this.allMessages.forEach(msg => {
        if (msg.senderAid && msg.avatarUrl && !this.aidAvatarMap.has(msg.senderAid)) {
          this.aidAvatarMap.set(msg.senderAid, msg.avatarUrl);
        }
      });
      // 未解決のTo先アバターを補完
      this.allMessages.forEach(msg => {
        if (msg.toTargets && msg.toTargets.length > 0) {
          msg.toTargets.forEach(target => {
            if (!target.avatarUrl && target.aid && this.aidAvatarMap.has(target.aid)) {
              target.avatarUrl = this.aidAvatarMap.get(target.aid);
            }
          });
        }
        // 未解決の返信先アバターを補完
        if (!msg.parentAvatarUrl && msg.parentAid && this.aidAvatarMap.has(msg.parentAid)) {
          msg.parentAvatarUrl = this.aidAvatarMap.get(msg.parentAid);
        }
      });
    }

    /**
     * スレッドのルートを見つける
     */
    findRootMid(mid) {
      let current = mid;
      const visited = new Set();
      
      while (this.replyMap.has(current) && !visited.has(current)) {
        visited.add(current);
        current = this.replyMap.get(current);
      }
      
      return current;
    }

    /**
     * スレッドを構築
     */
    buildThreads() {
      // 返信があるメッセージ（スレッドに含まれるメッセージ）を特定
      const threadedMids = new Set();
      
      this.replyMap.forEach((parentMid, childMid) => {
        threadedMids.add(childMid);
        threadedMids.add(parentMid);
      });

      // 各スレッドのルートを見つけてグループ化
      const rootGroups = new Map(); // root mid -> Set of all mids in thread
      
      threadedMids.forEach(mid => {
        const rootMid = this.findRootMid(mid);
        if (!rootGroups.has(rootMid)) {
          rootGroups.set(rootMid, new Set());
        }
        rootGroups.get(rootMid).add(mid);
      });

      // 各ルートにスレッドツリーを構築
      rootGroups.forEach((mids, rootMid) => {
        const thread = this.buildThreadTree(rootMid);
        if (thread) {
          this.threads.set(rootMid, thread);
        }
      });

      return this.threads;
    }

    /**
     * 再帰的にスレッドツリーを構築
     */
    buildThreadTree(mid) {
      const message = this.messages.get(mid);
      const children = this.childrenMap.get(mid) || [];
      const childTrees = children
        .map(childMid => this.buildThreadTree(childMid))
        .filter(tree => tree !== null)
        .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

      if (!message) {
        // メッセージが見つからない場合、子メッセージから親情報を推測してプレースホルダーを作成
        if (childTrees.length === 0) {
          return null;
        }
        
        // 最初の子メッセージから返信先情報を取得
        const firstChild = childTrees[0];
        const placeholder = this.createPlaceholderMessage(mid, firstChild);
        
        return {
          ...placeholder,
          children: childTrees
        };
      }

      return {
        ...message,
        children: childTrees
      };
    }

    /**
     * プレースホルダーメッセージを作成（返信元が見つからない場合）
     */
    createPlaceholderMessage(mid, firstChild) {
      // 子メッセージに保存された返信先情報を使用
      const parentUserName = firstChild.parentUserName || '不明なユーザー';
      
      return {
        mid,
        rid: firstChild.rid,
        userName: parentUserName,
        messageText: '（メッセージを読み込めませんでした）',
        // ソート用に子メッセージのタイムスタンプを使用（推定値）
        timestamp: firstChild.timestamp || '',
        timeText: '',
        parentMid: null,
        parentUserName: null,
        parentAid: null,
        parentAvatarUrl: '',
        avatarUrl: '',
        element: null,
        isPlaceholder: true,
        quotedMessage: null,
        quoteAuthor: null,
        filePreviewInfo: [],
        externalLinks: [],
        quoteExternalLinks: [],
        toTargets: [],
        senderAid: null,
        messageSegments: []  // プレースホルダーはセグメントなし
      };
    }

    /**
     * メッセージの種類を判定
     * 1: 返信元でも返信先でもない
     * 2: 返信元である（子がある）
     * 3: 返信先である（親がある）
     * 4: 返信元でも返信先でもある
     */
    getMessageType(mid) {
      const hasParent = this.replyMap.has(mid);
      const hasChildren = this.childrenMap.has(mid) && this.childrenMap.get(mid).length > 0;

      if (hasParent && hasChildren) return 4;
      if (hasParent) return 3;
      if (hasChildren) return 2;
      return 1;
    }

    /**
     * スレッドツリーの最大階層を取得
     * @param {Object} node - スレッドノード
     * @param {number} currentDepth - 現在の深さ
     * @returns {number} 最大階層
     */
    getMaxDepth(node, currentDepth = 0) {
      if (!node.children || node.children.length === 0) {
        return currentDepth;
      }
      let maxChildDepth = currentDepth;
      for (const child of node.children) {
        const childDepth = this.getMaxDepth(child, currentDepth + 1);
        if (childDepth > maxChildDepth) {
          maxChildDepth = childDepth;
        }
      }
      return maxChildDepth;
    }

    /**
     * 全スレッドの中で最大の階層を取得
     * @returns {number} 最大階層
     */
    getOverallMaxDepth() {
      let maxDepth = 0;
      for (const thread of this.threads.values()) {
        const depth = this.getMaxDepth(thread);
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      }
      return maxDepth;
    }
  }

  /**
   * スレッド表示UIを管理
   */
  class ThreadUI {
    constructor(threadBuilder) {
      this.threadBuilder = threadBuilder;
      this.panel = null;
      this.isVisible = false;
      this.chatworkMainElement = null;
      this.originalStyles = null;
      this.currentRoomId = null;
      this.toggleStates = {}; // roomId -> { threadMid: boolean }
      this.showOnlyMyThreads = false; // 自分が参加（返信元/返信先）しているスレッドのみ表示するフィルター
      this.currentUserAid = null; // 現在のユーザーAID
      this.selectedSpeaker = ''; // 選択中の発言者（空の場合は全員表示）
      this.flatIndentMode = false; // フラット表示モード（全子要素を1階層で表示）
      this.searchQuery = ''; // 検索クエリ
      this.searchMatches = []; // 検索マッチしたメッセージ要素のリスト
      this.currentSearchIndex = -1; // 現在の検索結果インデックス
      this.trackingMid = null; // トラッキング中のメッセージID
      this.showInThreadManager = null; // ShowInThreadButtonManagerへの参照
      this.pinnedThreads = new Set(); // ピン止めされたスレッドのmidセット
    }

    /**
     * 現在のルームIDを取得
     */
    getCurrentRoomId() {
      // URLから取得: https://www.chatwork.com/#!rid123456
      const hash = window.location.hash;
      const match = hash.match(/rid(\d+)/);
      if (match) {
        return match[1];
      }
      // data-rid属性から取得
      const messageEl = document.querySelector('[data-rid]');
      if (messageEl) {
        return messageEl.getAttribute('data-rid');
      }
      return null;
    }

    /**
     * ストレージキーを生成（トグル状態用）
     */
    getStorageKey() {
      return 'cw-threader-toggle-states';
    }

    /**
     * ルーム設定用のストレージキーを生成
     */
    getRoomSettingsStorageKey() {
      return 'cw-threader-room-settings';
    }

    /**
     * ルーム設定を読み込み
     * @returns {Object} 設定オブジェクト { selectedSpeaker, flatIndentMode, showOnlyMyThreads }
     */
    async loadRoomSettings() {
      const roomId = this.getCurrentRoomId();
      if (!roomId) return null;

      if (!isExtensionContextValid()) return null;

      try {
        const result = await chrome.storage.local.get(this.getRoomSettingsStorageKey());
        const allSettings = result[this.getRoomSettingsStorageKey()] || {};
        return allSettings[roomId] || null;
      } catch (e) {
        console.error('ChatWork Threader: ルーム設定の読み込みに失敗', e);
        return null;
      }
    }

    /**
     * ルーム設定を保存
     */
    async saveRoomSettings() {
      const roomId = this.currentRoomId;
      if (!roomId) return;

      if (!isExtensionContextValid()) return;

      const settings = {
        selectedSpeaker: this.selectedSpeaker,
        flatIndentMode: this.flatIndentMode,
        showOnlyMyThreads: this.showOnlyMyThreads
      };

      try {
        const result = await chrome.storage.local.get(this.getRoomSettingsStorageKey());
        const allSettings = result[this.getRoomSettingsStorageKey()] || {};
        allSettings[roomId] = settings;
        await chrome.storage.local.set({ [this.getRoomSettingsStorageKey()]: allSettings });
      } catch (e) {
        console.error('ChatWork Threader: ルーム設定の保存に失敗', e);
      }
    }

    /**
     * ルーム設定を適用（UI要素にも反映）
     * @param {Object} settings - 設定オブジェクト
     */
    applyRoomSettings(settings) {
      if (!settings) return;

      // 発言者プルダウン
      if (settings.selectedSpeaker !== undefined) {
        this.selectedSpeaker = settings.selectedSpeaker;
      }

      // フラット表示モード
      if (settings.flatIndentMode !== undefined) {
        this.flatIndentMode = settings.flatIndentMode;
        const flatModeBtn = document.getElementById('cw-threader-flat-mode');
        if (flatModeBtn) {
          flatModeBtn.classList.toggle('active', this.flatIndentMode);
        }
      }

      // 自分参加のみフィルター
      if (settings.showOnlyMyThreads !== undefined) {
        this.showOnlyMyThreads = settings.showOnlyMyThreads;
        const filterBtn = document.getElementById('cw-threader-my-filter');
        if (filterBtn) {
          filterBtn.classList.toggle('active', this.showOnlyMyThreads);
        }
      }
    }

    /**
     * ルームのトグル状態を読み込み
     */
    async loadToggleStates() {
      const roomId = this.getCurrentRoomId();
      if (!roomId) return;
      
      this.currentRoomId = roomId;
      
      if (!isExtensionContextValid()) {
        this.toggleStates = {};
        return;
      }
      
      try {
        const result = await chrome.storage.local.get(this.getStorageKey());
        const allStates = result[this.getStorageKey()] || {};
        this.toggleStates = allStates[roomId] || {};
      } catch (e) {
        console.error('ChatWork Threader: トグル状態の読み込みに失敗', e);
        this.toggleStates = {};
      }
    }

    /**
     * トグル状態を保存
     */
    async saveToggleState(threadMid, isOpen) {
      const roomId = this.currentRoomId;
      if (!roomId) return;

      this.toggleStates[threadMid] = isOpen;

      if (!isExtensionContextValid()) return;

      try {
        const result = await chrome.storage.local.get(this.getStorageKey());
        const allStates = result[this.getStorageKey()] || {};
        allStates[roomId] = this.toggleStates;
        await chrome.storage.local.set({ [this.getStorageKey()]: allStates });
      } catch (e) {
        console.error('ChatWork Threader: トグル状態の保存に失敗', e);
      }
    }

    /**
     * スレッドのトグル状態を取得（デフォルトはtrue=開いている）
     */
    getToggleState(threadMid) {
      if (this.toggleStates.hasOwnProperty(threadMid)) {
        return this.toggleStates[threadMid];
      }
      return true; // デフォルトは開いている状態
    }

    /**
     * 現在のルームのピン止め状態を読み込み
     */
    async loadPinnedThreads() {
      const roomId = this.getCurrentRoomId();
      if (!roomId) return;
      
      this.pinnedThreads = await getPinnedThreads(roomId);
    }

    /**
     * スレッドのピン止め状態をトグル
     * @param {string} mid - スレッドのルートメッセージID
     */
    async togglePinThread(mid) {
      const roomId = this.getCurrentRoomId();
      if (!roomId || !mid) return;
      
      const isPinned = this.pinnedThreads.has(mid);
      if (isPinned) {
        this.pinnedThreads.delete(mid);
      } else {
        this.pinnedThreads.add(mid);
      }
      
      // ストレージに保存
      savePinnedState(roomId, mid, !isPinned);
      
      // UI更新
      this.renderThreads();
    }

    /**
     * スレッドがピン止めされているか確認
     * @param {string} mid - スレッドのルートメッセージID
     * @returns {boolean}
     */
    isThreadPinned(mid) {
      return this.pinnedThreads.has(mid);
    }

    /**
     * パネルを作成
     */
    createPanel() {
      // 既存のパネルを削除
      const existingPanel = document.getElementById('cw-threader-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      // アイコンURLを取得
      let threadsIconUrl = '';
      let settingsIconUrl = '';
      let helpIconUrl = '';
      let participationIconUrl = '';
      let flatListIconUrl = '';
      let maximizeIconUrl = '';
      let minimizeIconUrl = '';
      if (isExtensionContextValid()) {
        try {
          threadsIconUrl = chrome.runtime.getURL('icons/chat-round-line-svgrepo-com.svg');
          settingsIconUrl = chrome.runtime.getURL('icons/settings-svgrepo-com.svg');
          helpIconUrl = chrome.runtime.getURL('icons/book-minimalistic-svgrepo-com.svg');
          participationIconUrl = chrome.runtime.getURL('icons/user-participation-svgrepo-com.svg');
          flatListIconUrl = chrome.runtime.getURL('icons/layers-minimalistic-svgrepo-com.svg');
          maximizeIconUrl = chrome.runtime.getURL('icons/maximize-square-minimalistic-svgrepo-com.svg');
          minimizeIconUrl = chrome.runtime.getURL('icons/minimize-square-minimalistic-svgrepo-com.svg');
        } catch (e) {
          // 拡張機能のコンテキストが無効な場合
        }
      }

      // アイコンURLをインスタンスに保存（createThreadElementで使用）
      this.maximizeIconUrl = maximizeIconUrl;
      this.minimizeIconUrl = minimizeIconUrl;

      this.panel = document.createElement('div');
      this.panel.id = 'cw-threader-panel';
      this.panel.innerHTML = `
        <div class="cw-threader-resize-handle"></div>
        <div class="cw-threader-header">
          <div class="cw-threader-header-tabs">
            <button class="cw-threader-tab-icon active" data-tab="threads" data-ct-i18n-title="tab_threads" title="${t('tab_threads')}">
              ${threadsIconUrl ? `<img src="${threadsIconUrl}" data-ct-i18n-alt="tab_threads" alt="${t('tab_threads')}">` : '💬'}
            </button>
            <button class="cw-threader-tab-icon" data-tab="settings" data-ct-i18n-title="tab_settings" title="${t('tab_settings')}">
              ${settingsIconUrl ? `<img src="${settingsIconUrl}" data-ct-i18n-alt="tab_settings" alt="${t('tab_settings')}">` : '⚙️'}
            </button>
            <button class="cw-threader-tab-icon" data-tab="help" data-ct-i18n-title="tab_help" title="${t('tab_help')}">
              ${helpIconUrl ? `<img src="${helpIconUrl}" data-ct-i18n-alt="tab_help" alt="${t('tab_help')}">` : '📖'}
            </button>
          </div>
          <div class="cw-threader-controls">
            <button id="cw-threader-close" data-ct-i18n-title="close" title="${t('close')}">×</button>
          </div>
        </div>
        <div class="cw-threader-tab-content" data-tab-content="threads">
          <div class="cw-threader-thread-filters">
            <select id="cw-threader-speaker-filter" class="cw-threader-speaker-select" data-ct-i18n-title="filter_by_speaker" title="${t('filter_by_speaker')}">
              <option value="" data-ct-i18n="filter_all">${t('filter_all')}</option>
            </select>
            <button id="cw-threader-my-filter" class="cw-threader-icon-toggle" data-ct-i18n-title="my_participation_tooltip" title="${t('my_participation_tooltip')}">
              ${participationIconUrl ? `<img src="${participationIconUrl}" data-ct-i18n-alt="my_participation" alt="${t('my_participation')}">` : '👤'}
            </button>
            <button id="cw-threader-flat-mode" class="cw-threader-icon-toggle" data-ct-i18n-title="flat_mode" title="${t('flat_mode')}">
              ${flatListIconUrl ? `<img src="${flatListIconUrl}" data-ct-i18n-alt="flat_mode" alt="${t('flat_mode')}">` : '☰'}
            </button>
            <button id="cw-threader-refresh" class="cw-threader-refresh-btn" data-ct-i18n-title="refresh" title="${t('refresh')}">↻</button>
          </div>
          <div class="cw-threader-search-bar">
            <div class="cw-threader-search-input-wrapper">
              <input type="text" id="cw-threader-search" class="cw-threader-search-input" data-ct-i18n-placeholder="search_placeholder" placeholder="${t('search_placeholder')}">
              <button id="cw-threader-search-clear" class="cw-threader-search-clear" data-ct-i18n-title="search_clear" title="${t('search_clear')}">×</button>
            </div>
            <div id="cw-threader-search-nav" class="cw-threader-search-nav">
              <button id="cw-threader-search-prev" class="cw-threader-search-nav-btn" data-ct-i18n-title="search_prev" title="${t('search_prev')}">▲</button>
              <button id="cw-threader-search-next" class="cw-threader-search-nav-btn" data-ct-i18n-title="search_next" title="${t('search_next')}">▼</button>
            </div>
            <span id="cw-threader-search-count" class="cw-threader-search-count"></span>
          </div>
          <div class="cw-threader-content">
            <div class="cw-threader-threads"></div>
          </div>
        </div>
        <div class="cw-threader-tab-content" data-tab-content="settings" style="display: none;">
          <div class="cw-threader-settings-content">
            <div class="cw-threader-settings-item">
              <label class="cw-threader-settings-label" data-ct-i18n="language_label">${t('language_label')}</label>
              <select id="cw-threader-language-select" class="cw-threader-settings-select">
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <div class="cw-threader-settings-item">
              <label class="cw-threader-settings-label" data-ct-i18n="theme_label">${t('theme_label')}</label>
              <select id="cw-threader-theme-select" class="cw-threader-settings-select">
                <option value="system" data-ct-i18n="theme_system">${t('theme_system')}</option>
                <option value="light" data-ct-i18n="theme_light">${t('theme_light')}</option>
                <option value="dark" data-ct-i18n="theme_dark">${t('theme_dark')}</option>
              </select>
            </div>
            <p class="cw-threader-settings-note" data-ct-i18n="settings_auto_save">${t('settings_auto_save')}</p>
          </div>
        </div>
        <div class="cw-threader-tab-content" data-tab-content="help" style="display: none;">
          <div class="cw-threader-help-content">
            <div class="cw-threader-help-section">
              <h3 class="cw-threader-help-title" data-ct-i18n="help_how_to_use">${t('help_how_to_use')}</h3>
              <ol class="cw-threader-help-steps">
                <li data-ct-i18n="help_step1">${t('help_step1')}</li>
                <li data-ct-i18n-html="help_step2">${t('help_step2')}</li>
                <li data-ct-i18n="help_step3">${t('help_step3')}</li>
                <li data-ct-i18n="help_step4">${t('help_step4')}</li>
              </ol>
            </div>
            <div class="cw-threader-help-section">
              <h3 class="cw-threader-help-title" data-ct-i18n="help_features">${t('help_features')}</h3>
              <ul class="cw-threader-help-features">
                <li><strong data-ct-i18n="feature_thread_view">${t('feature_thread_view')}</strong> <span data-ct-i18n="feature_thread_view_desc">${t('feature_thread_view_desc')}</span></li>
                <li><strong data-ct-i18n="feature_search">${t('feature_search')}</strong> <span data-ct-i18n="feature_search_desc">${t('feature_search_desc')}</span></li>
                <li><strong data-ct-i18n="feature_filter">${t('feature_filter')}</strong> <span data-ct-i18n="feature_filter_desc">${t('feature_filter_desc')}</span></li>
                <li><strong data-ct-i18n="feature_participation">${t('feature_participation')}</strong> <span data-ct-i18n="feature_participation_desc">${t('feature_participation_desc')}</span></li>
                <li><strong data-ct-i18n="feature_flat">${t('feature_flat')}</strong> <span data-ct-i18n="feature_flat_desc">${t('feature_flat_desc')}</span></li>
                <li><strong data-ct-i18n="feature_preview">${t('feature_preview')}</strong> <span data-ct-i18n="feature_preview_desc">${t('feature_preview_desc')}</span></li>
                <li><strong data-ct-i18n="feature_jump">${t('feature_jump')}</strong> <span data-ct-i18n="feature_jump_desc">${t('feature_jump_desc')}</span></li>
              </ul>
            </div>
            <div class="cw-threader-help-section">
              <h3 class="cw-threader-help-title" data-ct-i18n="help_badge_legend">${t('help_badge_legend')}</h3>
              <div class="cw-threader-badge-legend">
                <div class="cw-threader-badge-item">
                  <span class="cw-threader-badge cw-threader-badge-root" data-ct-i18n="badge_root">${t('badge_root')}</span>
                  <span data-ct-i18n="badge_root_desc">${t('badge_root_desc')}</span>
                </div>
                <div class="cw-threader-badge-item">
                  <span class="cw-threader-badge cw-threader-badge-reply" data-ct-i18n="badge_reply">${t('badge_reply')}</span>
                  <span data-ct-i18n="badge_reply_desc">${t('badge_reply_desc')}</span>
                </div>
                <div class="cw-threader-badge-item">
                  <span class="cw-threader-badge cw-threader-badge-both" data-ct-i18n="badge_both">${t('badge_both')}</span>
                  <span data-ct-i18n="badge_both_desc">${t('badge_both_desc')}</span>
                </div>
              </div>
            </div>
            <div class="cw-threader-help-section">
              <h3 class="cw-threader-help-title" data-ct-i18n="help_shortcuts">${t('help_shortcuts')}</h3>
              <ul class="cw-threader-help-shortcuts">
                <li><kbd>Shift</kbd>+<kbd>S</kbd> - <span data-ct-i18n="shortcut_toggle">${t('shortcut_toggle')}</span></li>
                <li><kbd>Esc</kbd> - <span data-ct-i18n="shortcut_close">${t('shortcut_close')}</span></li>
              </ul>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(this.panel);

      // リサイズハンドルの設定
      this.setupResizeHandle();

      // イベントリスナーを設定
      document.getElementById('cw-threader-close').addEventListener('click', () => {
        this.hide();
      });

      document.getElementById('cw-threader-refresh').addEventListener('click', () => {
        this.refresh();
      });

      // フラット表示モードのアイコンボタンのイベントリスナー
      const flatModeBtn = document.getElementById('cw-threader-flat-mode');
      if (flatModeBtn) {
        flatModeBtn.addEventListener('click', () => {
          this.flatIndentMode = !this.flatIndentMode;
          flatModeBtn.classList.toggle('active', this.flatIndentMode);
          this.saveRoomSettings(); // 設定を保存
          // フラットモード切り替え時にパネル幅を再計算
          let panelWidth;
          if (this.flatIndentMode) {
            panelWidth = 550; // 最小幅
          } else {
            const actualMaxDepth = this.threadBuilder.getOverallMaxDepth();
            panelWidth = this.calculatePanelWidth(actualMaxDepth);
          }
          this.panel.style.width = panelWidth + 'px';
          if (this.isVisible) {
            this.adjustChatworkMainContent(panelWidth);
          }
          this.renderThreads();
        });
      }

      // フィルタートグル（自分の参加のみ）のアイコンボタンのイベントリスナー
      const filterBtn = document.getElementById('cw-threader-my-filter');
      if (filterBtn) {
        filterBtn.addEventListener('click', () => {
          this.showOnlyMyThreads = !this.showOnlyMyThreads;
          filterBtn.classList.toggle('active', this.showOnlyMyThreads);
          this.saveRoomSettings(); // 設定を保存
          this.refresh();
        });
      }

      // 発言者フィルターのイベントリスナー
      const speakerSelect = document.getElementById('cw-threader-speaker-filter');
      if (speakerSelect) {
        speakerSelect.addEventListener('change', () => {
          this.selectedSpeaker = speakerSelect.value;
          this.saveRoomSettings(); // 設定を保存
          this.renderThreads();
        });
      }

      // 検索機能のイベントリスナー
      const searchInput = document.getElementById('cw-threader-search');
      const searchClear = document.getElementById('cw-threader-search-clear');
      if (searchInput) {
        // 入力時にリアルタイム検索
        let searchTimeout = null;
        searchInput.addEventListener('input', () => {
          // デバウンス処理（200ms後に検索実行）
          if (searchTimeout) {
            clearTimeout(searchTimeout);
          }
          searchTimeout = setTimeout(() => {
            this.searchQuery = searchInput.value.trim();
            this.applySearchFilter();
          }, 200);
        });

        // Enterキーで即座に検索
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (searchTimeout) {
              clearTimeout(searchTimeout);
            }
            this.searchQuery = searchInput.value.trim();
            this.applySearchFilter();
          }
          // Escapeキーでクリア
          if (e.key === 'Escape') {
            searchInput.value = '';
            this.searchQuery = '';
            this.applySearchFilter();
          }
        });
      }

      // 検索クリアボタン
      if (searchClear) {
        searchClear.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
          }
          this.searchQuery = '';
          this.applySearchFilter();
        });
      }

      // 検索ナビゲーションボタン
      const searchPrev = document.getElementById('cw-threader-search-prev');
      const searchNext = document.getElementById('cw-threader-search-next');
      
      if (searchPrev) {
        searchPrev.addEventListener('click', () => {
          this.navigateSearchResult(-1);
        });
      }
      
      if (searchNext) {
        searchNext.addEventListener('click', () => {
          this.navigateSearchResult(1);
        });
      }

      // タブ切り替えのイベントリスナー
      this.setupTabListeners();

      // テーマ・言語設定のイベントリスナー
      this.setupSettingsListeners();

      // 初期翻訳を適用
      applyContentTranslations();
    }

    /**
     * タブ切り替えのイベントリスナーを設定
     */
    setupTabListeners() {
      const tabs = this.panel.querySelectorAll('.cw-threader-tab-icon');
      const tabContents = this.panel.querySelectorAll('.cw-threader-tab-content');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetTab = tab.getAttribute('data-tab');

          // タブのアクティブ状態を切り替え
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // コンテンツの表示/非表示を切り替え
          tabContents.forEach(content => {
            const contentTab = content.getAttribute('data-tab-content');
            content.style.display = contentTab === targetTab ? '' : 'none';
          });
        });
      });
    }

    /**
     * 設定タブのイベントリスナーを設定
     */
    setupSettingsListeners() {
      // Language select
      const languageSelect = document.getElementById('cw-threader-language-select');
      
      if (languageSelect) {
        // 現在の言語設定を反映
        languageSelect.value = currentSettings.language || 'en';

        languageSelect.addEventListener('change', async () => {
          const newLang = languageSelect.value;
          currentSettings.language = newLang;
          
          // 翻訳を適用
          applyContentTranslations();
          // スレッド再描画（動的テキストの翻訳のため）
          this.renderThreads();
          
          // 設定を保存
          if (isExtensionContextValid()) {
            try {
              await chrome.storage.sync.set({ [SETTINGS_KEY]: currentSettings });
            } catch (error) {
              console.error('[ChatWorkThreader] Failed to save language setting:', error);
            }
          }
        });
      }

      // Theme select
      const themeSelect = document.getElementById('cw-threader-theme-select');
      
      if (themeSelect) {
        // 現在のテーマ設定を反映
        themeSelect.value = currentSettings.theme || 'system';

        themeSelect.addEventListener('change', async () => {
          const newTheme = themeSelect.value;
          currentSettings.theme = newTheme;
          
          // テーマを適用
          applyTheme(newTheme);
          
          // 設定を保存
          if (isExtensionContextValid()) {
            try {
              await chrome.storage.sync.set({ [SETTINGS_KEY]: currentSettings });
            } catch (error) {
              console.error('[ChatWorkThreader] Failed to save theme setting:', error);
            }
          }
        });
      }
    }

    /**
     * リサイズハンドルを設定
     */
    setupResizeHandle() {
      const handle = this.panel.querySelector('.cw-threader-resize-handle');
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = this.panel.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const diff = startX - e.clientX;
        const maxWidth = window.innerWidth * 0.9; // 画面幅の90%まで
        const newWidth = Math.min(Math.max(startWidth + diff, 550), maxWidth);
        this.panel.style.width = newWidth + 'px';
        // リサイズ中もChatWorkメインコンテンツの幅を調整
        if (this.isVisible) {
          this.adjustChatworkMainContent(newWidth);
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    /**
     * スレッド内の全発言者を収集
     * @param {Object} node - スレッドノード
     * @param {Set} speakers - 発言者セット
     */
    collectSpeakersInThread(node, speakers) {
      if (node.userName) {
        speakers.add(node.userName);
      }
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          this.collectSpeakersInThread(child, speakers);
        }
      }
    }

    /**
     * 全スレッドから発言者リストを取得
     * @returns {string[]} 発言者名の配列（ソート済み）
     */
    getAllSpeakers() {
      const speakers = new Set();
      const threads = this.threadBuilder.threads;
      
      threads.forEach(thread => {
        this.collectSpeakersInThread(thread, speakers);
      });
      
      return Array.from(speakers).sort((a, b) => a.localeCompare(b, 'ja'));
    }

    /**
     * 発言者プルダウンを更新
     */
    updateSpeakerDropdown() {
      const speakerSelect = document.getElementById('cw-threader-speaker-filter');
      if (!speakerSelect) return;

      const currentValue = this.selectedSpeaker;
      const speakers = this.getAllSpeakers();

      // 保存された発言者がリストに存在しない場合はリセット
      if (currentValue && !speakers.includes(currentValue)) {
        this.selectedSpeaker = '';
      }

      // オプションを再構築
      speakerSelect.innerHTML = `<option value="" data-ct-i18n="filter_all">${t('filter_all')}</option>`;
      speakers.forEach(speaker => {
        const option = document.createElement('option');
        option.value = speaker;
        option.textContent = speaker;
        if (speaker === this.selectedSpeaker) {
          option.selected = true;
        }
        speakerSelect.appendChild(option);
      });
    }

    /**
     * スレッド内に指定の発言者がいるかチェック
     * @param {Object} node - スレッドノード
     * @param {string} speaker - 発言者名
     * @returns {boolean}
     */
    isSpeakerInThread(node, speaker) {
      if (node.userName === speaker) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (this.isSpeakerInThread(child, speaker)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * 検索クエリにマッチするかチェック（メッセージ単体）
     * @param {Object} node - メッセージノード
     * @param {string} query - 検索クエリ（小文字）
     * @returns {boolean}
     */
    isMessageMatchingSearch(node, query) {
      if (!query) return true;
      
      const searchTarget = [
        node.messageText || '',
        node.userName || '',
        node.quotedMessage || '',
        (node.toTargets || []).map(t => typeof t === 'string' ? t : t.name).join(' ')
      ].join(' ').toLowerCase();
      
      return searchTarget.includes(query);
    }

    /**
     * スレッド内に検索クエリにマッチするメッセージがあるかチェック（再帰）
     * @param {Object} node - スレッドノード
     * @param {string} query - 検索クエリ（小文字）
     * @returns {boolean}
     */
    isSearchMatchInThread(node, query) {
      if (!query) return true;
      
      if (this.isMessageMatchingSearch(node, query)) {
        return true;
      }
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (this.isSearchMatchInThread(child, query)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * スレッド内のマッチするメッセージ数をカウント（再帰）
     * @param {Object} node - スレッドノード
     * @param {string} query - 検索クエリ（小文字）
     * @returns {number}
     */
    countSearchMatchesInThread(node, query) {
      if (!query) return 0;
      
      let count = this.isMessageMatchingSearch(node, query) ? 1 : 0;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          count += this.countSearchMatchesInThread(child, query);
        }
      }
      return count;
    }

    /**
     * 全スレッドからマッチ数を集計
     * @param {string} query - 検索クエリ（小文字）
     * @returns {Object} { matchedThreads: number, matchedMessages: number }
     */
    countAllSearchMatches(query) {
      if (!query) return { matchedThreads: 0, matchedMessages: 0 };
      
      const threads = this.threadBuilder.threads;
      let matchedThreads = 0;
      let matchedMessages = 0;
      
      threads.forEach(thread => {
        const threadMatchCount = this.countSearchMatchesInThread(thread, query);
        if (threadMatchCount > 0) {
          matchedThreads++;
          matchedMessages += threadMatchCount;
        }
      });
      
      return { matchedThreads, matchedMessages };
    }

    /**
     * 検索フィルターを適用（DOM操作による表示/非表示切り替え）
     */
    applySearchFilter() {
      const query = this.searchQuery.toLowerCase();
      const countEl = document.getElementById('cw-threader-search-count');
      const clearBtn = document.getElementById('cw-threader-search-clear');
      
      // クリアボタンの表示/非表示
      if (clearBtn) {
        clearBtn.style.display = query ? 'flex' : 'none';
      }
      
      // 検索マッチリストと現在インデックスをリセット
      this.searchMatches = [];
      this.currentSearchIndex = -1;
      
      // 現在フォーカスのクラスを削除
      const currentFocused = this.panel.querySelector('.cw-threader-search-current');
      if (currentFocused) {
        currentFocused.classList.remove('cw-threader-search-current');
      }
      
      // ナビゲーションボタンの参照
      const prevBtn = document.getElementById('cw-threader-search-prev');
      const nextBtn = document.getElementById('cw-threader-search-next');
      
      // 検索クエリが空の場合はすべて表示
      if (!query) {
        if (countEl) countEl.textContent = '';
        // ナビゲーションボタンを無効化
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        // 全スレッドを通常表示に戻す
        const threads = this.panel.querySelectorAll('.cw-threader-thread');
        threads.forEach(thread => {
          thread.classList.remove('cw-threader-no-match');
          // 検索ハイライトをクリア
          const highlights = thread.querySelectorAll('.cw-threader-search-highlight');
          highlights.forEach(hl => {
            const text = document.createTextNode(hl.textContent);
            hl.parentNode.replaceChild(text, hl);
          });
          // マッチクラスを削除
          const matchedMessages = thread.querySelectorAll('.cw-threader-search-match');
          matchedMessages.forEach(msg => msg.classList.remove('cw-threader-search-match'));
        });
        return;
      }
      
      // DOMに検索結果を反映
      const threadElements = this.panel.querySelectorAll('.cw-threader-thread');
      
      threadElements.forEach((threadEl) => {
        // スレッド内の全メッセージ要素を取得
        const messageEls = threadEl.querySelectorAll('[data-thread-mid]');
        let threadHasMatch = false;
        
        messageEls.forEach(messageEl => {
          const mid = messageEl.getAttribute('data-thread-mid');
          const messageData = this.threadBuilder.messages.get(mid);
          
          if (messageData) {
            const isMatch = this.isMessageMatchingSearch(messageData, query);
            if (isMatch) {
              threadHasMatch = true;
              messageEl.classList.add('cw-threader-search-match');
              // テキストハイライト
              this.highlightTextInElement(messageEl.querySelector('.cw-threader-message-body'), query);
              this.highlightTextInElement(messageEl.querySelector('.cw-threader-username'), query);
              this.highlightTextInElement(messageEl.querySelector('.cw-threader-quote'), query);
              this.highlightTextInElement(messageEl.querySelector('.cw-threader-to-targets'), query);
            } else {
              messageEl.classList.remove('cw-threader-search-match');
            }
          }
        });
        
        // スレッド全体のハイライト
        if (threadHasMatch) {
          threadEl.classList.remove('cw-threader-no-match');
        } else {
          threadEl.classList.add('cw-threader-no-match');
        }
      });
      
      // 検索マッチしたメッセージ要素を収集（DOM順）
      this.searchMatches = Array.from(this.panel.querySelectorAll('.cw-threader-search-match'));
      
      // カウント表示
      const matchCount = this.searchMatches.length;
      if (countEl) {
        if (matchCount > 0) {
          countEl.textContent = `${matchCount}${t('matches_suffix')}`;
        } else {
          countEl.textContent = t('no_matches');
        }
      }
      
      // ナビゲーションボタンの有効/無効
      if (prevBtn) prevBtn.disabled = matchCount === 0;
      if (nextBtn) nextBtn.disabled = matchCount === 0;
      
      // 最初の結果に自動で移動
      if (matchCount > 0) {
        this.navigateSearchResult(0, true);
      }
    }

    /**
     * 検索結果をナビゲート
     * @param {number} direction - 移動方向（-1: 前, 1: 次, 0: 現在位置を設定）
     * @param {boolean} isInitial - 初回呼び出しかどうか
     */
    navigateSearchResult(direction, isInitial = false) {
      if (this.searchMatches.length === 0) return;
      
      // 現在フォーカスのクラスを削除
      if (this.currentSearchIndex >= 0 && this.currentSearchIndex < this.searchMatches.length) {
        this.searchMatches[this.currentSearchIndex].classList.remove('cw-threader-search-current');
      }
      
      // 新しいインデックスを計算
      if (isInitial) {
        this.currentSearchIndex = 0;
      } else {
        this.currentSearchIndex += direction;
        // 循環
        if (this.currentSearchIndex >= this.searchMatches.length) {
          this.currentSearchIndex = 0;
        } else if (this.currentSearchIndex < 0) {
          this.currentSearchIndex = this.searchMatches.length - 1;
        }
      }
      
      // 現在の要素にフォーカスクラスを追加
      const currentEl = this.searchMatches[this.currentSearchIndex];
      if (currentEl) {
        currentEl.classList.add('cw-threader-search-current');
        // スクロールして表示
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // カウント表示を更新（現在位置/全件）
      const countEl = document.getElementById('cw-threader-search-count');
      if (countEl && this.searchMatches.length > 0) {
        countEl.textContent = `${this.currentSearchIndex + 1}/${this.searchMatches.length}`;
      }
    }

    /**
     * ノードに検索ハイライトを適用（再帰）
     * @param {Element} containerEl - DOM要素
     * @param {Object} node - メッセージノード
     * @param {string} query - 検索クエリ（小文字）
     */
    applySearchHighlightToNode(containerEl, node, query) {
      // このノードに対応するメッセージ要素を探す
      const messageEl = containerEl.querySelector(`[data-thread-mid="${node.mid}"]`);
      
      if (messageEl) {
        const isMatch = this.isMessageMatchingSearch(node, query);
        if (isMatch) {
          messageEl.classList.add('cw-threader-search-match');
          // テキストハイライト（メッセージ本文のみ）
          this.highlightTextInElement(messageEl.querySelector('.cw-threader-message-body'), query);
          this.highlightTextInElement(messageEl.querySelector('.cw-threader-username'), query);
          this.highlightTextInElement(messageEl.querySelector('.cw-threader-quote'), query);
          this.highlightTextInElement(messageEl.querySelector('.cw-threader-to-targets'), query);
        } else {
          messageEl.classList.remove('cw-threader-search-match');
        }
      }
      
      // 子ノードを再帰処理
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          this.applySearchHighlightToNode(containerEl, child, query);
        });
      }
    }

    /**
     * 要素内のテキストをハイライト
     * @param {Element} el - DOM要素
     * @param {string} query - 検索クエリ（小文字）
     */
    highlightTextInElement(el, query) {
      if (!el || !query) return;
      
      // 既存のハイライトをクリア
      const existingHighlights = el.querySelectorAll('.cw-threader-search-highlight');
      existingHighlights.forEach(hl => {
        const text = document.createTextNode(hl.textContent);
        hl.parentNode.replaceChild(text, hl);
      });
      
      // テキストノードを走査してハイライト
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        const lowerText = text.toLowerCase();
        const index = lowerText.indexOf(query);
        
        if (index >= 0) {
          const before = text.substring(0, index);
          const match = text.substring(index, index + query.length);
          const after = text.substring(index + query.length);
          
          const fragment = document.createDocumentFragment();
          if (before) {
            fragment.appendChild(document.createTextNode(before));
          }
          const span = document.createElement('span');
          span.className = 'cw-threader-search-highlight';
          span.textContent = match;
          fragment.appendChild(span);
          if (after) {
            fragment.appendChild(document.createTextNode(after));
          }
          
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      });
    }

    /**
     * メッセージを表示（YouTube/Redditコメント欄風）
     * 返信関係のあるスレッドのみ表示
     */
    renderThreads() {
      const container = this.panel.querySelector('.cw-threader-threads');
      container.innerHTML = '';

      // スレッド（返信関係があるもの）のみ表示
      const threads = this.threadBuilder.threads;

      if (threads.size === 0) {
        this.updateSpeakerDropdown();
        container.innerHTML = `<div class="cw-threader-empty">${t('no_threads')}</div>`;
        return;
      }

      // 発言者プルダウンを更新
      this.updateSpeakerDropdown();

      // ルートメッセージのタイムスタンプで新しい順にソート
      // ピン止めされたスレッドを優先的に上に表示
      // タイムスタンプがない場合はmid（メッセージID）でソート（midは時系列で割り当てられる）
      let sortedThreads = Array.from(threads.values())
        .sort((a, b) => {
          // まずピン止め状態で比較（ピン止めが優先）
          const aPinned = this.isThreadPinned(a.mid);
          const bPinned = this.isThreadPinned(b.mid);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          
          // ピン止め状態が同じ場合はタイムスタンプで比較
          const aTime = parseInt(a.timestamp) || 0;
          const bTime = parseInt(b.timestamp) || 0;
          
          // 両方タイムスタンプがある場合はタイムスタンプで比較
          if (aTime && bTime) {
            return bTime - aTime;
          }
          
          // タイムスタンプがない場合はmidで比較（新しい順）
          const aMid = parseInt(a.mid) || 0;
          const bMid = parseInt(b.mid) || 0;
          return bMid - aMid;
        });

      // フィルタリング：まず発言者フィルターで絞り込む
      if (this.selectedSpeaker) {
        sortedThreads = sortedThreads.filter(thread => this.isSpeakerInThread(thread, this.selectedSpeaker));
      }

      // フィルタリング：次に自分参加スレッドのみ表示する場合、さらに絞り込む
      // isToMe フラグ（緑色表示と同じロジック）を使って判定
      if (this.showOnlyMyThreads) {
        sortedThreads = sortedThreads.filter(thread => this.isUserInvolvedInThread(thread));
      }

      if (sortedThreads.length === 0) {
        container.innerHTML = `<div class="cw-threader-empty">${t('no_matching_threads')}</div>`;
        return;
      }

      sortedThreads.forEach(thread => {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'cw-threader-thread';
        
        // ピン止め状態をdata属性として設定
        const isPinned = this.isThreadPinned(thread.mid);
        messageWrapper.setAttribute('data-thread-root-mid', thread.mid);
        if (isPinned) {
          messageWrapper.classList.add('cw-threader-pinned');
        }
        
        // ピン止めボタンを追加（ルートスレッドの上部に配置）
        const pinBtn = document.createElement('button');
        pinBtn.className = 'cw-threader-pin-btn';
        if (isPinned) {
          pinBtn.classList.add('pinned');
        }
        pinBtn.setAttribute('data-pin-mid', thread.mid);
        pinBtn.title = isPinned ? t('unpin_thread') : t('pin_thread');
        pinBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 17V22M12 17L7 15L8 9L6 7V6H18V7L16 9L17 15L12 17Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        
        pinBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePinThread(thread.mid);
        });
        
        messageWrapper.appendChild(pinBtn);
        
        const threadEl = this.createThreadElement(thread, 0, []);
        messageWrapper.appendChild(threadEl);
        
        // ルートメッセージがプレースホルダーの場合、trackingボタンを追加
        if (thread.isPlaceholder) {
          const trackingBtn = document.createElement('button');
          trackingBtn.className = 'cw-threader-tracking-btn';
          trackingBtn.setAttribute('data-tracking-mid', thread.mid);
          trackingBtn.title = t('track_origin');
          trackingBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 12L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M20 12L22 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M12 4V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M12 22V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>`;
          
          trackingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.trackOriginMessage(thread.mid, trackingBtn);
          });
          
          messageWrapper.appendChild(trackingBtn);
        }
        
        container.appendChild(messageWrapper);
      });

      // 検索フィルターを適用（検索クエリがある場合）
      if (this.searchQuery) {
        this.applySearchFilter();
      }

      // トラッキング中の場合、ボタンのアクティブ状態を復元し、スレッドを表示し続ける
      if (this.trackingMid) {
        const trackingBtn = this.panel.querySelector(`[data-tracking-mid="${this.trackingMid}"]`);
        if (trackingBtn) {
          trackingBtn.classList.add('cw-threader-tracking-active');
        }
        // トラッキング中のスレッドが見えるように自動スクロール（ハイライトなし）
        this.keepTrackingThreadVisible(this.trackingMid);
      }
    }

    /**
     * スレッド内に自分が関わっているか判定
     * 「返信元」または「返信先」に自分がいるスレッドを検出する
     * 
     * - isToMe: 自分宛てのメッセージ（緑色表示と同じロジック）= 自分が「返信先」
     * - isFromMe: 自分が送信したメッセージ = 自分が「返信元」または「返信者」
     * 
     * @param {Object} node - スレッドノード
     * @returns {boolean} 自分が関わっている場合true
     */
    isUserInvolvedInThread(node) {
      // messageDataから情報を取得
      const messageData = this.threadBuilder.messages.get(node.mid);
      
      // このメッセージが自分宛て (isToMe) なら参加している
      // これは緑色表示と同じロジック = 自分が「返信先」
      if (messageData && messageData.isToMe) {
        return true;
      }
      
      // ノード自体の isToMe フラグもチェック
      if (node.isToMe) {
        return true;
      }
      
      // 自分が送信したメッセージ (isFromMe) なら参加している
      // = 自分が「返信元」または「返信者」
      if (messageData && messageData.isFromMe) {
        return true;
      }
      
      // ノード自体の isFromMe フラグもチェック
      if (node.isFromMe) {
        return true;
      }
      
      // 子ノードを再帰的にチェック
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (this.isUserInvolvedInThread(child)) {
            return true;
          }
        }
      }
      
      return false;
    }

    /**
     * 返信数をカウント（再帰）
     */
    countReplies(node) {
      let count = 0;
      if (node.children) {
        count = node.children.length;
        node.children.forEach(child => {
          count += this.countReplies(child);
        });
      }
      return count;
    }

    /**
     * 全ての子孫メッセージを収集（フラット表示用）
     * タイムスタンプ順でソート
     * @param {Object} node - メッセージノード
     * @returns {Object[]} 子孫メッセージの配列
     */
    collectAllDescendants(node) {
      const descendants = [];
      const collectRecursive = (n) => {
        if (n.children && n.children.length > 0) {
          n.children.forEach(child => {
            descendants.push(child);
            collectRecursive(child);
          });
        }
      };
      collectRecursive(node);
      // タイムスタンプでソート（古い順）
      descendants.sort((a, b) => {
        const aTime = parseInt(a.timestamp) || 0;
        const bTime = parseInt(b.timestamp) || 0;
        return aTime - bTime;
      });
      return descendants;
    }

    /**
     * スレッド要素を作成（Reddit/YouTube風）
     * @param {Object} node - メッセージノード
     * @param {number} depth - ネストの深さ
     * @param {boolean[]} ancestorHasMore - 各祖先レベルで後続の兄弟があるかどうか
     */
    createThreadElement(node, depth, ancestorHasMore) {
      const container = document.createElement('div');
      container.className = 'cw-threader-thread-item';
      
      const messageType = this.threadBuilder.getMessageType(node.mid);
      const typeLabel = this.getTypeLabel(messageType);
      const replyCount = this.countReplies(node);
      const isRootWithReplies = depth === 0 && replyCount > 0;

      // メッセージ行のラッパー（祖先線 + L字線 + メッセージ本体）
      const messageRow = document.createElement('div');
      messageRow.className = 'cw-threader-message-row';

      // 祖先の縦線を描画（depth > 0 の場合）
      if (depth > 0) {
        // ancestorHasMore の最後の要素は「自分に後続の兄弟がいるか」
        // それ以外は祖先レベルの情報
        const ancestorCount = ancestorHasMore.length - 1;
        
        // 祖先線コンテナを作成（L字接続線も含める）
        const ancestorLinesContainer = document.createElement('div');
        ancestorLinesContainer.className = 'cw-threader-ancestor-lines';
        
        // フラットモードの場合は祖先線を表示しない（1階層分のみ）
        if (!this.flatIndentMode) {
          // 祖先線を追加（通常モード）
          for (let i = 0; i < ancestorCount; i++) {
            const lineEl = document.createElement('div');
            lineEl.className = 'cw-threader-ancestor-line';
            if (ancestorHasMore[i]) {
              lineEl.classList.add('has-more');
            }
            ancestorLinesContainer.appendChild(lineEl);
          }
        }
        
        // L字接続線を祖先線コンテナ内に配置（親アバターの中心から伸ばすため）
        const connectLine = document.createElement('div');
        connectLine.className = 'cw-threader-connect-line';
        // 後続の兄弟がある場合は縦線を下まで伸ばす
        // フラットモードの場合は常に最後の要素を使用
        const hasMoreSiblings = this.flatIndentMode 
          ? ancestorHasMore[ancestorHasMore.length - 1]
          : ancestorHasMore[ancestorHasMore.length - 1];
        if (hasMoreSiblings) {
          connectLine.classList.add('has-more');
        }
        ancestorLinesContainer.appendChild(connectLine);
        
        messageRow.appendChild(ancestorLinesContainer);
      }

      const messageEl = document.createElement('div');
      messageEl.className = 'cw-threader-message';
      // メッセージIDを属性として追加（スレッドで表示ボタンからの検索用）
      messageEl.setAttribute('data-thread-mid', node.mid);
      if (node.isPlaceholder) {
        messageEl.classList.add('cw-threader-placeholder');
      }
      // 自分宛てメッセージの場合、緑色背景クラスを追加
      if (node.isToMe) {
        // console.log(`[ChatWorkThreader] スレッド表示: 自分宛てメッセージにクラス追加 MID=${node.mid}`);
        messageEl.classList.add('cw-threader-mention');
      }
      
      // メッセージ本文をセグメント順序で構築
      // messageSegmentsがある場合はセグメント順序で表示、ない場合は後方互換性のため旧形式
      let messageContentHtml = '';
      let hasInlineToRe = false; // セグメント内にTo/Reがあるか
      if (node.messageSegments && node.messageSegments.length > 0) {
        // セグメント順序でHTMLを生成
        let quoteIndex = 0;
        // 最初のテキストセグメントのインデックスを見つける（外部リンク等の適用先）
        const firstTextIdx = node.messageSegments.findIndex(s => s.type === 'text');
        
        // 非引用セグメントをバッファに蓄積し、引用またはセグメント末で1つのdivにまとめる
        // これにより、To/Reタグが不要な改行を生まない
        const segments = node.messageSegments;
        let i = 0;
        let bodyBuffer = ''; // 非引用セグメントのHTMLバッファ
        
        const flushBodyBuffer = () => {
          if (bodyBuffer) {
            // バッファ全体の先頭・末尾の<br>を除去
            let cleaned = bodyBuffer.replace(/^(<br\s*\/?>[\s]*)+/i, '').replace(/(<br\s*\/?>[\s]*)+$/i, '');
            if (cleaned) {
              messageContentHtml += `<div class="cw-threader-message-body">${cleaned}</div>`;
            }
            bodyBuffer = '';
          }
        };
        
        while (i < segments.length) {
          const segment = segments[i];
          
          if (segment.type === 'quote') {
            // 引用の前にバッファをフラッシュ
            flushBodyBuffer();
            const quoteLinks = segment.externalLinks || [];
            messageContentHtml += this.formatQuoteWithPreviews(
              segment.content, 
              node.mid, 
              quoteLinks, 
              segment.author
            );
            quoteIndex++;
            i++;
          } else if (segment.type === 'text') {
            // テキストはバッファに追加（インラインで連続する）
            if (segment.content && segment.content.trim()) {
              const textHtml = this.formatMessageTextWithPreviews(
                segment.content,
                node.mid,
                i === firstTextIdx ? (node.externalLinks || []) : [],
                i === firstTextIdx ? (node.filePreviewInfo || []) : []
              );
              bodyBuffer += textHtml;
            }
            i++;
          } else if (segment.type === 'reply') {
            hasInlineToRe = true;
            const rpName = node.parentUserName || '';
            const rpAvatarUrl = segment.avatarUrl || node.parentAvatarUrl || '';
            let avatarHtml = rpAvatarUrl
              ? `<img src="${this.escapeHtml(rpAvatarUrl)}" class="cw-threader-to-avatar" alt="">`
              : '<span class="cw-threader-to-default-avatar"></span>';
            bodyBuffer += `<span class="cw-threader-to-targets cw-threader-to-inline"><span class="cw-threader-to-label cw-threader-re-label">Re:</span><span class="cw-threader-to-tag cw-threader-re-tag">${avatarHtml}<span class="cw-threader-to-name">${this.escapeHtml(rpName)}</span></span></span>`;
            i++;
          } else if (segment.type === 'to') {
            // 連続するtoセグメントを1つにまとめる
            hasInlineToRe = true;
            const mergedTargets = [...(segment.targets || [])];
            let j = i + 1;
            while (j < segments.length && segments[j].type === 'to') {
              mergedTargets.push(...(segments[j].targets || []));
              j++;
            }
            bodyBuffer += this.formatToTargetsHtmlInline(mergedTargets);
            i = j;
          } else {
            i++;
          }
        }
        // 残りのバッファをフラッシュ
        flushBodyBuffer();
      } else {
        // 後方互換性: messageSegmentsがない場合は旧形式で表示
        const quotedHtml = node.quotedMessage 
          ? this.formatQuoteWithPreviews(node.quotedMessage, node.mid, node.quoteExternalLinks || [], node.quoteAuthor)
          : '';
        
        const messageBodyHtml = this.formatMessageTextWithPreviews(
          node.messageText,
          node.mid,
          node.externalLinks || [],
          node.filePreviewInfo || []
        );
        
        messageContentHtml = quotedHtml + `<div class="cw-threader-message-body">${messageBodyHtml}</div>`;
      }
      
      messageEl.innerHTML = `
        <div class="cw-threader-avatar-wrap">
          ${node.avatarUrl 
            ? `<img src="${node.avatarUrl}" class="cw-threader-avatar" alt="">` 
            : `<div class="cw-threader-avatar"></div>`}
        </div>
        <div class="cw-threader-msg-content">
          <div class="cw-threader-message-header">
            <span class="cw-threader-username">${this.escapeHtml(node.userName)}</span>
            ${node.timestamp ? `<span class="cw-threader-time">· ${this.formatDateTime(node.timestamp)}</span>` : ''}
            ${isRootWithReplies ? `
              <div class="cw-threader-toggle-wrap">
                <span class="cw-threader-reply-label">${replyCount}${t('reply_count_suffix')}</span>
                <button class="cw-threader-thread-toggle-btn active" data-open="true">
                  ${this.minimizeIconUrl ? `<img src="${this.minimizeIconUrl}" class="cw-threader-toggle-icon-img" alt="collapse">` : '▼'}
                </button>
              </div>
            ` : ''}
          </div>
          ${hasInlineToRe ? '' : this.formatReplyAndToTargetsHtml(node)}
          ${messageContentHtml}
        </div>
        <button class="cw-threader-copy-btn" title="${t('copy_message')}" data-message-text="${this.escapeHtml(node.messageText || '')}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      `;

      // ファイルプレビューボタンのクリックイベントを設定
      const previewButtons = messageEl.querySelectorAll('.cw-threader-preview-btn');
      previewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const fileId = btn.getAttribute('data-file-id');
          const mid = btn.getAttribute('data-mid');
          this.triggerOriginalPreview(mid, fileId);
        });
      });

      // 外部リンクボタンのクリックイベントを設定（引用内ボタンも含む）
      const externalLinkButtons = messageEl.querySelectorAll('.cw-threader-external-link-btn');
      externalLinkButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = btn.getAttribute('data-url');
          const mid = btn.getAttribute('data-mid');
          const linkIndex = parseInt(btn.getAttribute('data-link-index'), 10);
          const isInQuote = btn.getAttribute('data-in-quote') === 'true';
          this.triggerExternalLinkPreview(mid, url, linkIndex, isInQuote);
        });
      });

      // コピーボタンのクリックイベントを設定
      const copyBtn = messageEl.querySelector('.cw-threader-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const messageText = copyBtn.getAttribute('data-message-text');
          this.copyMessageToClipboard(messageText, copyBtn);
        });
      }

      // クリックでメッセージにスクロール（プレースホルダーの場合は無効）
      if (!node.isPlaceholder) {
        messageEl.addEventListener('click', (e) => {
          // トグルスイッチをクリックした場合はスクロールしない
          if (e.target.closest('.cw-threader-toggle-wrap')) {
            return;
          }
          // プレビューボタンをクリックした場合はスクロールしない
          if (e.target.closest('.cw-threader-preview-btn') || e.target.closest('.cw-threader-external-link-btn')) {
            return;
          }
          // コピーボタンをクリックした場合はスクロールしない
          if (e.target.closest('.cw-threader-copy-btn')) {
            return;
          }
          e.stopPropagation();
          this.scrollToMessage(node.mid);
        });
      }

      messageRow.appendChild(messageEl);
      container.appendChild(messageRow);

      // 子メッセージを追加
      if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'cw-threader-children';
        
        if (this.flatIndentMode && depth === 0) {
          // フラットモードでルートの場合、全ての子孫を1階層として表示
          const allDescendants = this.collectAllDescendants(node);
          allDescendants.forEach((child, index) => {
            const isLastChild = index === allDescendants.length - 1;
            // フラットモードではすべて depth = 1 として扱う
            const newAncestorHasMore = [!isLastChild];
            const childEl = this.createThreadElement(child, 1, newAncestorHasMore);
            childrenContainer.appendChild(childEl);
          });
        } else if (!this.flatIndentMode) {
          // 通常モード
          node.children.forEach((child, index) => {
            const isLastChild = index === node.children.length - 1;
            // 現在の子に後続の兄弟があるかどうかを祖先情報に追加
            const newAncestorHasMore = [...ancestorHasMore, !isLastChild];
            const childEl = this.createThreadElement(child, depth + 1, newAncestorHasMore);
            childrenContainer.appendChild(childEl);
          });
        }
        // フラットモードで depth > 0 の場合は子を追加しない（既にルートで展開済み）
        
        container.appendChild(childrenContainer);

        // ルートメッセージの場合、トグルボタンのイベントを設定
        if (isRootWithReplies) {
          const toggleBtn = messageEl.querySelector('.cw-threader-thread-toggle-btn');
          if (toggleBtn) {
            const mid = node.mid;

            // 保存された状態を同期的に復元（事前にloadToggleStatesで読み込み済み）
            const isOpen = this.getToggleState(mid);
            this.updateToggleBtnState(toggleBtn, isOpen);
            childrenContainer.style.display = isOpen ? '' : 'none';

            toggleBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const currentOpen = toggleBtn.getAttribute('data-open') === 'true';
              const newOpen = !currentOpen;
              this.updateToggleBtnState(toggleBtn, newOpen);
              childrenContainer.style.display = newOpen ? '' : 'none';
              // 状態をストレージに保存
              this.saveToggleState(mid, newOpen);
            });
          }
        }
      }

      return container;
    }

    /**
     * スレッド開閉ボタンの状態を更新
     */
    updateToggleBtnState(btn, isOpen) {
      btn.setAttribute('data-open', isOpen ? 'true' : 'false');
      btn.classList.toggle('active', isOpen);
      const img = btn.querySelector('img');
      if (img) {
        img.src = isOpen ? (this.minimizeIconUrl || '') : (this.maximizeIconUrl || '');
        img.alt = isOpen ? 'collapse' : 'expand';
      } else {
        btn.textContent = isOpen ? '▼' : '▶';
      }
    }

    /**
     * メッセージタイプのラベルを取得
     */
    getTypeLabel(type) {
      // ラベル表示は無効化
      return '';
    }

    /**
     * メッセージタイプのCSSクラスを取得
     */
    getTypeClass(type) {
      switch (type) {
        case 2: return 'type-root';
        case 3: return 'type-reply';
        case 4: return 'type-both';
        default: return '';
      }
    }

    /**
     * タイムスタンプを「yyyy/MM/dd hh:mm」形式にフォーマット
     */
    formatDateTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(parseInt(timestamp) * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * 引用テキストをフォーマット（プレビューボタン付き、発言者情報表示）
     * @param {string} text - 引用テキスト
     * @param {string} mid - メッセージID
     * @param {Array} quoteExternalLinks - 引用内の外部リンク情報配列
     * @param {Object} quoteAuthor - 引用元発言者情報 { name, avatarUrl, timestamp }
     * @returns {string} フォーマットされたHTML
     */
    formatQuoteWithPreviews(text, mid, quoteExternalLinks = [], quoteAuthor = null) {
      // 「プレビュー」という文言を除去
      let cleanedText = text.replace(/プレビュー/g, '');
      // 連続した空白行を1つに
      cleanedText = cleanedText.replace(/(\r\n|\r|\n){3,}/g, '\n\n');
      
      // URLとそれ以外のテキストを分割しながら処理
      const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = urlPattern.exec(cleanedText)) !== null) {
        // URLより前のテキスト
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: cleanedText.substring(lastIndex, match.index)
          });
        }
        // URL部分
        parts.push({
          type: 'url',
          content: match[1]
        });
        lastIndex = urlPattern.lastIndex;
      }
      
      // 最後のテキスト部分
      if (lastIndex < cleanedText.length) {
        parts.push({
          type: 'text',
          content: cleanedText.substring(lastIndex)
        });
      }
      
      // 外部リンクのURLマップを作成
      const externalLinkMap = new Map();
      quoteExternalLinks.forEach((link, index) => {
        if (!externalLinkMap.has(link.url)) {
          externalLinkMap.set(link.url, index);
        }
      });
      
      // 引用元発言者ヘッダーを構築
      let authorHtml = '';
      if (quoteAuthor && quoteAuthor.name) {
        const avatarHtml = quoteAuthor.avatarUrl 
          ? `<img src="${this.escapeHtml(quoteAuthor.avatarUrl)}" class="cw-threader-quote-avatar" alt="">` 
          : '';
        const timestampHtml = quoteAuthor.timestamp 
          ? `<span class="cw-threader-quote-timestamp">${this.escapeHtml(quoteAuthor.timestamp)}</span>` 
          : '';
        authorHtml = `<div class="cw-threader-quote-header">
          ${avatarHtml}
          <span class="cw-threader-quote-author">${this.escapeHtml(quoteAuthor.name)}</span>
          ${timestampHtml}
        </div>`;
      }
      // HTMLを構築
      let contentHtml = '';
      parts.forEach(part => {
        if (part.type === 'text') {
          // テキスト部分はエスケープして改行を<br>に変換
          let escaped = this.escapeHtml(part.content);
          contentHtml += escaped.replace(/\r\n|\r|\n/g, '<br>');
        } else if (part.type === 'url') {
          const url = part.content;
          const escapedUrl = this.escapeHtml(url);
          
          // URLをリンクとして追加
          contentHtml += `<a href="${escapedUrl}" class="cw-threader-link" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;
          
          // 外部リンクプレビューボタンを追加
          const linkIndex = externalLinkMap.get(url);
          if (linkIndex !== undefined) {
            const linkInfo = quoteExternalLinks[linkIndex];
            if (linkInfo && linkInfo.hasPreviewButton) {
              contentHtml += `<a class="cw-threader-external-link-btn cw-threader-inline-preview cw-threader-quote-preview-btn" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}" data-in-quote="true">${t('preview_btn')}</a>`;
            }
            // このリンクは処理済みとしてマーク
            externalLinkMap.delete(url);
          }
        }
      });
      
      // 本文中に出現しなかった外部リンク（プレビューボタンがあるもの）を末尾に追加
      externalLinkMap.forEach((linkIndex, url) => {
        const link = quoteExternalLinks[linkIndex];
        if (link && link.hasPreviewButton) {
          const escapedUrl = this.escapeHtml(url);
          const title = this.escapeHtml(link.title || url);
          contentHtml += `<div class="cw-threader-external-link-item">
            <a href="${escapedUrl}" class="cw-threader-link" target="_blank" rel="noopener noreferrer">🔗 ${title}</a>
            <a class="cw-threader-external-link-btn cw-threader-inline-preview cw-threader-quote-preview-btn" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}" data-in-quote="true">${t('preview_btn')}</a>
          </div>`;
        }
      });
      
      return `<div class="cw-threader-quote">${authorHtml}<div class="cw-threader-quote-body"><span class="cw-threader-quote-icon">❝</span>${contentHtml}</div></div>`;
    }

    /**
     * To先ユーザーをアバター付きでフォーマット
     * @param {Array} toTargets - To先ユーザー配列 [{ name, avatarUrl, aid }] or string[]
     * @returns {string} HTML文字列
     */
    formatToTargetsHtml(toTargets) {
      if (!toTargets || toTargets.length === 0) return '';
      
      const tagsHtml = toTargets.map(target => {
        // 後方互換性: 文字列の場合はオブジェクトに変換
        const name = typeof target === 'string' ? target : (target.name || '');
        const avatarUrl = typeof target === 'string' ? '' : (target.avatarUrl || '');
        
        if (!name) return '';
        
        let avatarHtml = '';
        if (name === 'ALL') {
          // ALL の場合はアイコンなしで特別表示
          avatarHtml = '<span class="cw-threader-to-all-icon">👥</span>';
        } else if (avatarUrl) {
          avatarHtml = `<img src="${this.escapeHtml(avatarUrl)}" class="cw-threader-to-avatar" alt="">`;
        } else {
          // デフォルトアバター（アバターURLがない場合）
          avatarHtml = '<span class="cw-threader-to-default-avatar"></span>';
        }
        
        return `<span class="cw-threader-to-tag">${avatarHtml}<span class="cw-threader-to-name">${this.escapeHtml(name)}</span></span>`;
      }).filter(h => h).join('');
      
      if (!tagsHtml) return '';
      
      return `<div class="cw-threader-to-targets"><span class="cw-threader-to-label">To:</span>${tagsHtml}</div>`;
    }

    /**
     * To先ユーザーをインライン（span）でフォーマット（改行を生まない）
     * @param {Array} toTargets
     * @returns {string} HTML文字列
     */
    formatToTargetsHtmlInline(toTargets) {
      if (!toTargets || toTargets.length === 0) return '';
      
      const tagsHtml = toTargets.map(target => {
        const name = typeof target === 'string' ? target : (target.name || '');
        const avatarUrl = typeof target === 'string' ? '' : (target.avatarUrl || '');
        
        if (!name) return '';
        
        let avatarHtml = '';
        if (name === 'ALL') {
          avatarHtml = '<span class="cw-threader-to-all-icon">👥</span>';
        } else if (avatarUrl) {
          avatarHtml = `<img src="${this.escapeHtml(avatarUrl)}" class="cw-threader-to-avatar" alt="">`;
        } else {
          avatarHtml = '<span class="cw-threader-to-default-avatar"></span>';
        }
        
        return `<span class="cw-threader-to-tag">${avatarHtml}<span class="cw-threader-to-name">${this.escapeHtml(name)}</span></span>`;
      }).filter(h => h).join('');
      
      if (!tagsHtml) return '';
      
      return `<span class="cw-threader-to-targets cw-threader-to-inline"><span class="cw-threader-to-label">To:</span>${tagsHtml}</span>`;
    }

    /**
     * 返信先（Re:）とTo先ユーザーをまとめてアバター付きでフォーマット
     * @param {Object} node - メッセージノード
     * @returns {string} HTML文字列
     */
    formatReplyAndToTargetsHtml(node) {
      let html = '';
      
      // To先ユーザーのAIDリストを取得（Re:との重複チェック用）
      const toAids = new Set((node.toTargets || [])
        .filter(t => typeof t !== 'string' && t.aid)
        .map(t => t.aid));
      const toNames = new Set((node.toTargets || [])
        .map(t => typeof t === 'string' ? t : t.name)
        .filter(n => n));
      
      // 返信先（Re:）の表示（parentMidがある＝実際に返信タグがある場合のみ）
      // To先と重複する場合はRe:を表示しない（To:側で表示される）
      if (node.parentMid && (node.parentUserName || node.parentAid)) {
        const replyAid = node.parentAid;
        const replyName = node.parentUserName || '';
        const isDuplicateWithTo = (replyAid && toAids.has(replyAid)) || 
                                   (replyName && toNames.has(replyName));
        
        if (!isDuplicateWithTo) {
          const avatarUrl = node.parentAvatarUrl || '';
          
          let avatarHtml = '';
          if (avatarUrl) {
            avatarHtml = `<img src="${this.escapeHtml(avatarUrl)}" class="cw-threader-to-avatar" alt="">`;
          } else {
            avatarHtml = '<span class="cw-threader-to-default-avatar"></span>';
          }
          
          html += `<div class="cw-threader-to-targets"><span class="cw-threader-to-label cw-threader-re-label">Re:</span><span class="cw-threader-to-tag cw-threader-re-tag">${avatarHtml}<span class="cw-threader-to-name">${this.escapeHtml(replyName)}</span></span></div>`;
        }
      }
      
      // To先の表示
      html += this.formatToTargetsHtml(node.toTargets);
      
      return html;
    }

    /**
     * メッセージテキストをフォーマット（HTMLエスケープ + URL自動リンク + 改行をbrタグに変換 + プレビュー文言除去）
     */
    formatMessageText(text) {
      // 「プレビュー」という文言を除去（ボタンから挿入されたテキスト）
      let cleanedText = text.replace(/プレビュー/g, '');
      // 連続した空白行を1つに
      cleanedText = cleanedText.replace(/(\r\n|\r|\n){3,}/g, '\n\n');
      // まずHTMLエスケープ
      const escaped = this.escapeHtml(cleanedText);
      // URLを自動リンク化
      const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
      const withLinks = escaped.replace(urlPattern, '<a href="$1" class="cw-threader-link" target="_blank" rel="noopener noreferrer">$1</a>');
      // 改行コード（\r\n, \r, \n）を<br>タグに変換
      return withLinks.replace(/\r\n|\r|\n/g, '<br>');
    }

    /**
     * メッセージテキストをフォーマットし、URLの直後にプレビューボタンを挿入
     * @param {string} text - メッセージテキスト
     * @param {string} mid - メッセージID
     * @param {Array} externalLinks - 外部リンク情報配列
     * @param {Array} filePreviewInfo - ファイルプレビュー情報配列
     */
    formatMessageTextWithPreviews(text, mid, externalLinks = [], filePreviewInfo = []) {
      // 「プレビュー」という文言を除去（ボタンから挿入されたテキスト）
      let cleanedText = text.replace(/プレビュー/g, '');
      // 連続した空白行を1つに
      cleanedText = cleanedText.replace(/(\r\n|\r|\n){3,}/g, '\n\n');
      
      // URLとそれ以外のテキストを分割しながら処理
      const urlPattern = /(https?:\/\/[^\s<>"']+)/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = urlPattern.exec(cleanedText)) !== null) {
        // URLより前のテキスト
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            content: cleanedText.substring(lastIndex, match.index)
          });
        }
        // URL部分
        parts.push({
          type: 'url',
          content: match[1]
        });
        lastIndex = urlPattern.lastIndex;
      }
      
      // 最後のテキスト部分
      if (lastIndex < cleanedText.length) {
        parts.push({
          type: 'text',
          content: cleanedText.substring(lastIndex)
        });
      }
      
      // 外部リンクのURLマップを作成（URL -> リンク情報配列のインデックス）
      const externalLinkMap = new Map();
      externalLinks.forEach((link, index) => {
        if (!externalLinkMap.has(link.url)) {
          externalLinkMap.set(link.url, index);
        }
      });
      
      // ファイルプレビューのURLマップを作成（URLに含まれるfile_id -> ファイル情報）
      // ChatWorkのファイルURLは gateway/download_file.php?file_id=xxx の形式
      const fileUrlMap = new Map();
      filePreviewInfo.forEach(file => {
        fileUrlMap.set(file.fileId, file);
      });
      
      // HTMLを構築
      let html = '';
      parts.forEach(part => {
        if (part.type === 'text') {
          // テキスト部分はエスケープして改行を<br>に変換
          let escaped = this.escapeHtml(part.content);
          html += escaped.replace(/\r\n|\r|\n/g, '<br>');
        } else if (part.type === 'url') {
          const url = part.content;
          const escapedUrl = this.escapeHtml(url);
          
          // URLをリンクとして追加
          html += `<a href="${escapedUrl}" class="cw-threader-link" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;
          
          // URLの直後にプレビューボタンを追加
          // 1. ファイルURLの場合（file_id=XXX を含む）
          const fileIdMatch = url.match(/file_id=(\d+)/);
          if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            const fileInfo = fileUrlMap.get(fileId);
            if (fileInfo) {
              html += `<a class="cw-threader-preview-btn cw-threader-inline-preview" data-file-id="${this.escapeHtml(fileId)}" data-mid="${this.escapeHtml(mid)}">${t('preview_btn')}</a>`;
              // このファイルは処理済みとしてマーク
              fileUrlMap.delete(fileId);
            }
          }
          
          // 2. 外部リンクの場合（プレビューボタンがある場合のみ）
          const linkIndex = externalLinkMap.get(url);
          if (linkIndex !== undefined) {
            const linkInfo = externalLinks[linkIndex];
            if (linkInfo && linkInfo.hasPreviewButton) {
              html += `<a class="cw-threader-external-link-btn cw-threader-inline-preview" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}">${t('preview_btn')}</a>`;
            }
            // このリンクは処理済みとしてマーク
            externalLinkMap.delete(url);
          }
        }
      });
      
      // ファイルプレビュー（URLとして本文中に出現しなかったもの）を末尾に追加
      // ChatWorkの仕様に合わせて「ファイル名 (サイズ)」と「プレビュー」ボタンを分離
      fileUrlMap.forEach((file, fileId) => {
        const displayName = this.escapeHtml(this.truncateFileName(file.fileName));
        const sizeDisplay = file.fileSize ? ` (${this.escapeHtml(file.fileSize)})` : '';
        html += `<div class="cw-threader-file-preview-item">
          <span class="cw-threader-file-info">📎 ${displayName}${sizeDisplay}</span>
          <a class="cw-threader-preview-btn cw-threader-inline-preview" data-file-id="${this.escapeHtml(fileId)}" data-mid="${this.escapeHtml(mid)}">${t('preview_btn')}</a>
        </div>`;
      });
      
      // 外部リンク（URLとして本文中に出現しなかったもの、かつプレビューボタンがあるもののみ）を末尾に追加
      externalLinkMap.forEach((linkIndex, url) => {
        const link = externalLinks[linkIndex];
        if (link && link.hasPreviewButton) {
          const escapedUrl = this.escapeHtml(url);
          const title = this.escapeHtml(link.title || url);
          html += `<div class="cw-threader-external-link-item">
            <a href="${escapedUrl}" class="cw-threader-link" target="_blank" rel="noopener noreferrer">🔗 ${title}</a>
            <a class="cw-threader-external-link-btn cw-threader-inline-preview" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}">${t('preview_btn')}</a>
          </div>`;
        }
      });
      
      return html;
    }

    /**
     * URLを短縮表示する（ファイル名のみを表示）
     */
    truncateUrl(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // ファイル名を取得
        const parts = pathname.split('/');
        const filename = parts[parts.length - 1] || parts[parts.length - 2] || 'image';
        // ファイル名が長すぎる場合は切り詰め
        if (filename.length > 30) {
          return filename.substring(0, 27) + '...';
        }
        return filename;
      } catch (e) {
        // URLパースに失敗した場合は末尾30文字
        return url.length > 30 ? '...' + url.substring(url.length - 27) : url;
      }
    }

    /**
     * ファイル名を短縮表示する
     */
    truncateFileName(fileName) {
      if (!fileName) return 'プレビュー';
      // ファイル名が長すぎる場合は切り詰め
      if (fileName.length > 25) {
        // 拡張子を保持
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot > fileName.length - 6) {
          const ext = fileName.substring(lastDot);
          const name = fileName.substring(0, lastDot);
          return name.substring(0, 20) + '...' + ext;
        }
        return fileName.substring(0, 22) + '...';
      }
      return fileName;
    }

    /**
     * 元のメッセージ内のプレビューボタンをクリックしてプレビューを表示
     * @param {string} mid - メッセージID
     * @param {string} fileId - ファイルID
     */
    triggerOriginalPreview(mid, fileId) {
      // 元のメッセージ要素を探す
      const messageEl = document.querySelector(`[data-mid="${mid}"]`);
      if (!messageEl) {
        console.warn('ChatWork Threader: メッセージが見つかりません', mid);
        return;
      }
      
      // パターン1: data-file-id を持つプレビューボタン
      let originalPreviewBtn = messageEl.querySelector(`a._filePreview[data-file-id="${fileId}"], a[data-file-id="${fileId}"][data-type="chatworkImagePreview"]`);
      
      // パターン2: data-url にfile_idが含まれるプレビューボタン
      if (!originalPreviewBtn) {
        const previewLinks = messageEl.querySelectorAll('a._previewLink[data-url], a[data-type="chatworkFilePreview"][data-url]');
        for (const link of previewLinks) {
          const dataUrl = link.getAttribute('data-url') || '';
          if (dataUrl.includes(`file_id=${fileId}`)) {
            originalPreviewBtn = link;
            break;
          }
        }
      }
      
      if (originalPreviewBtn) {
        // プレビュー表示中はパネルのz-indexを下げる
        this.lowerPanelZIndex();
        // 元のボタンをクリック
        originalPreviewBtn.click();
        return;
      }
      
      // ボタンが見つからない場合は、メッセージにスクロールしてユーザーに見つけてもらう
      console.warn('ChatWork Threader: プレビューボタンが見つかりません、メッセージにスクロールします', fileId);
      this.scrollToMessage(mid);
    }

    /**
     * 外部リンクのプレビューボタンをクリック
     * @param {string} mid - メッセージID
     * @param {string} url - リンクURL
     * @param {number} linkIndex - リンクのインデックス
     * @param {boolean} isInQuote - 引用内のリンクかどうか
     */
    triggerExternalLinkPreview(mid, url, linkIndex, isInQuote = false) {
      // 元のメッセージ要素を探す
      const messageEl = document.querySelector(`[data-mid="${mid}"]`);
      if (!messageEl) {
        console.warn('ChatWork Threader: メッセージが見つかりません', mid);
        return;
      }
      
      // URLに対応するプレビューボタンを探す
      let previewBtn = null;
      
      // 引用内のプレビューボタンを探す場合は、引用要素内のみを検索
      const searchArea = isInQuote 
        ? (messageEl.querySelector('.chatQuote, .dev_quote, [data-cwopen="[qt]"]') || messageEl)
        : messageEl;
      
      // パターン1: data-cwtag属性でURLを含むspan要素を探し、その中の_previewLinkを取得
      // ChatWorkのHTML構造: <span data-cwtag="URL"><a href="URL">URL</a><a class="_previewLink" data-url="URL">プレビュー</a></span>
      const urlContainers = searchArea.querySelectorAll('[data-cwtag]');
      for (const container of urlContainers) {
        const cwtag = container.getAttribute('data-cwtag') || '';
        // data-cwtagがURLと一致するか確認
        if (cwtag === url || cwtag.includes(url) || url.includes(cwtag)) {
          // この中の_previewLinkを探す
          const previewLink = container.querySelector('a._previewLink[data-url]');
          if (previewLink) {
            previewBtn = previewLink;
            break;
          }
        }
      }
      
      // パターン2: data-url属性でURLが一致する_previewLinkを探す
      if (!previewBtn) {
        const previewLinks = searchArea.querySelectorAll('a._previewLink[data-url]');
        for (const link of previewLinks) {
          const dataUrl = link.getAttribute('data-url') || '';
          if (dataUrl === url) {
            previewBtn = link;
            break;
          }
        }
      }
      
      // パターン3: URLを含むリンクの近くにあるプレビューボタン
      if (!previewBtn) {
        const links = searchArea.querySelectorAll('a[href]');
        for (const link of links) {
          if (link.getAttribute('href') === url) {
            // このリンクの親要素からプレビューボタンを探す
            const container = link.closest('[data-cwtag]') || link.parentElement;
            if (container) {
              const btn = container.querySelector('a._previewLink[data-url]');
              if (btn) {
                previewBtn = btn;
                break;
              }
            }
          }
        }
      }
      
      // パターン4: 「プレビュー」テキストを持つ外部リンクプレビューボタンを順番で探す
      if (!previewBtn) {
        const allPreviewBtns = searchArea.querySelectorAll('a._previewLink[data-url]');
        const filteredBtns = Array.from(allPreviewBtns).filter(btn => {
          const dataUrl = btn.getAttribute('data-url') || '';
          // ファイルプレビューは除外
          return !dataUrl.includes('file_id=') && !btn.hasAttribute('data-file-id');
        });
        if (filteredBtns.length > linkIndex) {
          previewBtn = filteredBtns[linkIndex];
        }
      }
      
      if (previewBtn) {
        // プレビュー表示中はパネルを非表示
        this.lowerPanelZIndex();
        // 元のボタンをクリック
        previewBtn.click();
        return;
      }
      
      // プレビューボタンが見つからない場合は、メッセージにスクロール
      console.warn('ChatWork Threader: プレビューボタンが見つかりません、メッセージにスクロールします', url);
      this.scrollToMessage(mid);
    }

    /**
     * プレビュー表示中はパネルを一時的に非表示にする
     * シンプルなアプローチ：最初のクリックまたはEscキーで復元
     */
    lowerPanelZIndex() {
      const toggleBtn = document.getElementById('cw-threader-toggle');
      
      // 既に非表示処理中の場合はスキップ
      if (this._previewHideInProgress) {
        return;
      }
      this._previewHideInProgress = true;
      
      // パネルとトグルボタンを即座に非表示
      if (this.panel) {
        this.panel.style.opacity = '0';
        this.panel.style.visibility = 'hidden';
      }
      if (toggleBtn) {
        toggleBtn.style.opacity = '0';
        toggleBtn.style.visibility = 'hidden';
      }
      
      // 復元済みフラグ
      let restored = false;
      
      // 復元処理
      const restoreVisibility = () => {
        if (restored) return;
        restored = true;
        this._previewHideInProgress = false;
        
        if (this.panel) {
          this.panel.style.opacity = '1';
          this.panel.style.visibility = 'visible';
        }
        if (toggleBtn) {
          toggleBtn.style.opacity = '1';
          toggleBtn.style.visibility = 'visible';
        }
        // イベントリスナーを削除
        document.removeEventListener('click', onClickHandler, true);
        document.removeEventListener('keydown', onEscKey, true);
      };
      
      // クリックで復元（キャプチャフェーズで検出）
      const onClickHandler = (e) => {
        // プレビューボタン自体のクリックは無視（連打対策）
        if (e.target.closest('.cw-threader-preview-btn, .cw-threader-external-link-btn')) {
          return;
        }
        // 少し遅延して復元（プレビューが閉じるのを待つ）
        setTimeout(restoreVisibility, 100);
      };
      
      // Escキーで復元
      const onEscKey = (e) => {
        if (e.key === 'Escape') {
          setTimeout(restoreVisibility, 100);
        }
      };
      
      // 少し遅延してからイベントリスナーを開始（プレビューが開く時間を確保）
      setTimeout(() => {
        document.addEventListener('click', onClickHandler, true);
        document.addEventListener('keydown', onEscKey, true);
      }, 500);
      
      // 安全のため、30秒後には必ず元に戻す
      setTimeout(restoreVisibility, 30000);
    }

    /**
     * メッセージをクリップボードにコピー
     * @param {string} text - コピーするテキスト
     * @param {HTMLElement} button - コピーボタン要素（フィードバック用）
     */
    async copyMessageToClipboard(text, button) {
      try {
        await navigator.clipboard.writeText(text);
        // 成功フィードバック：チェックマークアイコンに変更
        const originalHtml = button.innerHTML;
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        button.classList.add('cw-threader-copy-success');
        // 1.5秒後に元に戻す
        setTimeout(() => {
          button.innerHTML = originalHtml;
          button.classList.remove('cw-threader-copy-success');
        }, 1500);
      } catch (err) {
        console.error('[ChatWorkThreader] コピーに失敗しました:', err);
        // フォールバック: execCommand を試行
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          // 成功フィードバック
          const originalHtml = button.innerHTML;
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
          button.classList.add('cw-threader-copy-success');
          setTimeout(() => {
            button.innerHTML = originalHtml;
            button.classList.remove('cw-threader-copy-success');
          }, 1500);
        } catch (fallbackErr) {
          console.error('[ChatWorkThreader] フォールバックコピーにも失敗しました:', fallbackErr);
        }
      }
    }

    /**
     * メッセージにスクロール
     */
    scrollToMessage(mid) {
      const messageEl = document.querySelector(`[data-mid="${mid}"]`);
      if (messageEl) {
        let hasAnimated = false;
        let isVisible = false;
        let scrollStopTimer = null;
        
        // スクロールコンテナを取得
        const scrollContainer = messageEl.closest('#_timeLine, ._timeLine, [role="log"]') 
          || document.querySelector('#_timeLine, ._timeLine, [role="log"]');
        
        const startShakeAnimation = () => {
          if (hasAnimated) return;
          hasAnimated = true;
          
          // クリーンアップ
          if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', onScroll);
          }
          window.removeEventListener('scroll', onScroll);
          
          // 前のアニメーションを完全にリセット
          messageEl.style.animation = 'none';
          messageEl.offsetWidth; // reflow を強制
          // 揺らすアニメーションを適用
          messageEl.style.animation = 'cw-threader-shake-message 0.15s ease-in-out 3';
          
          // アニメーション終了後にハイライト効果を適用
          setTimeout(() => {
            messageEl.style.animation = '';
            // ハイライト効果
            messageEl.classList.add('cw-threader-highlight');
            setTimeout(() => {
              messageEl.classList.remove('cw-threader-highlight');
            }, 2000);
          }, 500);
        };
        
        // スクロール停止を検出
        const onScroll = () => {
          clearTimeout(scrollStopTimer);
          scrollStopTimer = setTimeout(() => {
            // スクロールが200ms止まった & 要素が表示されている
            if (isVisible) {
              startShakeAnimation();
            }
          }, 200);
        };
        
        // スクロールイベントを監視
        if (scrollContainer) {
          scrollContainer.addEventListener('scroll', onScroll);
        }
        window.addEventListener('scroll', onScroll);
        
        // IntersectionObserverで要素が表示されたことを検出
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              isVisible = true;
              observer.disconnect();
              // 既にスクロールが止まっている場合に備えてタイマーを開始
              clearTimeout(scrollStopTimer);
              scrollStopTimer = setTimeout(() => {
                startShakeAnimation();
              }, 200);
            }
          });
        }, {
          threshold: [0.5, 1.0],
          rootMargin: '0px'
        });
        
        observer.observe(messageEl);
        
        // スクロール開始：メッセージがメッセージ欄の上辺に来るようにスクロール
        // scrollIntoViewでblock: 'start'を使用して上端に配置
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 最大待機時間（8秒）を超えたら強制的に実行
        setTimeout(() => {
          observer.disconnect();
          if (scrollContainer) {
            scrollContainer.removeEventListener('scroll', onScroll);
          }
          window.removeEventListener('scroll', onScroll);
          startShakeAnimation();
        }, 8000);
      }
    }

    /**
     * ChatWorkのタイムラインのスクロールコンテナを取得
     * 複数のセレクタを試し、実際にスクロール可能なコンテナを返す
     */
    getTimelineScrollContainer() {
      // セレクタ候補（優先順位順）
      const selectors = [
        '#_chatContent',
        '#_timeLine',
        '._timeLine',
        '.chatTimeLineBody',
        '[role="log"]',
        '#_mainContent',
        '.sc-dnqmqq' // 新しいChatWorkのクラス
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.scrollHeight > el.clientHeight) {
          console.log(`[ChatWorkThreader] Found scroll container: ${selector}`, {
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollTop: el.scrollTop
          });
          return el;
        }
      }

      // 既存のメッセージから親を遡ってスクロール可能な要素を見つける
      const anyMessage = document.querySelector('[data-mid]._message');
      if (anyMessage) {
        let parent = anyMessage.parentElement;
        while (parent && parent !== document.body) {
          if (parent.scrollHeight > parent.clientHeight + 100) {
            console.log(`[ChatWorkThreader] Found scroll container via parent traversal:`, parent.className || parent.id);
            return parent;
          }
          parent = parent.parentElement;
        }
      }

      console.error('[ChatWorkThreader] No scrollable timeline container found');
      return null;
    }

    /**
     * プレースホルダーメッセージの元メッセージを追跡する
     * ChatWorkのタイムラインを上にスクロールして履歴を読み込む
     * ユーザーがスクロールして古いメッセージを読み込むのと同じ動作
     * @param {string} mid - 探索対象のメッセージID
     * @param {HTMLElement} trackingBtn - trackingボタン要素
     */
    async trackOriginMessage(mid, trackingBtn) {
      // 既にトラッキング中の場合は中止
      if (this.trackingMid) {
        return;
      }

      // トラッキング中のmidを記録（renderThreads後の状態復元用）
      this.trackingMid = mid;

      // ボタンをアクティブ状態に
      trackingBtn.classList.add('cw-threader-tracking-active');
      
      const scrollContainer = this.getTimelineScrollContainer();
      if (!scrollContainer) {
        console.error('[ChatWorkThreader] Timeline container not found - cannot track');
        this.trackingMid = null;
        trackingBtn.classList.remove('cw-threader-tracking-active');
        return;
      }

      // 最初にメッセージが既に存在するか確認
      let targetMessage = document.querySelector(`[data-mid="${mid}"]._message`);
      if (targetMessage) {
        // 見つかった場合はスクロールして終了
        this.scrollToMessage(mid);
        this.trackingMid = null;
        trackingBtn.classList.remove('cw-threader-tracking-active');
        return;
      }

      const maxAttempts = 50; // 最大試行回数
      const scrollStep = 1000; // 一度にスクロールするピクセル数
      const waitTime = 500; // スクロール後の待機時間（ms）
      let attempts = 0;
      let noChangeCount = 0; // スクロール位置が変わらなかった回数

      console.log(`[ChatWorkThreader] Tracking origin message: ${mid}`);
      console.log(`[ChatWorkThreader] Starting scroll - container scrollTop: ${scrollContainer.scrollTop}, scrollHeight: ${scrollContainer.scrollHeight}`);

      // タイムラインを上にスクロールするだけ（ChatWorkが自動的にメッセージを読み込む）
      while (attempts < maxAttempts) {
        attempts++;
        
        // メッセージが存在するか確認
        targetMessage = document.querySelector(`[data-mid="${mid}"]._message`);
        if (targetMessage) {
          console.log(`[ChatWorkThreader] Found message after ${attempts} scroll attempts`);
          break;
        }

        // スクロール前の状態を記録
        const beforeScrollTop = scrollContainer.scrollTop;

        // タイムラインを上にスクロール（古いメッセージを読み込む）
        const newScrollTop = Math.max(0, scrollContainer.scrollTop - scrollStep);
        scrollContainer.scrollTop = newScrollTop;
        
        console.log(`[ChatWorkThreader] Scroll attempt ${attempts}: ${beforeScrollTop} -> ${scrollContainer.scrollTop}`);

        // スクロールとメッセージ読み込みを待つ
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // スクロール位置が変わらなかった場合（最上部に到達）
        if (scrollContainer.scrollTop === beforeScrollTop) {
          noChangeCount++;
          console.log(`[ChatWorkThreader] Scroll position unchanged (${noChangeCount}/3)`);
          
          // 追加のメッセージ読み込みを待つ
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (noChangeCount >= 3) {
            console.log(`[ChatWorkThreader] Reached scroll limit after ${attempts} attempts`);
            break;
          }
        } else {
          noChangeCount = 0;
        }
      }

      // 完了後にトラッキング状態を解除
      this.trackingMid = null;
      
      // 最終確認：メッセージが見つかったか
      targetMessage = document.querySelector(`[data-mid="${mid}"]._message`);

      // スレッド一覧を最新状態に再構築（トラッキングで読み込まれたメッセージを反映）
      // まずデータをクリアしてから再収集（重複防止）
      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      this.renderThreads();

      // DOM更新を確実に反映させてからスクロール処理
      requestAnimationFrame(() => {
        if (targetMessage) {
          console.log(`[ChatWorkThreader] Successfully tracked message: ${mid}`);
          // ChatWork側でメッセージにスクロール
          this.scrollToMessage(mid);
          // スレッドパネル内で該当メッセージにスクロール（「スレッドで表示」ボタンを自動クリックしたのと同じ動作）
          setTimeout(() => {
            if (this.showInThreadManager) {
              this.showInThreadManager.scrollToMessageInPanel(mid);
            }
          }, 100);
        } else {
          console.log(`[ChatWorkThreader] Could not find message: ${mid} (may be beyond plan limit or deleted)`);
        }
      });
    }

    /**
     * スレッド一覧内で該当スレッドにスクロールしてハイライト
     * @param {string} mid - メッセージID
     * @param {boolean} found - メッセージが見つかったかどうか
     */
    scrollToThreadInPanel(mid, found = true) {
      if (!this.panel) return;
      
      const contentContainer = this.panel.querySelector('.cw-threader-content');
      if (!contentContainer) return;
      
      // data-thread-mid属性で該当メッセージを探す
      const targetEl = this.panel.querySelector(`[data-thread-mid="${mid}"]`);
      if (targetEl) {
        // スレッドコンテナ（.cw-threader-thread）を取得
        const threadContainer = targetEl.closest('.cw-threader-thread');
        if (threadContainer) {
          // スレッドコンテナにスクロール
          threadContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // ハイライトアニメーションを適用
          this.highlightThreadContainer(threadContainer, found);
          return;
        }
      }
      
      // 見つからない場合は、スレッドのルートMIDを探す
      const thread = this.threadBuilder.threads.get(mid);
      if (thread) {
        const rootEl = this.panel.querySelector(`[data-thread-mid="${mid}"]`);
        if (rootEl) {
          const threadContainer = rootEl.closest('.cw-threader-thread');
          if (threadContainer) {
            threadContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.highlightThreadContainer(threadContainer, found);
          }
        }
      }
    }

    /**
     * スレッドコンテナにハイライトアニメーションを適用
     * @param {HTMLElement} threadContainer - スレッドコンテナ要素
     * @param {boolean} found - メッセージが見つかったかどうか
     */
    highlightThreadContainer(threadContainer, found) {
      // 前のアニメーションをリセット
      threadContainer.classList.remove('cw-threader-tracking-found', 'cw-threader-tracking-notfound');
      
      // リフローを強制
      threadContainer.offsetWidth;
      
      // ハイライトクラスを追加
      const highlightClass = found ? 'cw-threader-tracking-found' : 'cw-threader-tracking-notfound';
      threadContainer.classList.add(highlightClass);
      
      // アニメーション終了後にクラスを削除
      setTimeout(() => {
        threadContainer.classList.remove(highlightClass);
      }, 2000);
    }

    /**
     * トラッキング中のスレッドを常に表示し続ける（ハイライトなし）
     * renderThreads後に呼ばれ、スレッド一覧が更新されてもトラッキング中のスレッドが見えるようにする
     * @param {string} mid - トラッキング中のメッセージID
     */
    keepTrackingThreadVisible(mid) {
      if (!this.panel) return;
      
      // data-thread-mid属性で該当メッセージを探す
      const targetEl = this.panel.querySelector(`[data-thread-mid="${mid}"]`);
      if (targetEl) {
        // スレッドコンテナ（.cw-threader-thread）を取得
        const threadContainer = targetEl.closest('.cw-threader-thread');
        if (threadContainer) {
          // スムーズではなく即座にスクロール（トラッキング中は頻繁に呼ばれるため）
          threadContainer.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }
    }

    /**
     * 階層の深さに応じたパネル幅を計算
     * @param {number} maxDepth - 最大階層
     * @returns {number} パネル幅（px）
     */
    calculatePanelWidth(maxDepth) {
      // 基本幅: 380px
      // 1階層ごとに追加: 44px（CSS の ancestor-line/connect-line の幅に合わせる）
      const baseWidth = 380;
      const widthPerDepth = 44;
      const calculatedWidth = baseWidth + (maxDepth * widthPerDepth);
      // 最小550px、最大は画面幅の90%
      const maxWidth = window.innerWidth * 0.9;
      return Math.min(Math.max(calculatedWidth, 550), maxWidth);
    }

    /**
     * パネルを表示
     */
    async show() {
      if (!this.panel) {
        this.createPanel();
      }
      
      // 現在のユーザーAIDを取得
      this.currentUserAid = getCurrentUserAid();
      
      // ルームのトグル状態を読み込み
      await this.loadToggleStates();
      
      // ピン止め状態を読み込み
      await this.loadPinnedThreads();
      
      // ルーム設定を読み込んで適用
      const roomSettings = await this.loadRoomSettings();
      this.applyRoomSettings(roomSettings);
      
      // 先にメッセージを収集してスレッドを構築（幅計算のため）
      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      
      // 最大階層に応じてパネル幅を設定
      // フラットモードの場合は最小幅(550px)に設定
      let panelWidth;
      if (this.flatIndentMode) {
        panelWidth = 550; // 最小幅
      } else {
        const actualMaxDepth = this.threadBuilder.getOverallMaxDepth();
        panelWidth = this.calculatePanelWidth(actualMaxDepth);
      }
      this.panel.style.width = panelWidth + 'px';
      
      // 表示時はright: 0にする
      this.panel.style.right = '0';
      this.panel.classList.add('visible');
      this.isVisible = true;
      
      // ChatWorkのメインコンテンツエリアの幅を調整
      this.adjustChatworkMainContent(panelWidth);
      
      // スレッドを描画（既に構築済みなので再構築は不要）
      this.renderThreads();
    }

    /**
     * パネルを非表示
     */
    hide() {
      if (this.panel) {
        // 現在のパネル幅を取得して、その分だけ右に移動させる（完全に画面外に出す）
        const currentWidth = this.panel.offsetWidth;
        this.panel.style.right = `-${currentWidth}px`;
        this.panel.classList.remove('visible');
      }
      this.isVisible = false;
      
      // ChatWorkのメインコンテンツエリアを元に戻す
      this.restoreChatworkMainContent();
    }

    /**
     * 表示をトグル
     */
    toggle() {
      if (this.isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }

    /**
     * スレッドを更新
     */
    async refresh() {
      // ルームが変わっている可能性があるので再読み込み
      const newRoomId = this.getCurrentRoomId();
      if (newRoomId !== this.currentRoomId) {
        await this.loadToggleStates();
        // ピン止め状態を読み込み
        await this.loadPinnedThreads();
        // ルーム設定も読み込んで適用
        const roomSettings = await this.loadRoomSettings();
        this.applyRoomSettings(roomSettings);
      }

      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      
      // 最大階層に応じてパネル幅を再計算
      // フラットモードの場合は最小幅(550px)に設定
      let panelWidth;
      if (this.flatIndentMode) {
        panelWidth = 550; // 最小幅
      } else {
        const actualMaxDepth = this.threadBuilder.getOverallMaxDepth();
        panelWidth = this.calculatePanelWidth(actualMaxDepth);
      }
      this.panel.style.width = panelWidth + 'px';
      
      // ChatWorkのメインコンテンツエリアの幅も調整
      if (this.isVisible) {
        this.adjustChatworkMainContent(panelWidth);
      }
      
      this.renderThreads();
    }

    /**
     * ChatWorkのメッセージ欄・リサイズハンドル・概要欄を含む親コンテナを取得
     * スレッドパネルを開いた時、リサイズハンドルがスレッドパネルの左端に来るようにする
     */
    findChatworkMainElement() {
      if (this.chatworkMainElement && document.contains(this.chatworkMainElement)) {
        return this.chatworkMainElement;
      }
      
      // リサイズハンドルを探す
      const resizeHandle = document.getElementById('_subContentAreaHandle');
      if (resizeHandle) {
        // リサイズハンドルの親要素（メッセージ欄+ハンドル+概要欄を含むコンテナ）を取得
        const parentContainer = resizeHandle.parentElement;
        if (parentContainer) {
          this.chatworkMainElement = parentContainer;
          this.originalStyles = {
            marginRight: parentContainer.style.marginRight || ''
          };
          return parentContainer;
        }
      }
      
      return null;
    }

    /**
     * ChatWorkの概要欄の幅を取得
     */
    getSubContentAreaWidth() {
      const subContentArea = document.getElementById('_subContentArea');
      if (subContentArea) {
        return subContentArea.offsetWidth;
      }
      return 0;
    }

    /**
     * ChatWorkのコンテナにmargin-rightを設定
     * 概要欄の幅を考慮して、スレッドパネル分のスペースを確保
     * @param {number} panelWidth - スレッドパネルの幅
     */
    adjustChatworkMainContent(panelWidth) {
      const mainElement = this.findChatworkMainElement();
      if (mainElement) {
        // 概要欄の幅を取得
        const subContentWidth = this.getSubContentAreaWidth();
        
        // 移動距離 = スレッドパネルの幅 - 概要欄の幅
        // 概要欄はスレッドパネルの下に隠れるので、その分は移動不要
        const moveDistance = Math.max(0, panelWidth - subContentWidth);
        
        mainElement.style.marginRight = moveDistance + 'px';
        mainElement.style.transition = 'margin-right 0.25s ease';
      }
    }

    /**
     * ChatWorkのコンテナを元に戻す
     */
    restoreChatworkMainContent() {
      if (this.chatworkMainElement && this.originalStyles) {
        this.chatworkMainElement.style.marginRight = this.originalStyles.marginRight;
      }
    }
  }

  /**
   * トグルボタンを作成
   */
  function createToggleButton(threadUI) {
    const button = document.createElement('button');
    button.id = 'cw-threader-toggle';
    // 拡張機能のアイコンを使用
    let iconUrl = '';
    if (isExtensionContextValid()) {
      try {
        iconUrl = chrome.runtime.getURL('icons/chat-round-line-svgrepo-com.svg');
      } catch (e) {
        // 拡張機能のコンテキストが無効な場合
      }
    }
    if (iconUrl) {
      button.innerHTML = `<img src="${iconUrl}" class="cw-threader-icon" alt="Thread"><span class="cw-threader-shortcut">Shift+S</span>`;
    } else {
      button.innerHTML = `<span class="cw-threader-icon">💬</span><span class="cw-threader-shortcut">Shift+S</span>`;
    }
    button.title = t('toggle_title');
    
    button.addEventListener('click', () => {
      threadUI.toggle();
      // クリック後にフォーカスを解除（ショートカットキーが効くようにする）
      button.blur();
    });

    document.body.appendChild(button);
  }

  /**
   * メッセージ一覧に「スレッドで表示」ボタンを追加・管理するクラス
   */
  class ShowInThreadButtonManager {
    constructor(threadUI) {
      this.threadUI = threadUI;
      this.addedButtons = new Set(); // 追加済みボタンのMIDを管理
    }

    /**
     * メッセージがスレッドに含まれているかチェック
     * @param {string} mid - メッセージID
     * @returns {boolean}
     */
    isMessageInThread(mid) {
      const builder = this.threadUI.threadBuilder;
      // replyMapに含まれている（親がいる）または childrenMapに含まれている（子がいる）
      return builder.replyMap.has(mid) || 
             (builder.childrenMap.has(mid) && builder.childrenMap.get(mid).length > 0);
    }

    /**
     * メッセージのルートスレッドMIDを取得
     * @param {string} mid - メッセージID
     * @returns {string} ルートスレッドのMID
     */
    getRootThreadMid(mid) {
      return this.threadUI.threadBuilder.findRootMid(mid);
    }

    /**
     * 「スレッドで表示」ボタンを作成
     * @param {string} mid - メッセージID
     * @param {boolean} hasAvatar - アバターの有無
     * @param {boolean} isContinuousPost - 連続投稿かどうか
     * @returns {HTMLElement}
     */
    createShowInThreadButton(mid) {
      // ラッパーdivでボタンを包む（ホバー安定化）
      const wrapper = document.createElement('div');
      wrapper.className = 'cw-threader-show-in-thread-wrapper';
      
      const button = document.createElement('button');
      button.className = 'cw-threader-show-in-thread-btn';
      button.innerHTML = `<svg class="cw-threader-sit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>`;
      button.title = t('display_in_thread');
      button.setAttribute('data-mid', mid);
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onShowInThreadClick(mid);
      });
      
      wrapper.appendChild(button);
      return wrapper;
    }

    /**
     * 「スレッドで表示」ボタンがクリックされた時の処理
     * @param {string} mid - メッセージID
     */
    async onShowInThreadClick(mid) {
      // スレッドパネルが閉じていたら開く
      if (!this.threadUI.isVisible) {
        await this.threadUI.show();
      } else {
        // 既に開いている場合は更新
        await this.threadUI.refresh();
      }
      
      // 少し待ってからスレッドパネル内で該当メッセージにスクロール
      setTimeout(() => {
        this.scrollToMessageInPanel(mid);
      }, 100);
    }

    /**
     * スレッドパネル内で該当メッセージにスクロール
     * @param {string} mid - メッセージID
     */
    scrollToMessageInPanel(mid) {
      const panel = this.threadUI.panel;
      if (!panel) return;
      
      // ルートスレッドを見つける
      const rootMid = this.getRootThreadMid(mid);
      
      // まずルートスレッドのトグルを開く（閉じている場合）
      const threadContainer = panel.querySelector('.cw-threader-threads');
      if (!threadContainer) return;
      
      // 対象メッセージの要素を探す
      // data-mid属性でパネル内のメッセージを探すため、まず全てのトグルを確認
      const allThreadItems = panel.querySelectorAll('.cw-threader-thread-item');
      let targetThreadItem = null;
      let parentToggleCheckbox = null;
      
      for (const item of allThreadItems) {
        const messageEl = item.querySelector('.cw-threader-message');
        if (!messageEl) continue;
        
        // data-midがないのでクリックイベントから探す必要がある
        // 代わりに、親のスレッドコンテナを探して、そのトグルを操作する
      }
      
      // パネル内のスレッドアイテムをMIDで検索するため、
      // renderThreads時にdata-mid属性を追加する方法を取る
      // まず既存の実装を活用して、メッセージ要素を探す
      const messageElements = panel.querySelectorAll('[data-thread-mid]');
      let targetEl = null;
      let parentThread = null;
      
      for (const el of messageElements) {
        if (el.getAttribute('data-thread-mid') === mid) {
          targetEl = el;
          // 親のスレッドコンテナを探す
          parentThread = el.closest('.cw-threader-thread');
          break;
        }
      }
      
      // data-thread-mid属性がまだ追加されていない場合は、
      // メッセージテキストやユーザー名などから探す（フォールバック）
      if (!targetEl) {
        // メッセージデータを取得
        const messageData = this.threadUI.threadBuilder.messages.get(mid);
        if (messageData) {
          // ユーザー名とタイムスタンプで検索
          const allMessages = panel.querySelectorAll('.cw-threader-message');
          for (const msg of allMessages) {
            const userNameEl = msg.querySelector('.cw-threader-username');
            const timeEl = msg.querySelector('.cw-threader-time');
            
            if (userNameEl && timeEl) {
              const userName = userNameEl.textContent.trim();
              const timeText = timeEl.textContent.replace('·', '').trim();
              
              // タイムスタンプをフォーマットして比較
              if (messageData.timestamp) {
                const formattedTime = this.threadUI.formatDateTime(messageData.timestamp);
                if (userName === messageData.userName && timeText === formattedTime) {
                  targetEl = msg;
                  parentThread = msg.closest('.cw-threader-thread');
                  break;
                }
              }
            }
          }
        }
      }
      
      if (targetEl) {
        // 親スレッドのトグルが閉じている場合は開く
        if (parentThread) {
          const toggleBtn = parentThread.querySelector('.cw-threader-thread-toggle-btn');
          if (toggleBtn && toggleBtn.getAttribute('data-open') !== 'true') {
            toggleBtn.click();
          }
        }
        
        // スクロールしてからアニメーション（メッセージが下端に来るように）
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        // スクロール完了を待ってからアニメーション開始
        setTimeout(() => {
          // 前のアニメーションを完全にリセット
          targetEl.style.animation = 'none';
          targetEl.offsetWidth; // reflow を強制
          // インラインスタイルで直接アニメーションを適用（確実に動作させる）
          targetEl.style.animation = 'cw-threader-shake 0.15s ease-in-out 2';
          // アニメーション終了後にスタイルを削除
          setTimeout(() => {
            targetEl.style.animation = '';
          }, 500);
        }, 600);
      }
    }

    /**
     * 全てのメッセージに「スレッドで表示」ボタンを追加
     * @param {boolean} forceRebuild - スレッド情報を強制的に再構築するか（デフォルト: false）
     */
    addButtonsToMessages(forceRebuild = false) {
      // スレッド情報が空の場合、または強制再構築が指定された場合のみ再収集
      if (forceRebuild || this.threadUI.threadBuilder.threads.size === 0) {
        this.threadUI.threadBuilder.messages.clear();
        this.threadUI.threadBuilder.threads.clear();
        this.threadUI.threadBuilder.replyMap.clear();
        this.threadUI.threadBuilder.childrenMap.clear();
        this.threadUI.threadBuilder.allMessages = [];
        this.threadUI.threadBuilder.collectMessages();
        this.threadUI.threadBuilder.buildThreads();
      }
      
      // 全メッセージ要素をチェック
      const messageElements = document.querySelectorAll('[data-mid]._message');
      
      messageElements.forEach(el => {
        const mid = el.getAttribute('data-mid');
        if (!mid) return;
        
        // 既にボタンが追加されていたらスキップ
        if (el.querySelector('.cw-threader-show-in-thread-wrapper')) return;
        
        // スレッドに含まれているかチェック
        if (!this.isMessageInThread(mid)) return;
        
        // メッセージ要素を絶対位置の基準にする
        el.style.position = 'relative';
        
        const button = this.createShowInThreadButton(mid);
        el.appendChild(button);
        this.addedButtons.add(mid);
      });
    }

    /**
     * 追加済みボタンをクリーンアップ（ルーム切り替え時など）
     */
    cleanup() {
      const wrappers = document.querySelectorAll('.cw-threader-show-in-thread-wrapper');
      wrappers.forEach(wrapper => wrapper.remove());
      this.addedButtons.clear();
    }

    /**
     * ボタンの表示を更新
     */
    refresh() {
      // 既存のボタンを削除
      this.cleanup();
      // 再度追加（スレッド情報を強制再構築）
      this.addButtonsToMessages(true);
    }
  }

  /**
   * ショートカットキーを設定
   */
  function setupShortcutKey(threadUI) {
    document.addEventListener('keydown', (e) => {
      // Shift + S でスレッド表示をトグル
      if (e.shiftKey && e.key.toLowerCase() === 's') {
        // 入力フィールドにフォーカスがある場合は無視
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable ||
          activeEl.getAttribute('contenteditable') === 'true'
        );
        
        if (!isInputFocused) {
          e.preventDefault();
          threadUI.toggle();
        }
      }
    });
  }

  /**
   * メッセージ変更を監視
   */
  function observeMessages(threadUI, showInThreadButtonManager) {
    // タイムラインのコンテナを探す
    const findTimelineContainer = () => {
      // data-mid を持つ要素の親を探す
      const messageEl = document.querySelector('[data-mid]');
      if (messageEl) {
        // 親をたどってタイムラインコンテナを見つける
        let parent = messageEl.parentElement;
        while (parent) {
          if (parent.children.length > 3) {
            return parent;
          }
          parent = parent.parentElement;
        }
      }
      return document.body;
    };

    let debounceTimer = null;
    let isProcessing = false; // 処理中フラグ
    const observer = new MutationObserver((mutations) => {
      // 処理中の場合はスキップ（自分自身の変更によるトリガーを防ぐ）
      if (isProcessing) return;
      
      // data-mid を持つ要素が追加/削除されたかチェック
      // ただし、拡張機能が追加したボタン等は除外
      let hasMessageChange = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              // 拡張機能が追加した要素は除外
              if (node.classList?.contains('cw-threader-show-in-thread-wrapper')) continue;
              if (node.id === 'cw-threader-panel') continue;
              
              if (node.hasAttribute?.('data-mid') || node.querySelector?.('[data-mid]')) {
                hasMessageChange = true;
                break;
              }
            }
          }
          if (hasMessageChange) break;
        }
      }

      if (hasMessageChange) {
        // デバウンス：短時間に大量の更新が来た場合に備える
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // console.log('ChatWork Threader: メッセージ変更を検知、更新中...');
          
          isProcessing = true;
          try {
            // 「スレッドで表示」ボタンを更新
            if (showInThreadButtonManager) {
              showInThreadButtonManager.refresh();
            }
            
            // パネルが開いている場合は更新
            if (threadUI.isVisible) {
              threadUI.refresh();
            }
          } finally {
            // 次のフレームで処理中フラグを解除
            requestAnimationFrame(() => {
              isProcessing = false;
            });
          }
        }, 500);
      }
    });

    const container = findTimelineContainer();
    observer.observe(container, {
      childList: true,
      subtree: true
    });

    // URL（ルーム）変更を監視
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        // console.log('ChatWork Threader: ルーム変更を検知');
        
        // ボタンをクリーンアップして再追加
        if (showInThreadButtonManager) {
          showInThreadButtonManager.cleanup();
          setTimeout(() => {
            showInThreadButtonManager.addButtonsToMessages();
          }, 1000);
        }
      }
    });
    urlObserver.observe(document.body, { childList: true, subtree: true });

    // console.log('ChatWork Threader: メッセージ監視を開始');
  }

  /**
   * 初期化
   */
  function init() {
    // ChatWorkのページが読み込まれるまで待機
    const checkReady = setInterval(() => {
      const timeline = document.querySelector('[data-mid]');
      if (timeline) {
        clearInterval(checkReady);
        
        const threadBuilder = new ThreadBuilder();
        const threadUI = new ThreadUI(threadBuilder);
        
        // 「スレッドで表示」ボタンマネージャーを初期化
        const showInThreadButtonManager = new ShowInThreadButtonManager(threadUI);
        // ThreadUIからも参照できるように設定
        threadUI.showInThreadManager = showInThreadButtonManager;
        
        createToggleButton(threadUI);
        
        // ショートカットキーを設定
        setupShortcutKey(threadUI);
        
        // メッセージの変更を監視
        observeMessages(threadUI, showInThreadButtonManager);
        
        // 初回のボタン追加
        setTimeout(() => {
          showInThreadButtonManager.addButtonsToMessages();
        }, 1000);
        
        // console.log('ChatWork Threader initialized');
      }
    }, 1000);

    // 30秒後にタイムアウト
    setTimeout(() => {
      clearInterval(checkReady);
    }, 30000);
  }

  // DOMContentLoadedまたは即座に実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
