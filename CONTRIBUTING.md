# 貢獻指南 | Contributing Guide

感謝你對 English Savior 專案的興趣！我們歡迎各種形式的貢獻。

Thank you for your interest in contributing to English Savior! We welcome all forms of contributions.

## 🌟 如何貢獻 | How to Contribute

### 回報問題 | Reporting Issues

如果你發現 bug 或有功能建議：

1. 先搜尋現有的 Issues，確認問題是否已被回報
2. 建立新 Issue，清楚描述：
   - 問題的重現步驟
   - 預期行為與實際行為
   - 你的瀏覽器版本和作業系統
   - 相關的錯誤訊息或截圖

### 提交程式碼 | Submitting Code

#### 1. Fork 和 Clone

```bash
# Fork 此專案到你的 GitHub 帳號
# 然後 clone 你的 fork
git clone https://github.com/你的用戶名/english_savior.git
cd english_savior
```

#### 2. 建立分支 | Create a Branch

```bash
# 從 main 建立新分支
git checkout -b feature/your-feature-name

# 或修復 bug
git checkout -b fix/bug-description
```

#### 3. 進行開發 | Make Changes

- 遵循現有的程式碼風格
- 保持程式碼簡潔易讀
- 添加適當的註解（中英文皆可）
- 測試你的變更

#### 4. 提交變更 | Commit Changes

```bash
# 添加變更的檔案
git add .

# 提交時使用清楚的訊息
git commit -m "Add: 新增某某功能"
git commit -m "Fix: 修復某某問題"
git commit -m "Update: 更新某某內容"
```

提交訊息格式建議：
- `Add: 新增功能或檔案`
- `Fix: 修復 bug`
- `Update: 更新現有功能`
- `Refactor: 重構程式碼`
- `Docs: 更新文件`
- `Style: 格式調整（不影響功能）`

#### 5. 推送與 Pull Request | Push and PR

```bash
# 推送到你的 fork
git push origin feature/your-feature-name

# 到 GitHub 上開啟 Pull Request
```

在 PR 描述中請說明：
- 這個 PR 解決什麼問題
- 你做了哪些變更
- 如何測試這些變更

## 📝 程式碼風格 | Code Style

### JavaScript

```javascript
// ✅ 良好的範例
function loadNewWord() {
  const pool = VOCAB_DATA[currentDifficulty];
  const word = pool[Math.floor(Math.random() * pool.length)];
  return word;
}

// ❌ 避免的寫法
function loadnewword(){
const p=VOCAB_DATA[currentDifficulty];return p[Math.floor(Math.random()*p.length)];}
```

- 使用有意義的變數名稱
- 適當的空格和縮排（2 或 4 個空格）
- 函式之間空一行
- 複雜邏輯加上註解

### CSS

```css
/* ✅ 良好的範例 */
.mc-block {
  padding: 12px;
  border-radius: 4px;
  background: var(--bg-light);
  transition: all 0.3s ease;
}

/* 使用有意義的 class 名稱 */
/* 屬性按類型分組 */
```

### HTML

- 使用語義化標籤
- 適當的縮排
- 屬性值使用雙引號

## 🎯 貢獻領域 | Areas to Contribute

### 內容擴充 | Content Expansion

最容易開始的貢獻方式！

- **新增單字**：在 `js/data.js` 的 `VOCAB_DATA` 中新增
- **新增文法題**：在 `GRAMMAR_DATA` 中新增題目
- **新增影片課程**：在 `VIDEO_LESSONS` 中新增課程
- **新增成就**：設計新的成就徽章

### 功能開發 | Feature Development

- 聲音效果系統
- 多語言支援（英文介面）
- 深色/淺色主題切換
- 匯出學習報告功能
- 排行榜系統
- 更多遊戲模式

### 介面優化 | UI/UX Improvements

- 改善響應式設計
- 動畫效果優化
- 無障礙功能（Accessibility）
- 效能優化

### 文件改進 | Documentation

- 改善 README
- 添加程式碼註解
- 撰寫教學文件
- 翻譯文件

## 🧪 測試 | Testing

在提交 PR 前，請確保：

1. ✅ 在多個瀏覽器測試（Chrome、Firefox、Safari、Edge）
2. ✅ 測試響應式設計（手機、平板、桌面）
3. ✅ 檢查 Console 沒有錯誤訊息
4. ✅ 確認 localStorage 正常運作
5. ✅ 測試所有遊戲模式
6. ✅ 驗證新增的內容顯示正確

## 📋 貢獻檢查清單 | Contribution Checklist

提交 PR 前請確認：

- [ ] 我的程式碼遵循專案的風格指南
- [ ] 我已經測試了變更，確認正常運作
- [ ] 我已更新相關文件（如果需要）
- [ ] 我的提交訊息清楚描述了變更
- [ ] 我已檢查沒有產生新的警告或錯誤
- [ ] 我的變更不會破壞現有功能

## 💡 開發建議 | Development Tips

### 本地開發環境

```bash
# 使用簡單的 HTTP 伺服器
python -m http.server 8000

# 或
npx http-server -p 8000
```

### 瀏覽器開發者工具

- Chrome DevTools: `F12` 或 `Cmd+Option+I` (Mac)
- 使用 Console 檢查錯誤
- 使用 Application > Local Storage 檢查儲存資料
- 使用 Network 標籤檢查資源載入

### 清除 LocalStorage (測試用)

```javascript
// 在瀏覽器 Console 執行
localStorage.clear();
location.reload();
```

## 🎓 學習資源 | Learning Resources

如果你是新手，這些資源可能有幫助：

- [MDN Web Docs](https://developer.mozilla.org/) - Web 開發完整指南
- [JavaScript.info](https://javascript.info/) - 現代 JavaScript 教學
- [Git 基礎教學](https://git-scm.com/book/zh-tw/v2)

## ❓ 需要幫助？ | Need Help?

- 開一個 Issue 提問
- 在 Pull Request 中留言
- 查看現有的 Issues 和 PR 作為參考

## 🙏 感謝 | Thank You

每個貢獻都讓這個專案變得更好！感謝你的參與！

Every contribution makes this project better! Thank you for participating!

---

**Happy Contributing! 祝你貢獻愉快！** 🎉
