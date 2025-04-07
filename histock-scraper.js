const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 爬取HiStock网站表格数据并保存为CSV
 * URL: https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt
 */
async function scrapeHistockTable() {
  console.log('开始爬取HiStock表格数据...');
  
  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: true, // 设置为false可以看到浏览器界面
  });
  
  try {
    // 创建新页面
    const page = await browser.newPage();
    
    // 设置视窗大小
    await page.setViewport({ width: 1280, height: 800 });
    
    // 导航到目标网站
    console.log('正在访问网站...');
    await page.goto('https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // 等待表格加载完成
    await page.waitForSelector('#CPHB1_gv');
    
    // 提取表格数据
    console.log('正在提取表格数据...');
    const tableData = await page.evaluate(() => {
      // 获取表头
      let headers = [];
      const headerRow = document.querySelector('#CPHB1_gv tr.title');
      if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
      } else {
        // 如果找不到表头，使用默认表头
        headers = ['代码', '名称', '价格', '涨跌', '涨跌幅', '涨跌幅(周)', '振幅', '开盘', '最高', '最低', '昨收', '成交量', '成交额(百万)'];
      }
      
      // 获取数据行
      const rows = [];
      const dataRows = document.querySelectorAll('#CPHB1_gv tr:not(.title)');
      dataRows.forEach(row => {
        const rowData = [];
        row.querySelectorAll('td').forEach(cell => {
          // 替换逗号，避免CSV格式问题
          rowData.push(cell.textContent.trim().replace(/,/g, ''));
        });
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });
      
      return { headers, rows };
    });
    
    // 生成CSV内容
    let csvContent = tableData.headers.join(',') + '\n';
    tableData.rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    
    // 获取当前日期作为文件名的一部分
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `histock_table_${dateStr}.csv`;
    
    // 保存CSV文件
    fs.writeFileSync(fileName, csvContent);
    console.log(`表格数据已保存到文件: ${fileName}`);
    
    return {
      success: true,
      fileName,
      rowCount: tableData.rows.length
    };
  } catch (error) {
    console.error('爬取过程中发生错误:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 关闭浏览器
    await browser.close();
    console.log('浏览器已关闭');
  }
}

// 执行爬虫函数
scrapeHistockTable()
  .then(result => {
    if (result.success) {
      console.log(`成功爬取了 ${result.rowCount} 行数据，保存到 ${result.fileName}`);
    } else {
      console.error(`爬取失败: ${result.error}`);
    }
  })
  .catch(err => {
    console.error('程序执行出错:', err);
  });