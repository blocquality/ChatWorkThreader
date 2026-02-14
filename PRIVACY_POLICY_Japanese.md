# プライバシーポリシー（ChatWork Threader）

最終更新日：2026/02/14

## 1. 収集する情報

本拡張機能は、以下の情報を取り扱う場合があります。

### 1.1 ChatWorkページ上の情報
- メッセージ本文、送信者名、タイムスタンプ
- メッセージID、ルームID
- 返信関係（引用情報）
- アバター画像URL
- To宛先（メンション）情報

これらの情報は、スレッドツリーを構築・表示するために**ページ上から読み取られます**。

### 1.2 ローカル保存される設定情報
- パネルの開閉状態（ルームごと）
- 発言者フィルターの選択値（ルームごと）
- 「My Participation Only」トグルの状態（ルームごと）
- 「Flat」表示モードの状態（ルームごと）
- スレッドの折りたたみ状態（ルームごと）

これらの設定情報は、ブラウザのローカルストレージ（`chrome.storage.local`）に保存されます。

## 2. 利用目的

取得した情報は、以下の目的でのみ利用されます。

- ChatWorkのメッセージ返信関係をツリー構造で可視化
- フィルター機能による特定スレッドの絞り込み表示
- ユーザー設定の保存と復元（次回アクセス時の利便性向上）
- 自分宛てメッセージ（メンション）のハイライト表示

## 3. 第三者提供・外部送信

- 本拡張機能は、取得した情報を**開発者のサーバー等へ送信しません**。
- 本拡張機能は、取得した情報を**第三者へ販売・共有しません**。
- 本拡張機能は、**外部APIへの通信を一切行いません**。
- すべての処理は、ユーザーのブラウザ内でローカルに完結します。

## 4. 保存期間と削除方法

### 保存期間
設定情報は、ユーザーが削除するまでブラウザのローカルストレージに保存されます。

### 削除方法
保存された設定を削除するには、Chromeの「拡張機能を管理」から本拡張機能を削除してください。これにより、すべての保存データが削除されます。

## 5. セキュリティ

本拡張機能は、ユーザーデータの保護に努めます。

- **外部通信なし**: 取得した情報を外部に送信しないため、通信傍受のリスクがありません。
- **ローカル完結**: すべてのデータ処理はブラウザ内で行われます。
- **最小権限**: ユーザー設定をローカルに保存するために必要最小限の権限（`storage`）のみを使用しています。
- **限定的なホスト権限**: `https://www.chatwork.com/*` でのみ動作します。

## 6. お問い合わせ

本プライバシーポリシーに関するお問い合わせは、以下までご連絡ください。

- **Email**: support_chrome_extensions@blocquality.com

## 7. サードパーティ素材

本拡張機能では、以下のサードパーティ素材を使用しています。

### アイコン

本拡張機能で使用しているアイコンは、[SVG Repo](https://www.svgrepo.com/) で公開されている **Solar Linear Icons** コレクション（by [480 Design](https://www.svgrepo.com/author/480%20Design/)）を使用しています。

- **ライセンス**: [CC Attribution License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

| アイコン名 | ソース |
|-----------|--------|
| Chat Round Line | https://www.svgrepo.com/svg/529480/chat-round-line |
| GPS | https://www.svgrepo.com/svg/524610/gps |
| Copy | https://www.svgrepo.com/svg/528917/copy |
| Pin | https://www.svgrepo.com/svg/529135/pin |
| Settings | https://www.svgrepo.com/svg/529867/settings |
| Book Minimalistic | https://www.svgrepo.com/svg/529408/book-minimalistic |
| Layers Minimalistic | https://www.svgrepo.com/svg/529043/layers-minimalistic |
| User | https://www.svgrepo.com/svg/529293/user |
| Align Left | https://www.svgrepo.com/svg/528841/align-left |
| Refresh | https://www.svgrepo.com/svg/529799/refresh |

## 8. 改定

本プライバシーポリシーの内容を変更した場合、このページを更新します。重要な変更がある場合は、拡張機能のアップデート時に通知する場合があります。
