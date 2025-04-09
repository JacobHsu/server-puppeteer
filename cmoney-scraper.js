const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 爬取CMoney網站的綜合平均分數
 * URL: https://www.cmoney.tw/forum/stock/{stockCode}?s=technical-analysis
 */
async function scrapeCMoneyScore(stockCode, existingResults = {}) {
  console.log(`開始爬取 ${stockCode} 的CMoney綜合平均分數...`);
  
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: true, // 設置為true可以隱藏瀏覽器界面
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // 創建新頁面
    const page = await browser.newPage();
    
    // 設置視窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 導航到目標網站
    console.log(`正在訪問 ${stockCode} 的CMoney頁面...`);
    await page.goto(`https://www.cmoney.tw/forum/stock/${stockCode}?s=technical-analysis`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待頁面加載完成
    await page.waitForTimeout(5000);
    
    // 提取綜合平均分數
    console.log('正在提取綜合平均分數...');
    const score = await page.evaluate(() => {
      // 方法1: 嘗試直接查找包含"綜合平均"文字的元素
      const allElements = Array.from(document.querySelectorAll('div, span, p'));
      for (const el of allElements) {
        if (el.textContent && el.textContent.includes('綜合平均')) {
          // 找到包含分數的元素，通常是附近的元素
          const scoreText = el.textContent.trim();
          // 提取數字
          const match = scoreText.match(/綜合平均[：:]\s*(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
          
          // 如果在當前元素中沒找到數字，檢查相鄰元素
          const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
          for (const sibling of siblings) {
            if (sibling !== el && /^\d+$/.test(sibling.textContent.trim())) {
              return sibling.textContent.trim();
            }
          }
        }
      }
      
      // 方法2: 嘗試查找特定的分數元素
      const scoreElements = document.querySelectorAll('[class*="score"]');
      for (const el of scoreElements) {
        if (el.textContent && /^\d+$/.test(el.textContent.trim())) {
          return el.textContent.trim();
        }
      }
      
      // 方法3: 嘗試查找技術分析區域中的分數
      const techAnalysisSection = document.querySelector('[class*="tech"]') || 
                                 document.querySelector('[id*="tech"]');
      if (techAnalysisSection) {
        const scoreEl = techAnalysisSection.querySelector('[class*="score"]');
        if (scoreEl && /\d+/.test(scoreEl.textContent)) {
          const match = scoreEl.textContent.match(/(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      
      return null;
    });
    
    // 將結果添加到現有結果中
    if (score) {
      console.log(`成功提取到 ${stockCode} 的綜合平均分數: ${score}`);
      existingResults[stockCode] = score;
    } else {
      console.log(`未能提取到 ${stockCode} 的綜合平均分數，嘗試截圖分析...`);
      
      // 如果無法提取到分數，保存頁面截圖以便後續分析
      const screenshotPath = `cmoney_${stockCode}_screenshot.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`已保存頁面截圖到 ${screenshotPath}`);
      
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
 * 批量爬取多個股票的綜合平均分數
 * @param {Array} stockCodes 股票代碼數組
 * @param {Number} batchSize 每批處理的股票數量
 * @param {Number} batchDelay 批次之間的延遲時間（毫秒）
 */
async function batchScrapeStocks(stockCodes, batchSize = 5, batchDelay = 3000) {
  console.log(`開始批量爬取 ${stockCodes.length} 個股票的CMoney綜合平均分數...`);
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
        const result = await scrapeCMoneyScore(stockCode, existingResults);
        
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
    
    // 嘗試解析JSON格式
    try {
      const jsonData = JSON.parse(content);
      if (Array.isArray(jsonData)) {
        return jsonData;
      } else if (typeof jsonData === 'object') {
        return Object.keys(jsonData);
      }
    } catch (e) {
      // 不是JSON格式，繼續嘗試其他格式
    }
    
    // 嘗試解析文本格式（每行一個股票代碼）
    const stockCodes = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`從 ${filePath} 讀取到 ${stockCodes.length} 個股票代號`);
    return stockCodes;
  } catch (error) {
    console.error(`讀取文件 ${filePath} 時出錯:`, error);
    return [];
  }
}

/**
 * 主函數
 */
async function main() {
  // 檢查命令行參數
  const args = process.argv.slice(2);
  
  // 如果有提供股票代號作為參數
  if (args.length > 0) {
    const stockCode = args[0];
    console.log(`使用命令行參數提供的股票代號: ${stockCode}`);
    
    const result = await scrapeCMoneyScore(stockCode, {});
    console.log('爬取結果:', result.data);
    
    fs.writeFileSync('cmoney_scores.json', JSON.stringify(result.data, null, 2));
    console.log('結果已保存到 cmoney_scores.json');
  } 
  // 否則，嘗試從文件中讀取股票代號
  else {
    // 嘗試從不同的文件中讀取股票代號
    const stockFilePaths = [
      'tw_stocks/score6_stocks.txt',
      'tw_stocks/score6_stocks.json',
      'tw_stocks.txt'
    ];
    
    let stockCodes = [];
    
    for (const filePath of stockFilePaths) {
      if (fs.existsSync(filePath)) {
        stockCodes = readStockCodesFromFile(filePath);
        console.log(`使用 ${filePath} 中的股票代號`);
        break;
      }
    }
    
    if (stockCodes.length === 0) {
      console.log('未找到股票代號文件，使用默認股票代號 2485');
      stockCodes = ['2485'];
    }
    
    const result = await batchScrapeStocks(stockCodes);
    console.log(`爬取完成，結果已保存到 ${result.fileName}`);
  }
}

// 執行主函數
main().catch(err => {
  console.error('程序執行出錯:', err);
});