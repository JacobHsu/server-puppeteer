const fs = require('fs');

/**
 * 從健診結果文件中提取分數為6的股票代號
 */
function extractScore6Stocks() {
  // 讀取健診結果文件
  const resultFile = 'statementdog_health_check_results.json';
  const outputFile = 'score6_stocks.txt';
  
  console.log(`開始從 ${resultFile} 提取分數為6的股票...`);
  
  try {
    // 檢查文件是否存在
    if (!fs.existsSync(resultFile)) {
      console.error(`文件 ${resultFile} 不存在`);
      return;
    }
    
    // 讀取文件內容
    const content = fs.readFileSync(resultFile, 'utf8');
    const results = JSON.parse(content);
    
    // 篩選分數為6的股票
    const score6Stocks = Object.entries(results)
      .filter(([_, score]) => score === "6")
      .map(([stockCode, _]) => stockCode);
    
    console.log(`找到 ${score6Stocks.length} 個分數為6的股票`);
    
    // 保存到文件
    fs.writeFileSync(outputFile, score6Stocks.join('\n'));
    
    console.log(`已將分數為6的股票保存到 ${outputFile}`);
    
    // 創建一個包含股票代號和分數的JSON文件，方便查看
    const score6StocksJson = {};
    score6Stocks.forEach(stockCode => {
      score6StocksJson[stockCode] = "6";
    });
    
    fs.writeFileSync('score6_stocks.json', JSON.stringify(score6StocksJson, null, 2));
    console.log(`已將分數為6的股票保存到 score6_stocks.json`);
    
    return {
      success: true,
      count: score6Stocks.length,
      stocks: score6Stocks
    };
  } catch (error) {
    console.error('提取過程中發生錯誤:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 執行提取函數
const result = extractScore6Stocks();
if (result && result.success) {
  console.log(`成功提取了 ${result.count} 個分數為6的股票`);
  
  // 顯示前10個股票代號（如果有）
  if (result.stocks.length > 0) {
    const previewCount = Math.min(10, result.stocks.length);
    console.log(`前 ${previewCount} 個分數為6的股票: ${result.stocks.slice(0, previewCount).join(', ')}`);
  }
} else if (result) {
  console.error(`提取失敗: ${result.error}`);
}
