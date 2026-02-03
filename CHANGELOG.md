# 更新日誌 | Changelog

本文件記錄 English Savior 專案的所有重要變更。

All notable changes to the English Savior project will be documented in this file.

## [Unreleased]

### 計劃中的功能 | Planned Features
- 聲音效果系統
- 英文介面切換
- 深色/淺色主題
- 匯出學習報告
- 多人排行榜

---

## [1.0.0] - 2026-02-03

### 新增 | Added

#### 🎮 遊戲模式
- **Minecraft 單字合成遊戲**
  - 三種難度等級（簡單、中等、困難）
  - 45+ 個遊戲相關單字
  - 字母方塊點擊合成系統
  - 即時回饋和獎勵

- **Roblox 文法跑酷遊戲**
  - 20+ 個文法題目
  - 跑酷視覺化進度
  - 詳細文法解釋
  - 完美通關成就

- **YouTube 影片學習模式**
  - 5 堂主題課程
  - 互動式字幕腳本
  - 重點單字側邊欄
  - 理解測驗系統

#### 🎯 遊戲化系統
- 經驗值與等級系統
- 寶石獎勵機制
- 12 種成就徽章
- 8 種可收集道具
- 連續天數追蹤
- 每日任務系統（3 個任務）
- 升級動畫和獎勵
- Toast 通知系統

#### 💾 資料系統
- LocalStorage 自動儲存
- 學習進度追蹤
- 已學單字紀錄
- 成就解鎖狀態
- 每日任務進度
- 連勝天數計算

#### 🎨 使用者介面
- 響應式設計（手機/平板/桌面）
- 遊戲主題化介面
  - Minecraft 風格（綠色/方塊）
  - Roblox 風格（紅色/跑酷）
  - YouTube 風格（藍色/影片）
- HUD 頭部資訊欄
- 導航標籤系統
- 模態視窗（背包、成就）
- 統計數據儀表板

#### 📚 內容資料
- **單字庫**
  - 簡單：15 個單字
  - 中等：15 個單字
  - 困難：15 個單字

- **文法題庫**
  - 現在簡單式、進行式
  - 過去式、完成式
  - 比較級、最高級
  - 條件句、假設語氣
  - 被動語態、關係子句
  - 不定詞、連接詞等

- **影片課程**
  - Minecraft 第一夜生存
  - Roblox 新手遊戲推薦
  - Minecraft 紅石教學
  - Roblox 安全交易
  - Minecraft 建造房子

#### 📝 專案文件
- README.md（中英雙語）
- CONTRIBUTING.md（貢獻指南）
- LICENSE（MIT 授權）
- CLAUDE.md（開發指南）
- .gitignore（版本控制排除）

### 技術特點 | Technical Features
- 純 JavaScript（零依賴）
- 模組化設計
- 事件驅動架構
- CSS 變數主題系統
- Google Fonts 整合
- 離線可用（無需伺服器）

### 檔案結構 | File Structure
```
english_savior/
├── index.html
├── css/
│   ├── style.css (398 lines)
│   ├── minecraft.css (198 lines)
│   ├── roblox.css (177 lines)
│   └── youtube.css (192 lines)
├── js/
│   ├── data.js (352 lines)
│   ├── engine.js (240 lines)
│   ├── minecraft.js (129 lines)
│   ├── roblox.js (183 lines)
│   ├── youtube.js (120 lines)
│   ├── daily.js (40 lines)
│   └── app.js (54 lines)
└── docs/
    ├── README.md
    ├── CONTRIBUTING.md
    ├── LICENSE
    ├── CLAUDE.md
    └── CHANGELOG.md
```

### 統計數據 | Statistics
- 總程式碼行數：~1,900+ 行
- JavaScript 模組：7 個
- CSS 樣式表：4 個
- 學習內容項目：70+ 個
- 成就徽章：12 個
- 可收集道具：8 個

---

## 版本編號說明 | Version Numbering

本專案遵循 [語義化版本 2.0.0](https://semver.org/lang/zh-TW/)

版本格式：`主版本.次版本.修訂號`

- **主版本**：不相容的 API 變更
- **次版本**：向下相容的功能新增
- **修訂號**：向下相容的問題修正

---

## 連結 | Links

- [專案首頁](https://github.com/ancientsky/english_savior)
- [問題回報](https://github.com/ancientsky/english_savior/issues)
- [Pull Requests](https://github.com/ancientsky/english_savior/pulls)

---

**[Unreleased]**: 尚未發布的變更
**[1.0.0]**: 首次正式發布 - 2026-02-03
