const fs = require('fs');

/**
 * 將股票代號文件拆分成多個小文件，每個文件包含指定數量的股票代號
 */
function splitStockFile() {
  // 讀取原始股票代號文件
  const sourceFile = 'tw_stocks.txt';
  const stocksPerFile = 100;
  
  console.log(`開始將 ${sourceFile} 拆分為每個文件 ${stocksPerFile} 個股票代號...`);
  
  try {
    // 檢查文件是否存在
    if (!fs.existsSync(sourceFile)) {
      console.error(`文件 ${sourceFile} 不存在`);
      return;
    }
    
    // 讀取文件內容
    const content = fs.readFileSync(sourceFile, 'utf8');
    const stockCodes = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`從 ${sourceFile} 讀取到 ${stockCodes.length} 個股票代號`);
    
    // 計算需要創建的文件數量
    const fileCount = Math.ceil(stockCodes.length / stocksPerFile);
    console.log(`將創建 ${fileCount} 個文件`);
    
    // 拆分並保存到多個文件
    for (let i = 0; i < fileCount; i++) {
      const startIndex = i * stocksPerFile;
      const endIndex = Math.min((i + 1) * stocksPerFile, stockCodes.length);
      const batchStocks = stockCodes.slice(startIndex, endIndex);
      
      const outputFile = `tw_stocks${i + 1}.txt`;
      fs.writeFileSync(outputFile, batchStocks.join('\n'));
      
      console.log(`已創建文件 ${outputFile}，包含 ${batchStocks.length} 個股票代號 (${startIndex + 1} - ${endIndex})`);
    }
    
    console.log(`拆分完成，共創建了 ${fileCount} 個文件`);
  } catch (error) {
    console.error('拆分過程中發生錯誤:', error);
  }
}

// 執行拆分函數
splitStockFile();
