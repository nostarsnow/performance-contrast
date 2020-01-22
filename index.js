const fs = require('fs');
const exec = require('child_process').exec
const marked = require('marked');
const { contrast } = require('./helpers');
(async () => {
  const url1 = 'https://www.zuhaowan.com/'
  const url2 = 'https://www.zuhaowan.com/indexV3'
  const times = 3;
  const title = '新旧首页性能对比'
  console.log('正在执行中......')
  const { result1, result2 } = await contrast(
    url1,
    url2,
    times
  );
  console.log('执行完毕.正在生产报告......')
  const getRes1 = name=>{
    return result1.map(v=>{
      return v[name]
    }).join('、')
  }
  const getRes2 = name=>{
    return result2.map(v=>{
      return v[name]
    }).join('、')
  }
  const getAvg1 = name => {
    return Number((result1.reduce((p,v)=>{
      return p + v[name]
    },0) / result1.length).toFixed(2))
  }
  const getAvg2 = name => {
    return Number((result2.reduce((p,v)=>{
      return p + v[name]
    },0) / result2.length).toFixed(2))
  }
  const row = (param,name,note) => {
    let avg1 = getAvg1(name)
    let avg2 = getAvg2(name)
    let diff = ((avg1 - avg2).toFixed(2))
    return `${param} | ${getRes1(name)} | ${getRes2(name)} | ${avg1} (vs) ${avg2} | <font color="${diff >= 0 ? 'green' : 'red' }">${diff}</font> | ${note || '无'}`
  }
  let data = `
  # ${title}

  参数 | ${url1} |  ${url2} | 平均值 | 差异 | 备注
  -|-|-|-|-|-
  ${row('白屏时间','white','开始请求html到接收完成html所用毫秒数。')}
  ${row('解析dom树耗时','dom','从获取到html之后，解析dom耗时')}
  ${row('dom ready','domready','从获取到html之后，html/css/js加载并执行完成')}
  ${row('onload','onload','从获取到html之后，html/css/js/img加载并执行完成')}
  ${row('dom节点数量','Nodes','dom节点总数量')}
  ${row('首屏总请求数','total','不计算统计代码和延时图片')}
  ${row('首屏js请求数','js','不计算统计代码')}
  ${row('首屏css请求数','css','计算js中动态加载的css。如layer')}
  ${row('首屏img请求数','img','不计算延时图片')}
  ${row('页面的js事件数量','JSEventListeners','')}
  ${row('页面布局总时间','LayoutDuration','')}
  ${row('页面js代码执行总时间','ScriptDuration','')}
  ${row('js内存使用占比','JsUsed','页面占用堆内存大小/总的页面堆内存大小')}
  `;
  let filename = 'index-performance-comparison.html'
  let cssname = './github.css'
  fs.writeFile(filename,`<title>${title}</title>\n<link href="${cssname}" rel="stylesheet">\n` + marked(data),err=>{
    if (err) {console.log(err)}
    console.log('执行完毕.正在准备查看报告......')
    exec(`start ${filename}`)
  })
})();