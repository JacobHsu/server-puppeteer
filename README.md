# server-puppeteer

使用 Puppeteer 爬取網站表格數據並保存為 CSV 或 JSON 格式的工具。

## 功能

- 爬取 [HiStock](https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt) 網站的表格數據
- 爬取 [StatementDog](https://statementdog.com/analysis) 網站的股票健診分數
- 爬取台灣所有上市上櫃公司的股票代號清單
- 自動將數據保存為 CSV 或 JSON 格式
- 文件名包含日期，便於區分不同時間的數據
- 支持批量處理大量股票代號
- 自動跳過已爬取的股票，支持斷點續爬

## 安裝

```bash
# 安裝依賴
npm install
```

## 使用方法

### 爬取 HiStock 表格數據

```bash
# 運行 HiStock 爬蟲腳本
npm start
# 或者直接運行
node histock-scraper.js
```

運行後，腳本將自動：
1. 訪問 HiStock 網站
2. 提取表格數據
3. 將數據保存為 CSV 文件（格式為 `histock_table_YYYYMMDD.csv`）

### 爬取台灣股票代號清單

```bash
# 運行股票清單爬蟲腳本
node get-tw-stock-list.js
```

運行後，腳本將自動：
1. 訪問 HiStock 網站
2. 提取所有四位數的台灣股票代號
3. 將股票代號清單保存為 `tw_stocks.txt` 文件

### 爬取 StatementDog 股票健診分數

```bash
# 運行 StatementDog 爬蟲腳本，使用指定的股票代號清單
node statementdog-scraper.js tw_stocks.txt

# 可選：指定批次大小和延遲時間（秒）
node statementdog-scraper.js tw_stocks.txt 20 10000
```

運行後，腳本將自動：
1. 讀取指定文件中的股票代號清單
2. 分批爬取每個股票的健診分數
3. 將結果保存為 JSON 文件（格式為 `statementdog_health_check_results.json`）
4. 每爬取一個股票就更新一次結果文件，支持斷點續爬

## 文件說明

- `histock-scraper.js` - 爬取 HiStock 網站表格數據的腳本
- `get-tw-stock-list.js` - 爬取台灣所有上市上櫃公司股票代號的腳本
- `statementdog-scraper.js` - 爬取 StatementDog 網站股票健診分數的腳本
- `tw_stocks.txt` - 台灣所有四位數股票代號的清單
- `test_stocks.txt` - 測試用的少量股票代號清單
- `statementdog_health_check_results.json` - 股票健診分數結果
- `package.json` - 項目依賴配置

## 依賴

- [puppeteer](https://github.com/puppeteer/puppeteer) - 用於控制 Chrome 瀏覽器的 Node.js 庫
- [fs](https://nodejs.org/api/fs.html) - Node.js 內置的文件系統模塊
- [path](https://nodejs.org/api/path.html) - Node.js 內置的路徑處理模塊

## 注意事項

1. 爬取大量股票時，建議先使用測試清單確認腳本正常工作，再處理全部股票。
2. StatementDog 網站可能需要登錄才能查看完整數據，腳本會嘗試提取不登錄情況下可見的數據。
3. 爬取過程中請勿關閉自動打開的瀏覽器窗口。
4. 如果遇到網絡問題或其他錯誤，可以重新運行腳本，它會自動跳過已爬取的股票。