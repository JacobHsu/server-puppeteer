const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * 爬取台灣所有上市上櫃公司的股票代號清單
 */
async function getTaiwanStockList() {
  console.log('開始爬取台灣股票清單...');
  
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: false, // 設置為true可以隱藏瀏覽器界面
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const stockList = [];
  
  try {
    // 創建新頁面
    const page = await browser.newPage();
    
    // 設置視窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 使用 HiStock 網站的股票清單
    console.log('正在爬取股票清單...');
    await page.goto('https://histock.tw/stock/rank.aspx?m=4&d=0&p=all', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待表格加載完成
    await page.waitForSelector('#CPHB1_gv');
    
    // 提取股票代號
    const stocks = await page.evaluate(() => {
      const stockCodes = [];
      const rows = document.querySelectorAll('#CPHB1_gv tr:not(.title)');
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length > 0) {
          const stockCode = cells[0].textContent.trim();
          // 只保留四位數的股票代號
          if (/^[0-9]{4}$/.test(stockCode)) {
            stockCodes.push(stockCode);
          }
        }
      }
      
      return stockCodes;
    });
    
    console.log(`爬取到 ${stocks.length} 個四位數股票代號`);
    stockList.push(...stocks);
    
    // 保存結果到文件
    const outputFile = 'tw_stocks.txt';
    const content = stockList.join('\n');
    fs.writeFileSync(outputFile, content);
    
    console.log(`共爬取到 ${stockList.length} 個四位數股票代號，已保存到 ${outputFile}`);
    
    return {
      success: true,
      count: stockList.length,
      fileName: outputFile
    };
  } catch (error) {
    console.error('爬取過程中發生錯誤:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 關閉瀏覽器
    await browser.close();
    console.log('瀏覽器已關閉');
  }
}

// 執行爬蟲函數
getTaiwanStockList()
  .then(result => {
    if (result.success) {
      console.log(`成功爬取了 ${result.count} 個四位數股票代號，保存到 ${result.fileName}`);
    } else {
      console.error(`爬取失敗: ${result.error}`);
    }
  })
  .catch(err => {
    console.error('程序執行出錯:', err);
  });
