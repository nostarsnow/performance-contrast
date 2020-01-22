# performance-contrast web页面性能对比

## 介绍 

就是自动化多次访问两个网址。取出性能方面参数的平均值比较差异。生成报告而已。

## 开始

``` bash
# 安装依赖。如果不想装chromium可以自行参考puppeteer-core文档。装了最方便
cnpm install

# 修改index.js。将其中的网址和次数都改为自己的。
vim index.js

# 启动
npm start

```
