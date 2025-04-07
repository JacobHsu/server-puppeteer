# server-puppeteer

使用 Puppeteer 爬取網站表格數據並保存為 CSV 格式的工具。

## 功能

- 爬取 [HiStock](https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt) 網站的表格數據
- 自動將數據保存為 CSV 格式
- 文件名包含日期，便於區分不同時間的數據

## 安裝

```bash
# 安裝依賴
npm install
```

## 使用方法

```bash
# 運行爬蟲腳本
npm start
```

運行後，腳本將自動：
1. 訪問 HiStock 網站
2. 提取表格數據
3. 將數據保存為 CSV 文件（格式為 `histock_table_YYYYMMDD.csv`）

## 文件說明

- `histock-scraper.js` - 主要的爬蟲腳本
- `package.json` - 項目依賴配置

## 依賴

- [Puppeteer](https://pptr.dev/) - 用於控制 Chrome 瀏覽器的 Node.js 庫