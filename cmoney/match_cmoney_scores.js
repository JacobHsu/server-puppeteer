const fs = require('fs');
const path = require('path');

/**
 * 從 cmoney_scores.json 提取分數大於 5 的股票，並與 histock_table_20250407.csv 中的股票名稱和價格信息結合
 */
async function matchCMoneyScores() {
  console.log('開始處理 CMoney 分數大於 5 的股票數據...');
  
  // 讀取 cmoney_scores.json
  const cmoneyScoresPath = path.resolve(__dirname, 'cmoney_scores.json');
  if (!fs.existsSync(cmoneyScoresPath)) {
    console.error('找不到 cmoney_scores.json 文件');
    return;
  }
  
  // 讀取 histock_table_20250407.csv
  const histockTablePath = path.resolve(__dirname, 'histock_table_20250407.csv');
  if (!fs.existsSync(histockTablePath)) {
    console.error('找不到 histock_table_20250407.csv 文件');
    return;
  }
  
  try {
    // 讀取 CMoney 分數
    const cmoneyScoresData = fs.readFileSync(cmoneyScoresPath, 'utf8');
    const cmoneyScores = JSON.parse(cmoneyScoresData);
    
    // 過濾分數大於 5 的股票
    const highScoreStocks = Object.entries(cmoneyScores)
      .filter(([_, score]) => parseInt(score) >= 5)
      .map(([code, score]) => ({ code, score }));
    
    console.log(`找到 ${highScoreStocks.length} 個分數大於等於 5 的股票`);
    
    // 讀取 histock 表格數據
    const histockData = fs.readFileSync(histockTablePath, 'utf8');
    const histockLines = histockData.split('\n');
    
    // 解析表頭
    const headers = histockLines[0].split(',');
    const codeIndex = headers.indexOf('代碼');
    const nameIndex = headers.indexOf('名稱');
    const priceIndex = headers.indexOf('價格');
    
    if (codeIndex === -1 || nameIndex === -1 || priceIndex === -1) {
      console.error('無法在 histock 表格中找到必要的列（代碼、名稱、價格）');
      return;
    }
    
    // 創建股票代碼到名稱和價格的映射
    const stockInfoMap = {};
    for (let i = 1; i < histockLines.length; i++) {
      const line = histockLines[i].trim();
      if (!line) continue;
      
      const columns = line.split(',');
      if (columns.length <= Math.max(codeIndex, nameIndex, priceIndex)) continue;
      
      const code = columns[codeIndex];
      const name = columns[nameIndex];
      const price = columns[priceIndex];
      
      stockInfoMap[code] = { name, price };
    }
    
    // 將高分數股票與 histock 數據結合
    const matchedStocks = [];
    const unmatchedStocks = [];
    
    for (const stock of highScoreStocks) {
      if (stockInfoMap[stock.code]) {
        matchedStocks.push({
          code: stock.code,
          name: stockInfoMap[stock.code].name,
          price: stockInfoMap[stock.code].price,
          score: stock.score
        });
      } else {
        unmatchedStocks.push(stock.code);
      }
    }
    
    console.log(`成功匹配了 ${matchedStocks.length} 個股票的名稱和價格`);
    if (unmatchedStocks.length > 0) {
      console.log(`有 ${unmatchedStocks.length} 個股票無法匹配: ${unmatchedStocks.join(', ')}`);
    }
    
    // 按照分數降序排序
    matchedStocks.sort((a, b) => parseInt(b.score) - parseInt(a.score));
    
    // 生成 CSV 文件
    const outputCsvPath = path.resolve(__dirname, 'cmoney_high_scores_with_price.csv');
    let csvContent = '代碼,名稱,價格,分數\n';
    
    for (const stock of matchedStocks) {
      csvContent += `${stock.code},${stock.name},${stock.price},${stock.score}\n`;
    }
    
    fs.writeFileSync(outputCsvPath, csvContent);
    console.log(`已將結果保存到 ${outputCsvPath}`);
    
    // 生成 JSON 文件
    const outputJsonPath = path.resolve(__dirname, 'cmoney_high_scores_with_price.json');
    fs.writeFileSync(outputJsonPath, JSON.stringify(matchedStocks, null, 2));
    console.log(`已將結果保存到 ${outputJsonPath}`);
    
    return {
      matchedCount: matchedStocks.length,
      unmatchedCount: unmatchedStocks.length,
      csvPath: outputCsvPath,
      jsonPath: outputJsonPath
    };
  } catch (error) {
    console.error('處理數據時發生錯誤:', error);
    return null;
  }
}

// 執行主函數
matchCMoneyScores()
  .then(result => {
    if (result) {
      console.log('處理完成!');
      console.log(`共匹配了 ${result.matchedCount} 個高分數股票，無法匹配 ${result.unmatchedCount} 個`);
    } else {
      console.error('處理失敗');
    }
  })
  .catch(err => {
    console.error('程序執行出錯:', err);
  });
