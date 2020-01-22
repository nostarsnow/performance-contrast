const puppeteer = require('puppeteer');
const fs = require('fs');
const formatPerformanceTiming = (timing, ...names) => {
  let white = ~~(timing.responseEnd - timing.navigationStart); //白屏时间
  let dom = ~~(timing.domInteractive - timing.responseEnd); //解析dom树耗时
  let domready = ~~(timing.domContentLoadedEventEnd - timing.responseEnd); //domready时间
  let onload = ~~(timing.loadEventEnd - timing.responseEnd); //onload
  return {
    white,
    dom,
    domready,
    onload
  };
};

const formatMetrics = (metrics, ...name) => {
  let {
    Nodes, // dom节点数量
    JSEventListeners, // js事件数量
    LayoutDuration, // 页面布局总时间
    ScriptDuration, // 页面js代码执行总时间
    JSHeapUsedSize, // 页面占用堆内存大小,
    JSHeapTotalSize // 总的页面堆内存大小
  } = metrics;
  return {
    Nodes,
    JSEventListeners,
    LayoutDuration,
    ScriptDuration,
    JsUsed: Number(((JSHeapUsedSize / JSHeapTotalSize) * 100).toFixed(2))
  };
};
const getPageData  = async (url) => {
  return new Promise(async resolve => {
    const browser = await puppeteer.launch({
      headless: false
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080
    });
    await page.setRequestInterception(true);
    await page.setCacheEnabled(false);
    let count = {
      total: 0,
      js: 0,
      css: 0,
      img: 0
    }
    page.on('request', request => {
      let url = request.url()
      count.total++;
      if ( /\.js(\?.*)?/i.test(url) ){
        count.js++
      }
      if ( /\.css(\?.*)?/i.test(url) ){
        count.css++
      }
      if ( /\.(png|jpg|gif|jpeg)(\?.*)?/i.test(url) ){
        count.img++
      }
      request.continue();
    });
    await page.goto(url, {
      waitUntil: 'load'
    });
    const performanceTiming = JSON.parse(
      await page.evaluate(() => JSON.stringify(window.performance.timing))
    );
    const gitMetrics = await page.metrics();
    await browser.close();
    resolve({
      timing: formatPerformanceTiming(performanceTiming),
      metrics:formatMetrics(gitMetrics),
      count,
    })
  })
};
const contrast = async (url1, url2, times = 2) => {
  return new Promise(async resolve => {
    let result1 = [];
    let result2 = [];
    async function queue(arr) {
      let res = []
      for (let fn of arr) {
        var data= await fn();
        res.push(data);
      }
      return await res
    }
    await queue(
      Array(times)
        .fill('')
        .map(v => {
          return async () => {
            result1.push(await getPageData(url1));
            result2.push(await getPageData(url2));
            return '';
          };
        })
    ).then(data=>{
      resolve({
        result1:result1.map(v=>{
          return {
            ...v.timing,
            ...v.metrics,
            ...v.count
          }
        }),
        result2:result2.map(v=>{
          return {
            ...v.timing,
            ...v.metrics,
            ...v.count
          }
        })
      });
    })

  });
};
const extractDataFromTracing = (path, name) =>{
  new Promise(resolve => {
    fs.readFile(path, (err, data) => {
      const tracing = JSON.parse(data);

      const resourceTracings = tracing.traceEvents.filter(
        x =>
          x.cat === 'devtools.timeline' &&
          typeof x.args.data !== 'undefined' &&
          typeof x.args.data.url !== 'undefined' &&
          x.args.data.url.endsWith(name)
      );
      const resourceTracingSendRequest = resourceTracings.find(
        x => x.name === 'ResourceSendRequest'
      );
      const resourceId = resourceTracingSendRequest.args.data.requestId;
      const resourceTracingEnd = tracing.traceEvents.filter(
        x =>
          x.cat === 'devtools.timeline' &&
          typeof x.args.data !== 'undefined' &&
          typeof x.args.data.requestId !== 'undefined' &&
          x.args.data.requestId === resourceId
      );
      const resourceTracingStartTime = resourceTracingSendRequest.ts / 1000;
      const resourceTracingEndTime =
        resourceTracingEnd.find(x => x.name === 'ResourceFinish').ts / 1000;

      fs.unlink(path, () => {
        resolve({
          start: resourceTracingStartTime,
          end: resourceTracingEndTime
        });
      });
    });
  });
}
module.exports = {
  extractDataFromTracing,
  formatPerformanceTiming,
  formatMetrics,
  getPageData,
  contrast
};
