const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 爬取StatementDog網站的股票健診分數
 * URL: https://statementdog.com/analysis/{stockCode}/stock-health-check
 */
async function scrapeStatementDogHealthCheck(stockCode, existingResults = {}) {
  console.log(`開始爬取 ${stockCode} 的股票健診數據...`);
  
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: false, // 設置為true可以隱藏瀏覽器界面
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    // 創建新頁面
    const page = await browser.newPage();
    
    // 設置視窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 導航到目標網站
    console.log('正在訪問網站...');
    await page.goto(`https://statementdog.com/analysis/${stockCode}/stock-health-check`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待頁面加載完成
    await page.waitForTimeout(3000);
    
    // 檢查是否需要登錄
    const loginRequired = await page.evaluate(() => {
      return document.querySelector('body').textContent.includes('請確認輸入的股票名稱或代號是否正確') ||
             document.querySelector('body').textContent.includes('點我繼續');
    });
    
    if (loginRequired) {
      console.log('需要登錄才能查看完整數據，嘗試提取可見的數據...');
    }
    
    // 提取健診分數數據
    console.log('正在提取健診分數數據...');
    const healthScores = await page.evaluate(() => {
      const scores = {};
      
      // 尋找所有帶有特定類名的分數元素
      const scoreElements = document.querySelectorAll('.stock-health-check-module-score-number-highlight');
      const titleElements = document.querySelectorAll('.stock-health-check-module-title');
      
      // 如果找到分數元素，提取分數
      if (scoreElements.length > 0 && titleElements.length > 0) {
        for (let i = 0; i < scoreElements.length; i++) {
          const title = titleElements[i] ? titleElements[i].textContent.trim() : `分數${i+1}`;
          const score = scoreElements[i].textContent.trim();
          scores[title] = score;
        }
      }
      
      return scores;
    });
    
    // 將結果添加到現有結果中
    if (Object.keys(healthScores).length > 0) {
      console.log(`成功提取到 ${stockCode} 的健診分數:`, healthScores);
      
      // 將分數保存到結果對象中
      if (healthScores["排除地雷股健診"]) {
        existingResults[stockCode] = healthScores["排除地雷股健診"];
      } else {
        const firstScore = Object.values(healthScores)[0];
        existingResults[stockCode] = firstScore || "N/A";
      }
    } else {
      console.log(`未能提取到 ${stockCode} 的健診分數`);
      existingResults[stockCode] = "N/A";
    }
    
    return {
      success: true,
      data: existingResults
    };
  } catch (error) {
    console.error(`爬取 ${stockCode} 時發生錯誤:`, error);
    existingResults[stockCode] = "ERROR";
    return {
      success: false,
      error: error.message,
      data: existingResults
    };
  } finally {
    // 關閉瀏覽器
    await browser.close();
    console.log(`${stockCode} 爬取完成，瀏覽器已關閉`);
  }
}

/**
 * 批量爬取多個股票的健診分數
 * @param {Array} stockCodes 股票代碼數組
 * @param {Number} batchSize 每批處理的股票數量
 * @param {Number} batchDelay 批次之間的延遲時間（毫秒）
 */
async function batchScrapeStocks(stockCodes, batchSize = 10, batchDelay = 5000) {
  console.log(`開始批量爬取 ${stockCodes.length} 個股票的健診數據...`);
  console.log(`批次大小: ${batchSize}, 批次間延遲: ${batchDelay}ms`);
  
  // 結果文件路徑
  const resultFile = 'statementdog_health_check_results.json';
  
  // 檢查是否存在結果文件，如果存在則讀取
  let existingResults = {};
  if (fs.existsSync(resultFile)) {
    try {
      const fileContent = fs.readFileSync(resultFile, 'utf8');
      existingResults = JSON.parse(fileContent);
      console.log(`已從 ${resultFile} 讀取到 ${Object.keys(existingResults).length} 個股票的結果`);
    } catch (error) {
      console.error(`讀取結果文件時出錯: ${error.message}`);
    }
  }
  
  // 過濾掉已經爬取過的股票代碼
  const stocksToScrape = stockCodes.filter(code => !existingResults[code]);
  console.log(`需要爬取的股票數量: ${stocksToScrape.length}`);
  
  // 如果所有股票都已爬取，直接返回結果
  if (stocksToScrape.length === 0) {
    console.log('所有股票都已爬取，無需再次爬取');
    return {
      success: true,
      data: existingResults,
      fileName: resultFile
    };
  }
  
  // 將股票代碼分批
  const batches = [];
  for (let i = 0; i < stocksToScrape.length; i += batchSize) {
    batches.push(stocksToScrape.slice(i, i + batchSize));
  }
  
  console.log(`共分為 ${batches.length} 批進行爬取`);
  
  // 逐批處理
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`正在處理第 ${i+1}/${batches.length} 批，包含 ${batch.length} 個股票`);
    
    for (const stockCode of batch) {
      try {
        const result = await scrapeStatementDogHealthCheck(stockCode, existingResults);
        
        // 每爬取一個股票就更新一次結果文件
        fs.writeFileSync(resultFile, JSON.stringify(existingResults, null, 2));
        console.log(`已將 ${stockCode} 的結果保存到 ${resultFile}`);
      } catch (error) {
        console.error(`爬取 ${stockCode} 時發生錯誤:`, error);
        existingResults[stockCode] = "ERROR";
        fs.writeFileSync(resultFile, JSON.stringify(existingResults, null, 2));
      }
    }
    
    // 如果不是最後一批，等待指定時間再處理下一批
    if (i < batches.length - 1) {
      console.log(`第 ${i+1} 批處理完成，等待 ${batchDelay}ms 後處理下一批...`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  console.log(`所有批次處理完成，共爬取了 ${Object.keys(existingResults).length} 個股票的健診數據`);
  return {
    success: true,
    data: existingResults,
    fileName: resultFile
  };
}

/**
 * 從文件中讀取股票代號清單
 * @param {string} filePath 文件路徑
 * @returns {Array} 股票代碼數組
 */
function readStockCodesFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`文件 ${filePath} 不存在`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stockCodes = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`從 ${filePath} 讀取到 ${stockCodes.length} 個股票代號`);
    return stockCodes;
  } catch (error) {
    console.error(`讀取股票代號文件時出錯: ${error.message}`);
    return [];
  }
}

// 主函數
async function main() {
  // 從命令行參數獲取股票代碼文件路徑，默認為 tw_stocks.txt
  const stockCodesFile = process.argv[2] || 'tw_stocks.txt';
  
  // 從命令行參數獲取批次大小和延遲時間
  const batchSize = parseInt(process.argv[3]) || 10;
  const batchDelay = parseInt(process.argv[4]) || 5000;
  
  // 讀取股票代號清單
  const stockCodes = readStockCodesFromFile(stockCodesFile);
  
  if (stockCodes.length === 0) {
    console.log('未找到股票代號，將使用默認股票代號 2330');
    stockCodes.push('2330');
  }
  
  // 執行批量爬蟲
  try {
    const result = await batchScrapeStocks(stockCodes, batchSize, batchDelay);
    if (result.success) {
      console.log(`成功爬取了 ${Object.keys(result.data).length} 個股票的健診數據，保存到 ${result.fileName}`);
    }
  } catch (error) {
    console.error('批量爬蟲過程中發生錯誤:', error);
  }
}

// 執行主函數
main().catch(err => {
  console.error('程序執行出錯:', err);
});
