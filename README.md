# ⚔️ English Savior 英語救星 ⚔️

> 一個專為熱愛 Minecraft、Roblox 和 YouTube 的孩子設計的遊戲化英語學習平台
> A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube

![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Framework](https://img.shields.io/badge/framework-Vanilla%20JS-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 📖 專案簡介 | Project Overview

**English Savior** 將英語學習融入孩子們最喜愛的遊戲世界中！透過三種不同主題的遊戲模式，讓學習英語變得有趣且充滿動力。

**English Savior** transforms English learning into an engaging adventure inspired by popular games! Through three different game modes, learning English becomes fun and motivating.

## ✨ 特色功能 | Features

### 🎮 三大遊戲模式 | Three Game Modes

1. **⛏️ 挖礦學單字 (Minecraft Vocabulary)**
   - 像 Minecraft 一樣挖掘方塊收集字母
   - 將字母合成正確的英文單字
   - 三種難度等級：簡單、中等、困難
   - 每個單字都有圖示提示和中文解釋

2. **🏃 跑酷學文法 (Roblox Grammar)**
   - 像 Roblox Obby 一樣的跑酷闖關遊戲
   - 選擇正確的文法選項才能前進
   - 涵蓋 20+ 種文法主題
   - 即時回饋和詳細解釋

3. **📺 看片學英文 (YouTube Comprehension)**
   - 遊戲相關的英文影片腳本
   - 重點單字標註和中文解釋
   - 理解測驗檢驗學習成果
   - 真實情境的英語運用

### 🎯 遊戲化系統 | Gamification Features

- **經驗值與等級** - 完成任務賺取 XP，持續升級
- **寶石獎勵系統** - 累積寶石解鎖更多內容
- **成就徽章** - 12 種成就等你解鎖
- **道具系統** - 收集各種遊戲道具
- **連續天數** - 追蹤學習連勝紀錄
- **每日任務** - 每天三個任務保持學習動力

### 💾 其他功能 | Additional Features

- **本地儲存** - 使用 localStorage 自動儲存進度
- **完全離線** - 無需網路連線即可使用
- **響應式設計** - 支援各種裝置螢幕
- **無需安裝** - 直接在瀏覽器中開啟即可使用

## 🚀 快速開始 | Quick Start

### 安裝方式 | Installation

```bash
# 1. Clone 專案
git clone https://github.com/ancientsky/english_savior.git

# 2. 進入專案目錄
cd english_savior

# 3. 用瀏覽器開啟 index.html
# 直接雙擊 index.html 或使用本地伺服器
```

### 使用本地伺服器 | Using Local Server (Optional)

```bash
# 使用 Python
python -m http.server 8000

# 使用 Node.js (需安裝 http-server)
npx http-server

# 使用 PHP
php -S localhost:8000
```

然後在瀏覽器開啟 `http://localhost:8000`

## 📁 專案結構 | Project Structure

```
english_savior/
├── index.html          # 主要 HTML 檔案
├── css/
│   ├── style.css       # 全域樣式與 UI 元件
│   ├── minecraft.css   # Minecraft 主題樣式
│   ├── roblox.css      # Roblox 主題樣式
│   └── youtube.css     # YouTube 主題樣式
├── js/
│   ├── data.js         # 所有學習內容資料
│   ├── engine.js       # 遊戲引擎（XP、等級、成就、儲存）
│   ├── minecraft.js    # Minecraft 單字遊戲邏輯
│   ├── roblox.js       # Roblox 文法遊戲邏輯
│   ├── youtube.js      # YouTube 影片課程邏輯
│   ├── daily.js        # 每日任務系統
│   └── app.js          # 應用程式初始化與導航
├── CLAUDE.md          # Claude Code 開發指南
└── README.md          # 專案說明文件
```

## 🎓 學習內容 | Learning Content

### 單字庫 | Vocabulary Database
- **簡單難度**: 15 個基礎遊戲相關單字
- **中等難度**: 15 個進階詞彙
- **困難難度**: 15 個高階詞彙
- **總計**: 45+ 個精選單字

### 文法主題 | Grammar Topics
涵蓋 20 種重要文法概念：
- 現在簡單式、現在進行式、過去式
- 現在完成式、現在完成進行式
- 比較級、最高級
- 條件句、假設語氣
- 被動語態、關係子句
- 不定詞、連接詞等

### 影片課程 | Video Lessons
5 堂遊戲主題英文課程：
1. Minecraft 第一夜生存指南
2. Roblox 新手必玩遊戲
3. Minecraft 紅石基礎教學
4. Roblox 安全交易指南
5. Minecraft 建造你的第一棟房子

## 🛠️ 技術架構 | Technology Stack

- **前端框架**: 純 JavaScript (Vanilla JS)
- **樣式**: CSS3 with CSS Variables
- **儲存**: LocalStorage API
- **字體**: Google Fonts (Press Start 2P, Noto Sans TC)
- **構建工具**: 無（免構建工具）
- **依賴項**: 零外部依賴

## 🎨 自訂內容 | Customization

### 新增單字 | Adding Vocabulary

編輯 `js/data.js`，在 `VOCAB_DATA` 中新增：

```javascript
const VOCAB_DATA = {
  easy: [
    {
      word: 'JUMP',
      hint: '🦘',
      zh: '跳躍 — 按空白鍵跳起來',
      sentence: 'Press space to _____.'
    },
    // ... 更多單字
  ]
};
```

### 新增文法題 | Adding Grammar Questions

在 `js/data.js` 的 `GRAMMAR_DATA` 中新增：

```javascript
const GRAMMAR_DATA = [
  {
    sentence: 'I _____ playing Minecraft right now.',
    blank: 'am',
    options: ['am', 'is', 'are', 'was'],
    explain: '主詞是 I，現在進行式用 am + V-ing',
    topic: '現在進行式'
  },
  // ... 更多題目
];
```

### 新增影片課程 | Adding Video Lessons

在 `js/data.js` 的 `VIDEO_LESSONS` 中新增課程。

## 📊 遊戲數據系統 | Game Data System

### 儲存資料 | Saved Data
- 等級與經驗值
- 寶石數量
- 連續天數
- 已學單字列表
- 成就解鎖狀態
- 道具清單
- 每日任務進度

### 成就系統 | Achievement System
12 種成就類型：
- 學習里程碑（首個單字、10 個單字、50 個單字）
- 文法精通（首次通關、10 次通關、完美通關）
- 等級獎勵（等級 5、等級 10）
- 連勝獎勵（3 天、7 天）
- 財富累積（100 寶石）

## 🤝 貢獻指南 | Contributing

歡迎貢獻！請遵循以下步驟：

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 開發建議 | Development Guidelines
- 保持程式碼簡潔易讀
- 新增功能時請更新相關文件
- 確保跨瀏覽器相容性
- 遵循現有的程式碼風格

## 📝 授權條款 | License

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝 | Acknowledgments

- 感謝所有熱愛學習英語的孩子們
- 靈感來源：Minecraft、Roblox 遊戲社群
- 字體：Google Fonts
- 開發工具：Claude Code

## 📮 聯絡方式 | Contact

有任何問題或建議？歡迎開 Issue 或 Pull Request！

---

**Made with ❤️ for young English learners**

**用 ❤️ 為年輕的英語學習者打造**
