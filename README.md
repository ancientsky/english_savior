# ⚔️ English Savior 英語救星 ⚔️

> 一個專為熱愛 Minecraft、Roblox 和 YouTube 的孩子設計的遊戲化英語學習平台
> A gamified English learning web app for kids who love Minecraft, Roblox, and YouTube

![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Framework](https://img.shields.io/badge/framework-Vanilla%20JS-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## 📖 專案簡介 | Project Overview

**English Savior** 將英語學習融入孩子們最喜愛的遊戲世界中！透過四種不同主題的遊戲模式，讓學習英語變得有趣且充滿動力。

**English Savior** transforms English learning into an engaging adventure inspired by popular games! Through four different game modes, learning English becomes fun and motivating.

## ✨ 特色功能 | Features

### 🎮 四大遊戲模式 | Four Game Modes

1. **⛏️ 挖礦學單字 (Minecraft Vocabulary)**
   - 像 Minecraft 一樣挖掘方塊收集字母
   - 將字母合成正確的英文單字
   - 三種難度等級：簡單、中等、困難
   - 每個單字都有圖示提示和中文解釋

2. **🏃 跑酷學文法 (Roblox Grammar)**
   - 像 Roblox Obby 一樣的跑酷闖關遊戲
   - 選擇正確的文法選項才能前進
   - 430+ 道題目，涵蓋 62 種文法主題
   - 即時回饋和詳細解釋

3. **📺 看片學英文 (YouTube Comprehension)**
   - 遊戲相關的英文影片腳本
   - 重點單字標註和中文解釋
   - 理解測驗檢驗學習成果
   - 真實情境的英語運用

4. **🦖 拼字跑酷 (Spelling Runner)**
   - Chrome Dino 風格的橫向捲軸遊戲
   - 跳躍收集正確字母拼出單字
   - 三種難度等級，速度與障礙物逐漸增加
   - HP 系統、粒子特效、畫面震動效果

### 🎯 遊戲化系統 | Gamification Features

- **經驗值與等級** - 完成任務賺取 XP，持續升級
- **寶石獎勵系統** - 累積寶石解鎖更多內容
- **寶石商店** - 使用寶石購買道具，提升學習效率
- **成就徽章** - 14 種成就等你解鎖
- **道具系統** - 收集各種遊戲道具
- **連續天數** - 追蹤學習連勝紀錄
- **每日任務** - 每天三個任務保持學習動力
- **音效系統** - 使用 Web Audio API 提供即時遊戲音效

### 💾 其他功能 | Additional Features

- **本地儲存** - 使用 localStorage 自動儲存進度
- **完全離線** - 無需網路連線即可使用
- **響應式設計** - 支援各種裝置螢幕
- **無需安裝** - 直接在瀏覽器中開啟即可使用
- **語音朗讀** - 支援 TTS 文字轉語音功能，練習單字發音

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
│   ├── youtube.css     # YouTube 主題樣式
│   └── spelling.css    # 拼字跑酷主題樣式
├── js/
│   ├── data/           # 學習內容資料（分類）
│   │   ├── vocab.js    # 單字庫（1,200+ 單字）
│   │   ├── grammar.js  # 文法題庫（430+ 題）
│   │   ├── video.js    # 影片課程（42 課）
│   │   └── game.js     # 成就、任務、道具、商店
│   ├── engine.js       # 遊戲引擎（XP、等級、成就、商店、Buff、儲存、音效）
│   ├── minecraft.js    # Minecraft 單字遊戲邏輯
│   ├── roblox.js       # Roblox 文法遊戲邏輯
│   ├── youtube.js      # YouTube 影片課程邏輯
│   ├── spelling.js     # 拼字跑酷遊戲邏輯（Canvas）
│   ├── daily.js        # 每日任務系統
│   ├── tts.js          # 文字轉語音模組
│   └── app.js          # 應用程式初始化與導航
├── reference/          # 參考資料
├── CLAUDE.md           # Claude Code 開發指南
├── CHANGELOG.md        # 更新日誌
├── CONTRIBUTING.md     # 貢獻指南
└── README.md           # 專案說明文件
```

## 🎓 學習內容 | Learning Content

### 單字庫 | Vocabulary Database
- **簡單難度**: 基礎遊戲相關單字
- **中等難度**: 進階詞彙
- **困難難度**: 高階詞彙
- **總計**: 1,200+ 個精選單字（涵蓋台灣國小英語 1000 字）

### 文法主題 | Grammar Topics
430+ 道題目，涵蓋 62 種重要文法概念：
- 基礎時態：現在簡單式、現在進行式、過去式、過去進行式、未來式
- 完成式：現在完成式、現在完成進行式、過去完成式、過去完成進行式、未來完成式
- 比較級、最高級
- 條件句（第一～第三條件句）、假設語氣
- 被動語態、關係子句、非限定關係子句
- 不定詞、動名詞、分詞構句
- 助動詞、情態動詞、使役動詞、感官動詞
- 連接詞、介系詞、冠詞、代名詞、反身代名詞、不定代名詞
- 間接引語、附和句、附加問句、感嘆句
- 片語動詞、名詞複數、所有格、-ing/-ed 形容詞等

### 影片課程 | Video Lessons
42 堂遊戲主題英文課程，含 126 道理解測驗題，主題包括：
- Minecraft 生存、挖礦、附魔、釀藥、農場、建築、終界龍
- Roblox 入門遊戲、安全交易、Blox Fruits、Adopt Me!、Obby 技巧
- YouTube 遊戲頻道經營等

## 🛠️ 技術架構 | Technology Stack

- **前端框架**: 純 JavaScript (Vanilla JS)
- **樣式**: CSS3 with CSS Variables
- **儲存**: LocalStorage API
- **音效**: Web Audio API（合成音效）
- **語音**: Web Speech API（TTS 文字轉語音）
- **繪圖**: Canvas 2D API（拼字跑酷遊戲）
- **字體**: Google Fonts (Press Start 2P, Noto Sans TC)
- **構建工具**: 無（免構建工具）
- **依賴項**: 零外部依賴

## 🎨 自訂內容 | Customization

### 新增單字 | Adding Vocabulary

編輯 `js/data/vocab.js`，在 `VOCAB_DATA` 中新增：

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

在 `js/data/grammar.js` 的 `GRAMMAR_DATA` 中新增：

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

在 `js/data/video.js` 的 `VIDEO_LESSONS` 中新增課程。

## 📊 遊戲數據系統 | Game Data System

### 儲存資料 | Saved Data
- 等級與經驗值
- 寶石數量
- 連續天數
- 已學單字列表
- 成就解鎖狀態
- 道具清單（消耗品效果）
- 每日任務進度
- 音效設定偏好

### 成就系統 | Achievement System
14 種成就類型：
- 學習里程碑（首個單字、10 個單字、50 個單字、100 個單字）
- 文法精通（首次通關、10 次通關、完美通關）
- 影片課程（完成首個影片）
- 等級獎勵（等級 5、等級 10）
- 連勝獎勵（3 天、7 天）
- 財富累積（100 寶石）
- 拼字跑酷（完成首個單字）

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


<!-- redeploy: 2026-07-06 tower game -->
