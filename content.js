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
          const isInTo = aidEl.closest('[data-cwtag^="[to"]');
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
        let quotedMessage = null;  // 引用メッセージ
        let quoteAuthor = null;    // 引用元発言者情報 { name, avatarUrl, timestamp }
        let filePreviewInfo = [];  // ファイルプレビュー情報 { fileId, mimeType, fileName, fileSize }
        let externalLinks = [];    // 外部リンク情報 { url, title, type }
        let quoteExternalLinks = [];  // 引用内の外部リンク情報
        let toTargets = [];  // To先ユーザー
        
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
          
          // To宛先を取得
          const toTags = preEl.querySelectorAll('[data-cwtag^="[to"]');
          toTags.forEach(toTag => {
            const toName = toTag.textContent?.trim() || '';
            if (toName && !toTargets.includes(toName)) {
              toTargets.push(toName);
            }
          });
          
          // ToAllも確認
          const toAllTag = preEl.querySelector('[data-cwtag="[toall]"]');
          if (toAllTag && !toTargets.includes('ALL')) {
            toTargets.push('ALL');
          }
          
          // メッセージ本文を取得（より堅牢な方法）
          // まず、特殊タグ以外のテキストノードを収集
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
          
          // 除外するセレクタ
          const excludeSelectors = [
            '[data-cwtag^="[rp"]',   // Reply バッジ
            '[data-cwtag^="[qt"]',   // 引用（data-cwtag形式）
            '[data-cwopen="[qt]"]',  // 引用（data-cwopen形式）
            '.chatQuote',            // 引用コンテナ
            '.dev_quote',            // 引用コンテナ（別形式）
            '[data-cwtag^="[to"]',   // To
            '[data-cwtag="[toall]"]', // ToAll
            '.chatTimeLineReply',    // 返信バッジ表示部分
            '._replyMessage',        // 返信メッセージバッジ
            '._filePreview',         // プレビューボタン
            '._filePreviewButton',   // プレビューボタン
            '[data-type="chatworkImagePreview"]', // 画像プレビューボタン
            '._previewLink',         // 外部リンクプレビューボタン
            '[data-cwopen*="download"]', // ダウンロードリンク（ファイル名・サイズ）
            '.chatInfo [data-cwtag^="[preview"]' // 画像プレビュー領域
          ];
          
          const textParts = collectTextNodes(preEl, excludeSelectors);
          
          if (textParts.length > 0) {
            let rawText = textParts.join('').trim();
            
            // 「〇〇さん」の行を抽出してから除去（返信先ユーザー名）
            const userNameMatch = rawText.match(/^(.+?)さん[\r\n\s]+/);
            if (userNameMatch) {
              replyTargetUserName = userNameMatch[1];
              rawText = rawText.replace(/^.+?さん[\r\n\s]+/, '');
            }
            
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
          avatarUrl,
          element: el,
          quotedMessage,   // 引用メッセージ
          quoteAuthor,     // 引用元発言者情報 { name, avatarUrl, timestamp }
          filePreviewInfo, // ファイルプレビュー情報配列
          externalLinks,   // 外部リンク情報配列
          quoteExternalLinks, // 引用内の外部リンク情報配列
          toTargets,       // To先ユーザー配列
          senderAid,       // 送信者のAID
          isToMe,          // 自分宛てフラグ
          isFromMe         // 自分が送信したメッセージフラグ
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
        avatarUrl: '',
        element: null,
        isPlaceholder: true,
        quotedMessage: null,
        quoteAuthor: null,
        filePreviewInfo: [],
        externalLinks: [],
        quoteExternalLinks: [],
        toTargets: [],
        senderAid: null
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
        const flatModeCheckbox = document.getElementById('cw-threader-flat-mode');
        if (flatModeCheckbox) {
          flatModeCheckbox.checked = this.flatIndentMode;
        }
      }

      // 自分参加のみフィルター
      if (settings.showOnlyMyThreads !== undefined) {
        this.showOnlyMyThreads = settings.showOnlyMyThreads;
        const filterCheckbox = document.getElementById('cw-threader-my-filter');
        if (filterCheckbox) {
          filterCheckbox.checked = this.showOnlyMyThreads;
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
          <div class="cw-threader-header-right">
            <select id="cw-threader-speaker-filter" class="cw-threader-speaker-select" title="発言者でフィルター">
              <option value="">全員</option>
            </select>
            <div class="cw-threader-filter-toggle">
              <span class="cw-threader-filter-label">フラット</span>
              <label class="cw-threader-toggle-switch cw-threader-filter-switch">
                <input type="checkbox" id="cw-threader-flat-mode">
                <span class="cw-threader-toggle-slider"></span>
              </label>
            </div>
            <div class="cw-threader-filter-toggle">
              <span class="cw-threader-filter-label" title="自分が返信した、または自分宛ての返信があるスレッドのみ表示">自分参加のみ</span>
              <label class="cw-threader-toggle-switch cw-threader-filter-switch">
                <input type="checkbox" id="cw-threader-my-filter">
                <span class="cw-threader-toggle-slider"></span>
              </label>
            </div>
            <div class="cw-threader-controls">
              <button id="cw-threader-refresh" title="更新">↻</button>
              <button id="cw-threader-close" title="閉じる">×</button>
            </div>
          </div>
        </div>
        <div class="cw-threader-search-bar">
          <div class="cw-threader-search-input-wrapper">
            <input type="text" id="cw-threader-search" class="cw-threader-search-input" placeholder="メッセージを検索...">
            <button id="cw-threader-search-clear" class="cw-threader-search-clear" title="クリア">×</button>
          </div>
          <div id="cw-threader-search-nav" class="cw-threader-search-nav">
            <button id="cw-threader-search-prev" class="cw-threader-search-nav-btn" title="前の結果">▲</button>
            <button id="cw-threader-search-next" class="cw-threader-search-nav-btn" title="次の結果">▼</button>
          </div>
          <span id="cw-threader-search-count" class="cw-threader-search-count"></span>
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

      // フラット表示モードのトグルのイベントリスナー
      const flatModeCheckbox = document.getElementById('cw-threader-flat-mode');
      if (flatModeCheckbox) {
        flatModeCheckbox.addEventListener('change', () => {
          this.flatIndentMode = flatModeCheckbox.checked;
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

      // フィルタートグルのイベントリスナー
      const filterCheckbox = document.getElementById('cw-threader-my-filter');
      if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => {
          this.showOnlyMyThreads = filterCheckbox.checked;
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
      speakerSelect.innerHTML = '<option value="">全員</option>';
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
        (node.toTargets || []).join(' ')
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
          countEl.textContent = `${matchCount}件`;
        } else {
          countEl.textContent = '該当なし';
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
        container.innerHTML = '<div class="cw-threader-empty">スレッドが見つかりませんでした</div>';
        return;
      }

      // 発言者プルダウンを更新
      this.updateSpeakerDropdown();

      // ルートメッセージのタイムスタンプで新しい順にソート
      // タイムスタンプがない場合はmid（メッセージID）でソート（midは時系列で割り当てられる）
      let sortedThreads = Array.from(threads.values())
        .sort((a, b) => {
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
        container.innerHTML = '<div class="cw-threader-empty">該当するスレッドがありません</div>';
        return;
      }

      sortedThreads.forEach(thread => {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'cw-threader-thread';
        
        const threadEl = this.createThreadElement(thread, 0, []);
        messageWrapper.appendChild(threadEl);
        container.appendChild(messageWrapper);
      });

      // 検索フィルターを適用（検索クエリがある場合）
      if (this.searchQuery) {
        this.applySearchFilter();
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
      
      // To宛先表示用HTML
      const toTargetsHtml = (node.toTargets && node.toTargets.length > 0) 
        ? `<div class="cw-threader-to-targets">To: ${node.toTargets.map(t => this.escapeHtml(t)).join(', ')}</div>` 
        : '';
      
      // 引用表示用HTML（引用内のプレビューボタンも表示、発言者情報も表示）
      const quotedHtml = node.quotedMessage 
        ? this.formatQuoteWithPreviews(node.quotedMessage, node.mid, node.quoteExternalLinks || [], node.quoteAuthor)
        : '';
      
      // メッセージ本文（URLの直後にプレビューボタンを挿入）
      const messageBodyHtml = this.formatMessageTextWithPreviews(
        node.messageText,
        node.mid,
        node.externalLinks || [],
        node.filePreviewInfo || []
      );
      
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
                <span class="cw-threader-reply-label">${replyCount} Reply</span>
                <label class="cw-threader-toggle-switch">
                  <input type="checkbox" checked>
                  <span class="cw-threader-toggle-slider"></span>
                </label>
              </div>
            ` : ''}
          </div>
          ${toTargetsHtml}
          ${quotedHtml}
          <div class="cw-threader-message-body">${messageBodyHtml}</div>
        </div>
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

        // ルートメッセージの場合、トグルスイッチのイベントを設定
        if (isRootWithReplies) {
          const toggleCheckbox = messageEl.querySelector('.cw-threader-toggle-switch input');
          if (toggleCheckbox) {
            const mid = node.mid;

            // 保存された状態を同期的に復元（事前にloadToggleStatesで読み込み済み）
            const isOpen = this.getToggleState(mid);
            toggleCheckbox.checked = isOpen;
            childrenContainer.style.display = isOpen ? '' : 'none';

            toggleCheckbox.addEventListener('change', (e) => {
              e.stopPropagation();
              const isOpen = toggleCheckbox.checked;
              childrenContainer.style.display = isOpen ? '' : 'none';
              // 状態をストレージに保存
              this.saveToggleState(mid, isOpen);
            });
          }
        }
      }

      return container;
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
              contentHtml += `<a class="cw-threader-external-link-btn cw-threader-inline-preview cw-threader-quote-preview-btn" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}" data-in-quote="true">プレビュー</a>`;
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
            <a class="cw-threader-external-link-btn cw-threader-inline-preview cw-threader-quote-preview-btn" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}" data-in-quote="true">プレビュー</a>
          </div>`;
        }
      });
      
      return `<div class="cw-threader-quote">${authorHtml}<div class="cw-threader-quote-body"><span class="cw-threader-quote-icon">❝</span>${contentHtml}</div></div>`;
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
              html += `<a class="cw-threader-preview-btn cw-threader-inline-preview" data-file-id="${this.escapeHtml(fileId)}" data-mid="${this.escapeHtml(mid)}">プレビュー</a>`;
              // このファイルは処理済みとしてマーク
              fileUrlMap.delete(fileId);
            }
          }
          
          // 2. 外部リンクの場合（プレビューボタンがある場合のみ）
          const linkIndex = externalLinkMap.get(url);
          if (linkIndex !== undefined) {
            const linkInfo = externalLinks[linkIndex];
            if (linkInfo && linkInfo.hasPreviewButton) {
              html += `<a class="cw-threader-external-link-btn cw-threader-inline-preview" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}">プレビュー</a>`;
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
          <a class="cw-threader-preview-btn cw-threader-inline-preview" data-file-id="${this.escapeHtml(fileId)}" data-mid="${this.escapeHtml(mid)}">プレビュー</a>
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
            <a class="cw-threader-external-link-btn cw-threader-inline-preview" data-link-index="${linkIndex}" data-url="${escapedUrl}" data-mid="${this.escapeHtml(mid)}">プレビュー</a>
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
        
        // スクロール開始
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
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
      // 最小440px、最大は画面幅の90%
      const maxWidth = window.innerWidth * 0.9;
      return Math.min(Math.max(calculatedWidth, 440), maxWidth);
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
      // フラットモードの場合は最小幅(440px)に設定
      let panelWidth;
      if (this.flatIndentMode) {
        panelWidth = 440; // 最小幅
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
      // フラットモードの場合は最小幅(440px)に設定
      let panelWidth;
      if (this.flatIndentMode) {
        panelWidth = 440; // 最小幅
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
        iconUrl = chrome.runtime.getURL('icon128.png');
      } catch (e) {
        // 拡張機能のコンテキストが無効な場合
      }
    }
    if (iconUrl) {
      button.innerHTML = `<img src="${iconUrl}" class="cw-threader-icon" alt="スレッド"><span class="cw-threader-shortcut">Shift+S</span>`;
    } else {
      button.innerHTML = `<span class="cw-threader-icon">💬</span><span class="cw-threader-shortcut">Shift+S</span>`;
    }
    button.title = 'スレッド表示を切り替え (Shift+S)';
    
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
    createShowInThreadButton(mid, hasAvatar = true, isContinuousPost = false) {
      // ラッパーdivでボタンを包む（ホバー安定化）
      const wrapper = document.createElement('div');
      wrapper.className = 'cw-threader-show-in-thread-wrapper';
      // アバターの有無、連続投稿かどうかに応じてクラスを追加
      if (isContinuousPost) {
        // 連続投稿（_speaker要素がない）: 一番上に配置
        wrapper.classList.add('cw-threader-sit-continuous-post');
      } else if (hasAvatar) {
        wrapper.classList.add('cw-threader-sit-below-avatar');
      } else {
        wrapper.classList.add('cw-threader-sit-at-avatar');
      }
      
      const button = document.createElement('button');
      button.className = 'cw-threader-show-in-thread-btn';
      button.innerHTML = `<svg class="cw-threader-sit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>`;
      button.title = 'スレッド一覧で表示';
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
          const toggleCheckbox = parentThread.querySelector('.cw-threader-toggle-switch input');
          if (toggleCheckbox && !toggleCheckbox.checked) {
            toggleCheckbox.checked = true;
            toggleCheckbox.dispatchEvent(new Event('change'));
          }
        }
        
        // スクロールしてからアニメーション
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
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
        
        // ボタンを追加する位置: _message要素の左側パディングに絶対位置で配置
        el.style.position = 'relative';
        
        // ユーザーアイコンの有無をチェック（引用内のアイコンは除外）
        const avatarEl = el.querySelector('.userIconImage:not(.chatQuote *):not(.dev_quote *), [data-testid="user-icon"]:not(.chatQuote *):not(.dev_quote *)');
        const hasAvatar = !!avatarEl;
        
        // 連続投稿メッセージかどうかをチェック（_speaker要素がない場合は連続投稿）
        const speakerEl = el.querySelector('._speaker');
        const isContinuousPost = !speakerEl;
        
        const button = this.createShowInThreadButton(mid, hasAvatar, isContinuousPost);
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
