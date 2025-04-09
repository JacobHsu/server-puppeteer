const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 爬取 CMoney 網站的綜合平均分數
 * URL: https://www.cmoney.tw/forum/stock/{stockCode}?s=technical-analysis
 */
async function scrapeCMoneyScore(stockCode) {
  console.log(`開始爬取 ${stockCode} 的 CMoney 綜合平均分數...`);
  
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: false, // 設置為 false 可以看到瀏覽器界面，方便調試
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    // 創建新頁面
    const page = await browser.newPage();
    
    // 設置視窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 導航到目標網站
    console.log(`正在訪問 ${stockCode} 的 CMoney 頁面...`);
    await page.goto(`https://www.cmoney.tw/forum/stock/${stockCode}?s=technical-analysis`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待頁面加載完成
    await page.waitForTimeout(5000);
    
    // 提取綜合平均分數
    console.log('正在提取綜合平均分數...');
    const score = await page.evaluate(() => {
      // 使用正確的選擇器提取分數
      const scoreElement = document.querySelector('.statistic__text--scoreLg');
      if (scoreElement) {
        return scoreElement.textContent.trim();
      }
      
      return null;
    });
    
    // 如果沒有找到分數，嘗試截圖保存，方便後續分析
    if (!score) {
      await page.screenshot({ path: `${stockCode}_screenshot.png` });
      console.log(`已保存 ${stockCode} 的頁面截圖，用於分析`);
    }
    
    if (score) {
      console.log(`成功提取到 ${stockCode} 的綜合平均分數: ${score}`);
      return {
        success: true,
        stockCode,
        score
      };
    } else {
      console.log(`未能提取到 ${stockCode} 的綜合平均分數`);
      return {
        success: false,
        stockCode,
        error: '未找到綜合平均分數'
      };
    }
  } catch (error) {
    console.error(`爬取 ${stockCode} 時發生錯誤:`, error);
    return {
      success: false,
      stockCode,
      error: error.message
    };
  } finally {
    // 關閉瀏覽器
    await browser.close();
    console.log(`${stockCode} 爬取完成，瀏覽器已關閉`);
  }
}

/**
 * 批量爬取多個股票的綜合平均分數
 * @param {Array} stockCodes 股票代碼數組
 * @param {Number} batchSize 每批處理的股票數量
 * @param {Number} batchDelay 批次之間的延遲時間（毫秒）
 */
async function batchScrapeStocks(stockCodes, batchSize = 5, batchDelay = 3000) {
  console.log(`開始批量爬取 ${stockCodes.length} 個股票的 CMoney 綜合平均分數...`);
  console.log(`批次大小: ${batchSize}, 批次間延遲: ${batchDelay}ms`);
  
  // 結果文件路徑
  const resultFile = 'cmoney_scores.json';
  
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
        const result = await scrapeCMoneyScore(stockCode);
        
        if (result.success) {
          // 將分數保存為字符串格式
          const scoreStr = result.score.toString();
          // 只取整數部分（如果分數是小數）
          const intScore = scoreStr.split('.')[0];
          existingResults[stockCode] = intScore;
        } else {
          existingResults[stockCode] = "N/A";
          console.error(`爬取 ${stockCode} 失敗: ${result.error}`);
        }
        
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
  
  console.log(`所有批次處理完成，共爬取了 ${Object.keys(existingResults).length} 個股票的綜合平均分數`);
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

/**
 * 主函數
 */
async function main() {
  // 從命令行參數獲取文件路徑，如果沒有提供，則使用默認路徑
  const stockListFile = process.argv[2] || 'tw_stocks/score6_stocks.txt';
  
  console.log(`使用股票清單文件: ${stockListFile}`);
  
  // 讀取股票代號清單
  const stockCodes = readStockCodesFromFile(stockListFile);
  
  if (stockCodes.length === 0) {
    console.error('沒有找到有效的股票代號，程序終止');
    return;
  }
  
  // 批量爬取股票數據
  const result = await batchScrapeStocks(stockCodes);
  
  if (result.success) {
    console.log(`爬取完成，結果已保存到 ${result.fileName}`);
  } else {
    console.error('爬取過程中發生錯誤');
  }
}

// 執行主函數
main().catch(err => {
  console.error('程序執行出錯:', err);
});
