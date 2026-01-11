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
      return CW.myid.toString();
    }
    
    // 方法2: ページ内のユーザープロフィール要素から取得
    const myProfileLink = document.querySelector('[data-myid]');
    if (myProfileLink) {
      return myProfileLink.getAttribute('data-myid');
    }
    
    // 方法3: _myStatusAreaから取得（アイコン画像のsrcにaidが含まれることがある）
    const myStatusArea = document.getElementById('_myStatusArea');
    if (myStatusArea) {
      const avatarImg = myStatusArea.querySelector('img');
      if (avatarImg && avatarImg.src) {
        const aidMatch = avatarImg.src.match(/avatar\/(\d+)/);
        if (aidMatch) {
          return aidMatch[1];
        }
      }
    }
    
    // 方法4: inputタグのmyIdから取得
    const myIdInput = document.querySelector('input[name="myid"]');
    if (myIdInput) {
      return myIdInput.value;
    }

    // 方法5: scriptタグ内のACを検索
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.textContent) {
        const acMatch = script.textContent.match(/AC\s*=\s*{[^}]*myid\s*:\s*["'](\d+)["']/);
        if (acMatch) {
          return acMatch[1];
        }
        // もう1つのパターン
        const myidMatch = script.textContent.match(/["']myid["']\s*:\s*["'](\d+)["']/);
        if (myidMatch) {
          return myidMatch[1];
        }
      }
    }
    
    return null;
  }

  /**
   * トグル状態をストレージに保存
   */
  function saveToggleState(roomId, mid, isOpen) {
    if (!roomId || !mid) return;
    const key = `toggle_${roomId}_${mid}`;
    chrome.storage.local.set({ [key]: isOpen });
  }

  /**
   * トグル状態をストレージから取得
   */
  async function getToggleState(roomId, mid) {
    if (!roomId || !mid) return true; // デフォルトは開いた状態
    const key = `toggle_${roomId}_${mid}`;
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : true;
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
      // _message クラスを持つ実際のメッセージ要素のみを収集（返信バッジ内の参照を除外）
      const messageElements = document.querySelectorAll('[data-mid]._message');
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
        
        // メッセージ送信者のAIDを取得
        let senderAid = null;
        const aidEl = el.querySelector('[data-aid]');
        if (aidEl) {
          senderAid = aidEl.getAttribute('data-aid');
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
        let filePreviewInfo = [];  // ファイルプレビュー情報 { fileId, mimeType, fileName, fileSize }
        let externalLinks = [];    // 外部リンク情報 { url, title, type }
        let toTargets = [];  // To先ユーザー
        
        if (preEl) {
          // 引用を取得（[qt]タグ）
          const quoteTags = preEl.querySelectorAll('[data-cwtag^="[qt"]');
          quoteTags.forEach(quoteTag => {
            // 引用内容を取得（様々なクラス名に対応）
            const quoteContent = quoteTag.querySelector('.sc-klVQfs, .chatTimeLineQuoteLine, [class*="Quote"], pre');
            if (quoteContent) {
              const qText = quoteContent.textContent.trim();
              if (qText) {
                quotedMessage = quotedMessage ? quotedMessage + '\n' + qText : qText;
              }
            } else {
              // 直接テキストを取得
              const qText = quoteTag.textContent.trim();
              if (qText) {
                quotedMessage = quotedMessage ? quotedMessage + '\n' + qText : qText;
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
            '[data-cwtag^="[qt"]',   // 引用
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
          filePreviewInfo, // ファイルプレビュー情報配列
          externalLinks,   // 外部リンク情報配列
          toTargets,       // To先ユーザー配列
          senderAid        // 送信者のAID
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
        filePreviewInfo: [],
        externalLinks: [],
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
      this.showOnlyMyThreads = false; // 自分のスレッドのみ表示するフィルター
      this.currentUserAid = null; // 現在のユーザーAID
      this.selectedSpeaker = ''; // 選択中の発言者（空の場合は全員表示）
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
     * ストレージキーを生成
     */
    getStorageKey() {
      return 'cw-threader-toggle-states';
    }

    /**
     * ルームのトグル状態を読み込み
     */
    async loadToggleStates() {
      const roomId = this.getCurrentRoomId();
      if (!roomId) return;
      
      this.currentRoomId = roomId;
      
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
          <h3>スレッド</h3>
          <div class="cw-threader-header-right">
            <select id="cw-threader-speaker-filter" class="cw-threader-speaker-select" title="発言者でフィルター">
              <option value="">全員</option>
            </select>
            <div class="cw-threader-filter-toggle">
              <span class="cw-threader-filter-label">自分のスレッドのみ</span>
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

      // フィルタートグルのイベントリスナー
      const filterCheckbox = document.getElementById('cw-threader-my-filter');
      if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => {
          this.showOnlyMyThreads = filterCheckbox.checked;
          this.refresh();
        });
      }

      // 発言者フィルターのイベントリスナー
      const speakerSelect = document.getElementById('cw-threader-speaker-filter');
      if (speakerSelect) {
        speakerSelect.addEventListener('change', () => {
          this.selectedSpeaker = speakerSelect.value;
          this.renderThreads();
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
        const newWidth = Math.min(Math.max(startWidth + diff, 280), 800);
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

      // オプションを再構築
      speakerSelect.innerHTML = '<option value="">全員</option>';
      speakers.forEach(speaker => {
        const option = document.createElement('option');
        option.value = speaker;
        option.textContent = speaker;
        if (speaker === currentValue) {
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

      // フィルタリング：自分のスレッドのみ表示する場合
      if (this.showOnlyMyThreads && this.currentUserAid) {
        sortedThreads = sortedThreads.filter(thread => this.isUserInvolvedInThread(thread, this.currentUserAid));
      }

      // フィルタリング：発言者フィルター
      if (this.selectedSpeaker) {
        sortedThreads = sortedThreads.filter(thread => this.isSpeakerInThread(thread, this.selectedSpeaker));
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
    }

    /**
     * スレッド内に指定ユーザーが関わっているか判定
     * @param {Object} node - スレッドノード
     * @param {string} userAid - ユーザーAID
     * @returns {boolean} ユーザーが関わっている場合true
     */
    isUserInvolvedInThread(node, userAid) {
      // このノードのメッセージ送信者が自分かチェック
      if (node.senderAid === userAid) {
        return true;
      }
      
      // messageDataから補足情報を取得
      const messageData = this.threadBuilder.messages.get(node.mid);
      if (messageData) {
        // senderAidを確認
        if (messageData.senderAid === userAid) {
          return true;
        }
        
        // element から追加でAIDを取得
        if (messageData.element) {
          const aidEl = messageData.element.querySelector('[data-aid]');
          if (aidEl && aidEl.getAttribute('data-aid') === userAid) {
            return true;
          }
        }
      }
      
      // このノードの返信先（親）が自分かチェック
      if (node.parentAid === userAid) {
        return true;
      }
      
      // 子ノードを再帰的にチェック
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (this.isUserInvolvedInThread(child, userAid)) {
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
        
        // 祖先線を追加
        for (let i = 0; i < ancestorCount; i++) {
          const lineEl = document.createElement('div');
          lineEl.className = 'cw-threader-ancestor-line';
          if (ancestorHasMore[i]) {
            lineEl.classList.add('has-more');
          }
          ancestorLinesContainer.appendChild(lineEl);
        }
        
        // L字接続線を祖先線コンテナ内に配置（親アバターの中心から伸ばすため）
        const connectLine = document.createElement('div');
        connectLine.className = 'cw-threader-connect-line';
        // 後続の兄弟がある場合は縦線を下まで伸ばす
        if (ancestorHasMore[ancestorHasMore.length - 1]) {
          connectLine.classList.add('has-more');
        }
        ancestorLinesContainer.appendChild(connectLine);
        
        messageRow.appendChild(ancestorLinesContainer);
      }

      const messageEl = document.createElement('div');
      messageEl.className = 'cw-threader-message';
      if (node.isPlaceholder) {
        messageEl.classList.add('cw-threader-placeholder');
      }
      
      // To宛先表示用HTML
      const toTargetsHtml = (node.toTargets && node.toTargets.length > 0) 
        ? `<div class="cw-threader-to-targets">To: ${node.toTargets.map(t => this.escapeHtml(t)).join(', ')}</div>` 
        : '';
      
      // 引用表示用HTML
      const quotedHtml = node.quotedMessage 
        ? `<div class="cw-threader-quote"><span class="cw-threader-quote-icon">❝</span>${this.escapeHtml(node.quotedMessage)}</div>` 
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

      // 外部リンクボタンのクリックイベントを設定
      const externalLinkButtons = messageEl.querySelectorAll('.cw-threader-external-link-btn');
      externalLinkButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = btn.getAttribute('data-url');
          const mid = btn.getAttribute('data-mid');
          const linkIndex = parseInt(btn.getAttribute('data-link-index'), 10);
          this.triggerExternalLinkPreview(mid, url, linkIndex);
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
        
        node.children.forEach((child, index) => {
          const isLastChild = index === node.children.length - 1;
          // 現在の子に後続の兄弟があるかどうかを祖先情報に追加
          const newAncestorHasMore = [...ancestorHasMore, !isLastChild];
          const childEl = this.createThreadElement(child, depth + 1, newAncestorHasMore);
          childrenContainer.appendChild(childEl);
        });
        
        container.appendChild(childrenContainer);

        // ルートメッセージの場合、トグルスイッチのイベントを設定
        if (isRootWithReplies) {
          const toggleCheckbox = messageEl.querySelector('.cw-threader-toggle-switch input');
          if (toggleCheckbox) {
            const roomId = getCurrentRoomId();
            const mid = node.mid;

            // 保存された状態を復元
            getToggleState(roomId, mid).then(isOpen => {
              toggleCheckbox.checked = isOpen;
              childrenContainer.style.display = isOpen ? '' : 'none';
            });

            toggleCheckbox.addEventListener('change', (e) => {
              e.stopPropagation();
              const isOpen = toggleCheckbox.checked;
              childrenContainer.style.display = isOpen ? '' : 'none';
              // 状態をストレージに保存
              saveToggleState(roomId, mid, isOpen);
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
     */
    triggerExternalLinkPreview(mid, url, linkIndex) {
      // 元のメッセージ要素を探す
      const messageEl = document.querySelector(`[data-mid="${mid}"]`);
      if (!messageEl) {
        console.warn('ChatWork Threader: メッセージが見つかりません', mid);
        return;
      }
      
      // URLに対応するプレビューボタンを探す
      let previewBtn = null;
      
      // パターン1: data-cwtag属性でURLを含むspan要素を探し、その中の_previewLinkを取得
      // ChatWorkのHTML構造: <span data-cwtag="URL"><a href="URL">URL</a><a class="_previewLink" data-url="URL">プレビュー</a></span>
      const urlContainers = messageEl.querySelectorAll('[data-cwtag]');
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
        const previewLinks = messageEl.querySelectorAll('a._previewLink[data-url]');
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
        const links = messageEl.querySelectorAll('a[href]');
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
        const allPreviewBtns = messageEl.querySelectorAll('a._previewLink[data-url]');
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
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // ハイライト効果
        messageEl.classList.add('cw-threader-highlight');
        setTimeout(() => {
          messageEl.classList.remove('cw-threader-highlight');
        }, 2000);
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
      // 最小280px、最大800px
      return Math.min(Math.max(calculatedWidth, 280), 800);
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
      
      // 先にメッセージを収集してスレッドを構築（幅計算のため）
      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      
      // 最大階層に応じてパネル幅を設定
      const maxDepth = this.threadBuilder.getOverallMaxDepth();
      const panelWidth = this.calculatePanelWidth(maxDepth);
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
      }

      this.threadBuilder.messages.clear();
      this.threadBuilder.threads.clear();
      this.threadBuilder.replyMap.clear();
      this.threadBuilder.childrenMap.clear();
      this.threadBuilder.allMessages = [];
      
      this.threadBuilder.collectMessages();
      this.threadBuilder.buildThreads();
      
      // 最大階層に応じてパネル幅を再計算
      const maxDepth = this.threadBuilder.getOverallMaxDepth();
      const panelWidth = this.calculatePanelWidth(maxDepth);
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
    const iconUrl = chrome.runtime.getURL('icon128.png');
    button.innerHTML = `<img src="${iconUrl}" class="cw-threader-icon" alt="スレッド"><span class="cw-threader-shortcut">Shift+S</span>`;
    button.title = 'スレッド表示を切り替え (Shift+S)';
    
    button.addEventListener('click', () => {
      threadUI.toggle();
      // クリック後にフォーカスを解除（ショートカットキーが効くようにする）
      button.blur();
    });

    document.body.appendChild(button);
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
        
        // ショートカットキーを設定
        setupShortcutKey(threadUI);
        
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
