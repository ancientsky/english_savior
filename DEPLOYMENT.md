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
