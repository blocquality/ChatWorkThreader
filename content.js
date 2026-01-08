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
     * ページからメッセージを収集
     */
    collectMessages() {
      const messageElements = document.querySelectorAll('[data-mid]');
      let lastUserName = '';
      let lastAvatarUrl = '';
      
      messageElements.forEach(el => {
        const mid = el.getAttribute('data-mid');
        const rid = el.getAttribute('data-rid');
        
        if (!mid) return;

        // ユーザー名を取得（連続投稿の場合は前のユーザー名を使用）
        const userNameEl = el.querySelector('[data-testid="timeline_user-name"]');
        let userName = userNameEl ? userNameEl.textContent.trim() : '';
        
        // アバター画像を取得
        const avatarEl = el.querySelector('.userIconImage');
        let avatarUrl = avatarEl ? avatarEl.src : '';

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

        // メッセージ本文を取得
        const preEl = el.querySelector('pre');
        let messageText = '';
        if (preEl) {
          // 返信バッジ以外のテキストを取得
          const clonedPre = preEl.cloneNode(true);
          const replyBadges = clonedPre.querySelectorAll('[data-cwtag]');
          replyBadges.forEach(badge => badge.remove());
          messageText = clonedPre.textContent.trim();
          // 「〇〇さん」の行を除去
          messageText = messageText.replace(/^.+さん\n/, '');
        }

        // タイムスタンプを取得
        const timeEl = el.querySelector('[data-tm]');
        const timestamp = timeEl ? timeEl.getAttribute('data-tm') : '';
        const timeText = timeEl ? timeEl.textContent.trim() : '';

        // 返信元を解析
        const replyTag = el.querySelector('[data-cwtag^="[rp"]');
        let parentMid = null;
        if (replyTag) {
          const cwtag = replyTag.getAttribute('data-cwtag');
          // [rp aid=XXXX to=ROOMID-MESSAGEID] 形式をパース
          const match = cwtag.match(/to=(\d+)-(\d+)/);
          if (match) {
            parentMid = match[2];
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
          avatarUrl,
          element: el
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
      if (!message) {
        return null;
      }

      const children = this.childrenMap.get(mid) || [];
      const childTrees = children
        .map(childMid => this.buildThreadTree(childMid))
        .filter(tree => tree !== null)
        .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

      return {
        ...message,
        children: childTrees
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
  }

  /**
   * スレッド表示UIを管理
   */
  class ThreadUI {
    constructor(threadBuilder) {
      this.threadBuilder = threadBuilder;
      this.panel = null;
      this.isVisible = false;
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

      this.panel = document.createElement('div');
      this.panel.id = 'cw-threader-panel';
      this.panel.innerHTML = `
        <div class="cw-threader-resize-handle"></div>
        <div class="cw-threader-header">
          <h3>スレッド</h3>
          <div class="cw-threader-controls">
            <button id="cw-threader-refresh" title="更新">↻</button>
            <button id="cw-threader-close" title="閉じる">×</button>
          </div>
        </div>
        <div class="cw-threader-content">
          <div class="cw-threader-threads"></div>
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
        const newWidth = Math.min(Math.max(startWidth + diff, 280), 800);
        this.panel.style.width = newWidth + 'px';
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
     * メッセージを表示（YouTube/Redditコメント欄風）
     * 返信関係のあるスレッドのみ表示
     */
    renderThreads() {
      const container = this.panel.querySelector('.cw-threader-threads');
      container.innerHTML = '';

      // スレッド（返信関係があるもの）のみ表示
      const threads = this.threadBuilder.threads;

      if (threads.size === 0) {
        container.innerHTML = '<div class="cw-threader-empty">スレッドが見つかりませんでした</div>';
        return;
      }

      const sortedThreads = Array.from(threads.values())
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

      sortedThreads.forEach(thread => {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'cw-threader-thread';
        
        const threadEl = this.createThreadElement(thread, 0);
        messageWrapper.appendChild(threadEl);
        container.appendChild(messageWrapper);
      });
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
     * スレッド要素を作成（Reddit/YouTube風）
     */
    createThreadElement(node, depth) {
      const container = document.createElement('div');
      
      const messageType = this.threadBuilder.getMessageType(node.mid);
      const typeLabel = this.getTypeLabel(messageType);
      const replyCount = this.countReplies(node);

      // メッセージテキストを省略
      const shortText = node.messageText.length > 80 
        ? node.messageText.substring(0, 80) + '...' 
        : node.messageText;

      const messageEl = document.createElement('div');
      messageEl.className = 'cw-threader-message';
      messageEl.innerHTML = `
        <div class="cw-threader-avatar-wrap">
          ${node.avatarUrl 
            ? `<img src="${node.avatarUrl}" class="cw-threader-avatar" alt="">` 
            : `<div class="cw-threader-avatar"></div>`}
        </div>
        <div class="cw-threader-msg-content">
          <div class="cw-threader-message-header">
            <span class="cw-threader-username">${this.escapeHtml(node.userName)}</span>
            <span class="cw-threader-time">· ${node.timeText}</span>
            ${typeLabel ? `<span class="cw-threader-type ${this.getTypeClass(messageType)}">${typeLabel}</span>` : ''}
            ${replyCount > 0 ? `<span class="cw-threader-reply-count">${replyCount}件の返信</span>` : ''}
          </div>
          <div class="cw-threader-message-body">${this.escapeHtml(shortText)}</div>
        </div>
      `;

      // クリックでメッセージにスクロール
      messageEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.scrollToMessage(node.mid);
      });

      container.appendChild(messageEl);

      // 子メッセージを追加
      if (node.children && node.children.length > 0) {
        const childrenWrapper = document.createElement('div');
        childrenWrapper.className = 'cw-threader-children-wrapper';
        
        // 折りたたみ用の縦線
        const threadLine = document.createElement('div');
        threadLine.className = 'cw-threader-collapse-line';
        threadLine.title = 'クリックで折りたたみ';
        
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'cw-threader-children';
        
        node.children.forEach(child => {
          const childEl = this.createThreadElement(child, depth + 1);
          childrenContainer.appendChild(childEl);
        });
        
        // 縦線クリックで折りたたみ
        threadLine.addEventListener('click', (e) => {
          e.stopPropagation();
          childrenContainer.classList.toggle('collapsed');
          threadLine.classList.toggle('collapsed');
        });
        
        childrenWrapper.appendChild(threadLine);
        childrenWrapper.appendChild(childrenContainer);
        container.appendChild(childrenWrapper);
      }

      return container;
    }

    /**
     * メッセージタイプのラベルを取得
     */
    getTypeLabel(type) {
      switch (type) {
        case 2: return '返信元';
        case 3: return '返信';
        case 4: return '返信元+返信';
        default: return '';
      }
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
     * HTMLエスケープ
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * メッセージにスクロール
     */
    scrollToMessage(mid) {
      const messageEl = document.querySelector(`[data-mid="${mid}"]`);
      if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // ハイライト効果
        messageEl.classList.add('cw-threader-highlight');
        setTimeout(() => {
          messageEl.classList.remove('cw-threader-highlight');
        }, 2000);
      }
    }

    /**
     * パネルを表示
     */
    show() {
      if (!this.panel) {
        this.createPanel();
      }
      this.panel.classList.add('visible');
      this.isVisible = true;
      this.refresh();
    }

    /**
     * パネルを非表示
     */
    hide() {
      if (this.panel) {
        this.panel.classList.remove('visible');
      }
      this.isVisible = false;
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
    refresh() {
      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      this.renderThreads();
    }
  }

  /**
   * トグルボタンを作成
   */
  function createToggleButton(threadUI) {
    const button = document.createElement('button');
    button.id = 'cw-threader-toggle';
    button.innerHTML = '🌳';
    button.title = 'スレッド表示を切り替え';
    
    button.addEventListener('click', () => {
      threadUI.toggle();
    });

    document.body.appendChild(button);
  }

  /**
   * メッセージ変更を監視
   */
  function observeMessages(threadUI) {
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
    const observer = new MutationObserver((mutations) => {
      // data-mid を持つ要素が追加/削除されたかチェック
      let hasMessageChange = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (node.hasAttribute?.('data-mid') || node.querySelector?.('[data-mid]'))) {
              hasMessageChange = true;
              break;
            }
          }
          if (hasMessageChange) break;
        }
      }

      if (hasMessageChange && threadUI.isVisible) {
        // デバウンス：短時間に大量の更新が来た場合に備える
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log('ChatWork Threader: メッセージ変更を検知、更新中...');
          threadUI.refresh();
        }, 500);
      }
    });

    const container = findTimelineContainer();
    observer.observe(container, {
      childList: true,
      subtree: true
    });

    console.log('ChatWork Threader: メッセージ監視を開始');
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
        
        createToggleButton(threadUI);
        
        // メッセージの変更を監視
        observeMessages(threadUI);
        
        console.log('ChatWork Threader initialized');
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
