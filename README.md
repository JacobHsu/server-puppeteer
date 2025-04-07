# server-puppeteer

使用Puppeteer爬取网站表格数据并保存为CSV格式的工具。

## 功能

- 爬取 [HiStock](https://histock.tw/stock/rank.aspx?m=4&d=0&t=dt) 网站的表格数据
- 自动将数据保存为CSV格式
- 文件名包含日期，便于区分不同时间的数据

## 安装

```bash
# 克隆仓库
git clone https://github.com/JacobHsu/server-puppeteer.git

# 进入项目目录
cd server-puppeteer

# 安装依赖
npm install
```

## 使用方法

```bash
# 运行爬虫脚本
npm start
```

运行后，脚本将自动：
1. 访问 HiStock 网站
2. 提取表格数据
3. 将数据保存为CSV文件（格式为 `histock_table_YYYYMMDD.csv`）

## 文件说明

- `histock-scraper.js` - 主要的爬虫脚本
- `package.json` - 项目依赖配置

## 依赖

- [Puppeteer](https://pptr.dev/) - 用于控制Chrome浏览器的Node.js库