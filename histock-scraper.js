const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 爬取HiStock網站表格數據並保存為CSV
 * URL: https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt
 */
async function scrapeHistockTable() {
  console.log('開始爬取HiStock表格數據...');
  
  // 啟動瀏覽器
  const browser = await puppeteer.launch({
    headless: true, // 設置為false可以看到瀏覽器界面
  });
  
  try {
    // 創建新頁面
    const page = await browser.newPage();
    
    // 設置視窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 導航到目標網站
    console.log('正在訪問網站...');
    await page.goto('https://histock.tw/stock/rank.aspx?m=4&d=0&p=all', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待表格加載完成
    await page.waitForSelector('#CPHB1_gv');
    
    // 提取表格數據
    console.log('正在提取表格數據...');
    const tableData = await page.evaluate(() => {
      // 獲取表頭
      let headers = [];
      const headerRow = document.querySelector('#CPHB1_gv tr.title');
      if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
      } else {
        // 如果找不到表頭，使用默認表頭
        headers = ['代碼', '名稱', '價格', '漲跌', '漲跌幅', '漲跌幅(週)', '振幅', '開盤', '最高', '最低', '昨收', '成交量', '成交額(百萬)'];
      }
      
      // 獲取數據行
      const rows = [];
      const dataRows = document.querySelectorAll('#CPHB1_gv tr:not(.title)');
      dataRows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach(cell => {
          // 替換逗號，避免CSV格式問題
          rowData.push(cell.textContent.trim().replace(/,/g, ''));
        });
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });
      
      return { headers, rows };
    });
    
    // 生成CSV內容
    let csvContent = tableData.headers.join(',') + '\n';
    tableData.rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    
    // 獲取當前日期作為文件名的一部分
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `histock_table_${dateStr}.csv`;
    
    // 保存CSV文件
    fs.writeFileSync(fileName, csvContent);
    console.log(`表格數據已保存到文件: ${fileName}`);
    
    return {
      success: true,
      fileName,
      rowCount: tableData.rows.length
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
scrapeHistockTable()
  .then(result => {
    if (result.success) {
      console.log(`成功爬取了 ${result.rowCount} 行數據，保存到 ${result.fileName}`);
    } else {
      console.error(`爬取失敗: ${result.error}`);
    }
  })
  .catch(err => {
    console.error('程序執行出錯:', err);
  });
