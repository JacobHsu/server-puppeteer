const fs = require('fs');
const path = require('path');

/**
 * 從CSV文件中查找分數為6的股票的名稱和價格
 */
function matchScore6Stocks() {
  // 文件路徑
  const score6File = 'tw_stocks/score6_stocks.txt';
  const histockFile = 'histock_table_20250407.csv';
  const outputFile = 'score6_stocks_with_price.csv';
  
  console.log(`開始從 ${histockFile} 中查找分數為6的股票信息...`);
  
  try {
    // 檢查文件是否存在
    if (!fs.existsSync(score6File)) {
      console.error(`文件 ${score6File} 不存在`);
      return;
    }
    
    if (!fs.existsSync(histockFile)) {
      console.error(`文件 ${histockFile} 不存在`);
      return;
    }
    
    // 讀取分數為6的股票代號
    const score6Content = fs.readFileSync(score6File, 'utf8');
    const score6Stocks = score6Content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`從 ${score6File} 讀取到 ${score6Stocks.length} 個分數為6的股票代號`);
    
    // 讀取HiStock表格數據
    const histockContent = fs.readFileSync(histockFile, 'utf8');
    const histockLines = histockContent.split('\n');
    
    // 解析表頭
    const headers = histockLines[0].split(',');
    const codeIndex = headers.indexOf('代碼');
    const nameIndex = headers.indexOf('名稱');
    const priceIndex = headers.indexOf('價格');
    
    if (codeIndex === -1 || nameIndex === -1 || priceIndex === -1) {
      console.error('無法在CSV文件中找到必要的列（代碼、名稱或價格）');
      return;
    }
    
    // 創建股票代號到名稱和價格的映射
    const stockMap = {};
    for (let i = 1; i < histockLines.length; i++) {
      const line = histockLines[i].trim();
      if (line.length === 0) continue;
      
      const values = line.split(',');
      if (values.length <= Math.max(codeIndex, nameIndex, priceIndex)) continue;
      
      const code = values[codeIndex].trim();
      const name = values[nameIndex].trim();
      const price = values[priceIndex].trim();
      
      stockMap[code] = { name, price };
    }
    
    console.log(`從 ${histockFile} 讀取到 ${Object.keys(stockMap).length} 個股票信息`);
    
    // 匹配分數為6的股票
    const matchedStocks = [];
    const notFoundStocks = [];
    
    for (const stockCode of score6Stocks) {
      if (stockMap[stockCode]) {
        matchedStocks.push({
          code: stockCode,
          name: stockMap[stockCode].name,
          price: stockMap[stockCode].price
        });
      } else {
        notFoundStocks.push(stockCode);
      }
    }
    
    console.log(`成功匹配到 ${matchedStocks.length} 個股票的名稱和價格`);
    if (notFoundStocks.length > 0) {
      console.log(`有 ${notFoundStocks.length} 個股票未找到對應信息`);
    }
    
    // 將結果保存到CSV文件
    const outputContent = [
      '代碼,名稱,價格',
      ...matchedStocks.map(stock => `${stock.code},${stock.name},${stock.price}`)
    ].join('\n');
    
    fs.writeFileSync(outputFile, outputContent);
    console.log(`已將結果保存到 ${outputFile}`);
    
    // 將結果保存到JSON文件，方便程式讀取
    const jsonOutputFile = 'score6_stocks_with_price.json';
    fs.writeFileSync(jsonOutputFile, JSON.stringify(matchedStocks, null, 2));
    console.log(`已將結果保存到 ${jsonOutputFile}`);
    
    return {
      success: true,
      matched: matchedStocks.length,
      notFound: notFoundStocks.length,
      stocks: matchedStocks
    };
  } catch (error) {
    console.error('處理過程中發生錯誤:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 執行匹配函數
const result = matchScore6Stocks();
if (result && result.success) {
  console.log(`成功匹配了 ${result.matched} 個分數為6的股票的名稱和價格`);
  
  // 顯示前10個匹配到的股票（如果有）
  if (result.stocks.length > 0) {
    const previewCount = Math.min(10, result.stocks.length);
    console.log(`前 ${previewCount} 個匹配到的股票:`);
    for (let i = 0; i < previewCount; i++) {
      const stock = result.stocks[i];
      console.log(`${stock.code} - ${stock.name}: ${stock.price}`);
    }
  }
} else if (result) {
  console.error(`匹配失敗: ${result.error}`);
}
