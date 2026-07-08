# 部署指南 | Deployment Guide

本文件說明如何將 English Savior 部署到各種平台。

This document explains how to deploy English Savior to various platforms.

## 📦 部署前準備 | Pre-deployment Checklist

- [ ] 確認所有檔案都已提交到 Git
- [ ] 測試所有功能正常運作
- [ ] 檢查瀏覽器 Console 沒有錯誤
- [ ] 確認響應式設計在不同裝置上正常

## 🚀 部署選項 | Deployment Options

### 1. GitHub Pages（推薦）

最簡單且免費的部署方式！

#### 步驟 | Steps:

```bash
# 1. 確保你的程式碼已推送到 GitHub
git push origin main

# 2. 到你的 GitHub 儲存庫設定
# Settings > Pages > Source > 選擇 main branch

# 3. 等待幾分鐘，網站就會發布在：
# https://你的用戶名.github.io/english_savior/
```

#### 優點 | Pros:
- ✅ 完全免費
- ✅ 自動 HTTPS
- ✅ 持續部署（推送即更新）
- ✅ 自訂網域支援

### 2. Netlify

功能強大的免費托管平台。

#### 步驟 | Steps:

1. 註冊 [Netlify](https://www.netlify.com/)
2. 點擊 "New site from Git"
3. 連接你的 GitHub 儲存庫
4. 部署設定：
   - Build command: (留空)
   - Publish directory: `/`
5. 點擊 "Deploy site"

#### 優點 | Pros:
- ✅ 免費 SSL
- ✅ 自動部署
- ✅ 表單處理
- ✅ 分析功能
- ✅ 自訂網域

### 3. Vercel

現代化的部署平台。

#### 步驟 | Steps:

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
cd english_savior
vercel

# 按照提示完成部署
```

或者直接從網頁介面：
1. 註冊 [Vercel](https://vercel.com/)
2. Import Git Repository
3. 選擇你的 GitHub 儲存庫
4. 點擊 Deploy

#### 優點 | Pros:
- ✅ 超快速度
- ✅ 自動 HTTPS
- ✅ 零配置
- ✅ 預覽部署

### 4. Cloudflare Pages

Cloudflare 的靜態網站托管服務。

#### 步驟 | Steps:

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Pages > Create a project
3. 連接 Git repository
4. 選擇 english_savior
5. 部署設定：
   - Build command: (留空)
   - Build output directory: `/`
6. Save and Deploy

#### 優點 | Pros:
- ✅ 全球 CDN
- ✅ 無限頻寬
- ✅ 快速部署
- ✅ Web Analytics

### 5. 傳統虛擬主機 | Traditional Web Hosting

如果你有自己的虛擬主機空間。

#### 步驟 | Steps:

```bash
# 1. 下載專案檔案
git clone https://github.com/你的用戶名/english_savior.git

# 2. 使用 FTP 上傳所有檔案到網站根目錄
# 或使用 cPanel File Manager 上傳

# 3. 確保檔案結構正確：
public_html/
├── index.html
├── css/
├── js/
└── ...
```

#### 支援的主機 | Compatible Hosting:
- ✅ 任何支援靜態 HTML 的主機
- ✅ Apache
- ✅ Nginx
- ✅ 不需要 PHP、Node.js 或資料庫

### 6. 本地伺服器 | Local Server

適合開發測試或內部網路使用。

#### Python 3:
```bash
cd english_savior
python -m http.server 8000
# 開啟 http://localhost:8000
```

#### Node.js:
```bash
npx http-server
# 或
npm install -g http-server
http-server -p 8000
```

#### PHP:
```bash
php -S localhost:8000
```

## 🔧 進階配置 | Advanced Configuration

### 自訂網域 | Custom Domain

#### GitHub Pages:
1. 在儲存庫根目錄建立 `CNAME` 檔案
2. 內容填入你的網域（如：`english.example.com`）
3. 在 DNS 設定 CNAME 記錄指向 `你的用戶名.github.io`

#### Netlify/Vercel:
1. 在儀表板中點擊 "Add custom domain"
2. 按照指示設定 DNS

### HTTPS 設定

所有推薦的平台都會自動提供免費 SSL 憑證：
- GitHub Pages: 自動啟用
- Netlify: Let's Encrypt 自動配置
- Vercel: 自動 HTTPS
- Cloudflare: 自動啟用

### 效能優化 | Performance Optimization

#### 啟用快取 | Enable Caching

在 `netlify.toml` 或 `vercel.json` 中設定：

**netlify.toml:**
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
```

**vercel.json:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 啟用壓縮 | Enable Compression

大部分平台會自動啟用 gzip/brotli 壓縮。

如果使用自己的伺服器，在 `.htaccess` 中加入：

```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>
```

## 📊 監控與分析 | Monitoring & Analytics

### Google Analytics

在 `index.html` 的 `</head>` 前加入：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Cloudflare Web Analytics

免費且注重隱私的分析工具，無需 Cookie。

1. 在 Cloudflare Dashboard 啟用 Web Analytics
2. 複製追蹤代碼貼到 `index.html`

## 🐛 疑難排解 | Troubleshooting

### 問題：頁面無法載入 CSS/JS

**解決方案：**
- 檢查檔案路徑是否正確
- 確認所有檔案都已上傳
- 清除瀏覽器快取

### 問題：LocalStorage 資料遺失

**說明：**
LocalStorage 是綁定網域的，如果更改網域會導致資料遺失。

**解決方案：**
提供匯入/匯出功能（未來更新）

### 問題：手機版顯示異常

**解決方案：**
- 確認 viewport meta tag 存在
- 測試不同裝置和瀏覽器
- 使用 Chrome DevTools 的裝置模擬

## 📝 部署檢查清單 | Deployment Checklist

部署前確認：

- [ ] 所有連結都正常運作
- [ ] 圖片和資源都能載入
- [ ] 在多個瀏覽器測試
- [ ] 測試手機版介面
- [ ] 檢查 Console 無錯誤
- [ ] LocalStorage 正常運作
- [ ] 所有遊戲模式都能玩
- [ ] 成就系統正常
- [ ] 每日任務正常重置

## 🔄 更新部署 | Updating Deployment

### Git-based 平台（推薦）

```bash
# 1. 修改程式碼
# 2. 提交變更
git add .
git commit -m "Update: 新功能或修復"

# 3. 推送到 GitHub
git push origin main

# 4. 平台會自動重新部署！
```

### 傳統主機

需要手動重新上傳變更的檔案。

## 🌐 CDN 加速 | CDN Acceleration

如果你的使用者分布全球，建議使用 CDN：

- GitHub Pages: 內建 CDN
- Netlify: 全球 CDN
- Vercel: Edge Network
- Cloudflare Pages: 全球 CDN

## 📱 PWA 支援（未來更新）

計劃中的功能：
- Service Worker
- 離線支援
- 安裝到主畫面
- 推播通知

---

## 🎉 完成！

選擇最適合你的部署方式，幾分鐘內就能讓 English Savior 上線！

有問題嗎？查看 [README.md](README.md) 或開 Issue 提問。

---

**Happy Deploying! 部署愉快！** 🚀

## Google 雲端同步設定（選用）

網站的「☁️ 存檔備份」內建 Google Drive 雲端同步，但需要站長先建立一個免費的
OAuth Client ID（約 10 分鐘，一次設定永久有效）。**沒設定也沒關係**——檔案匯出/
匯入功能永遠可用，只是 Google 登入區塊會隱藏。

設定步驟：

1. 打開 [Google Cloud Console](https://console.cloud.google.com/)，用你的 Google 帳號登入，
   建立一個新專案（名稱隨意，例如 `english-savior`）。
2. 左側選單「API 和服務 → 程式庫」，搜尋 **Google Drive API** → 點「啟用」。
3. 「API 和服務 → OAuth 同意畫面」：
   - User Type 選 **External（外部）** → 建立
   - 填入應用程式名稱（English Savior）、你的信箱 → 儲存
   - 「範圍（Scopes）」步驟可以直接跳過（程式會在登入時請求 `drive.appdata`，屬於非敏感範圍）
   - 完成後在「測試使用者」加入會用到的 Google 帳號（小孩的帳號）；
     或按「發布應用程式」讓所有帳號都能登入
4. 「API 和服務 → 憑證 → 建立憑證 → OAuth 用戶端 ID」：
   - 應用程式類型：**網頁應用程式**
   - 「已授權的 JavaScript 來源」加入：
     - `https://ancientsky.github.io`
     - `http://localhost:8000`（本機測試用，可省略）
   - 「已授權的重新導向 URI」**不用填**（本站使用 token client，不需要 redirect）
   - 建立後複製「用戶端 ID」（長得像 `1234567890-abc.apps.googleusercontent.com`）
5. 設定用戶端 ID —— 兩種方式擇一：

   **方式 A（推薦）：GitHub Actions 變數，不用改程式碼**
   1. 到 repo 的 **Settings → Pages → Build and deployment → Source**，
      改選 **GitHub Actions**（一次性切換；之後部署改由 `.github/workflows/deploy.yml` 執行，
      推 commit 到預設分支照樣自動部署，也可以在 Actions 頁面手動 Run workflow）
   2. 到 **Settings → Secrets and variables → Actions → Variables 分頁 →
      New repository variable**，名稱填 `GOOGLE_CLIENT_ID`、值貼上用戶端 ID
      （放 Variables 或 Secrets 都可以，workflow 兩邊都會讀；因為 Client ID
      本來就是公開資訊，建議放 Variables 方便查看）
   3. 之後每次部署，workflow 會自動把 ID 注入 `js/cloud.js` —— repo 原始碼保持乾淨

   **方式 B：直接寫進程式碼**
   打開 `js/cloud.js`，把用戶端 ID 貼進最上面的 `GOOGLE_CLIENT_ID = ''` 引號中，
   commit + 部署即可。

備註：
- 存檔放在使用者自己 Google 雲端硬碟的**隱藏應用程式資料夾（appDataFolder）**，
  使用者在雲端硬碟介面看不到這個檔案，本網站也只能存取這一個檔案（約 2 KB），
  完全碰不到使用者的其他檔案。
- Client ID 是公開資訊（會出現在網頁原始碼中），這是 OAuth 網頁應用的正常設計，
  不是秘密金鑰，可以放心 commit。

### 疑難排解

- **登入時出現 `Error 403: access_denied`**：OAuth 同意畫面還在「測試中（Testing）」
  狀態，只有「測試使用者」名單裡的帳號能登入。解法擇一：
  1. （推薦）「OAuth 同意畫面」→ 按 **發布應用程式（Publish App）** 改成正式版。
     本站只用 `drive.appdata` 非敏感範圍，不需要 Google 審核，按下去立即生效。
  2. 維持測試中，把要使用的 Google 帳號加入 **測試使用者（Test users）**（上限 100 個）。
- **登入視窗顯示「這個應用程式未經 Google 驗證」**：只會在使用敏感範圍時出現；
  本站的 `drive.appdata` 屬於非敏感範圍，正常情況不會看到。若看到，檢查同意畫面
  的範圍設定是否多加了其他 Drive 範圍。
- **`idpiframe_initialization_failed` 或 origin 錯誤**：檢查憑證的「已授權的
  JavaScript 來源」是否確實包含 `https://ancientsky.github.io`（不含路徑、結尾不加斜線）。
