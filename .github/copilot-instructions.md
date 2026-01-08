# Copilot Instructions

## ブランチ運用ルール

**重要**: 作業を開始する前に、必ずメインブランチ（main/master）以外の作業用ブランチを作成してから作業を行うこと。

### ブランチ命名規則
- 機能追加: `feature/機能名`
- バグ修正: `fix/バグ内容`
- リファクタリング: `refactor/対象`
- ドキュメント: `docs/内容`

### 作業フロー
1. 最新のメインブランチを取得
2. 作業用ブランチを作成・チェックアウト
3. 作業を実施
4. コミット・プッシュ
5. プルリクエストを作成

```bash
# 例
git checkout main
git pull origin main
git checkout -b feature/新機能名
```
