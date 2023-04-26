/*
 作者：ZFeng1005
 日期：2-24
 小程序：蒙牛营养生活家
 入口：#小程序://蒙牛营养生活家/FzGssVYt9
 功能：签到-完成任务
 抓包：https://member-api.mengniu.cn/ 请求中的 X-Token(不带Bearer,有效期一个月)
 变量：mnCookie='X-Token@xxxxxxxx'  多个账号用 @ 或者 换行 分割 
 定时每天三次
 cron: 24 8,18,23 * * *
 */
const $ = new Env('蒙牛营养生活家')
const notify = $.isNode() ? require('./sendNotify') : '';
let cookiesArr = [],
  message = "",
  cookie = ($.isNode() ? process.env.mnCookie : $.getdata("mnCookie")) || ``
  !(async () => {
    await requireConfig();
    for (let i = 0; i < cookiesArr.length; i++) {
      if (cookiesArr[i]) {
        cookie = cookiesArr[i];
        msg = "";
        $.index = i + 1;
        $.nickName = '';
        $.mobile = '';
        $.unionId = '';
        $.taskList = {};
        await centerInfo()
        console.log(`\n******开始【🐄蒙牛营养生活家账号${$.index}】${$.nickName}*********\n`);
        await main()
      }
    }
    if ($.isNode() && message) {
      await notify.sendNotify(`${$.name}`, `${message}`)
    }
  })()
  .catch((e) => $.logErr(e))
  .finally(() => $.done())

async function main() {
  if ($.unionId) {
    console.log(`【开始每日签到】`)
    await signInfo()
    await $.wait(1500)
    console.log(`【获取任务列表】`)
    await taskList()
    await $.wait(1500)
    console.log(`【开始完成任务】`)
    for (j = 0; j < $.taskList.length; j++) {
      if ($.taskList[j].isCompleted === '-1') {
        console.log(`去完成:[${$.taskList[j].name}]`)
        await taskSubmit($.taskList[j].id, $.taskList[j].businessCode)
        await $.wait(1500)
      } else if ($.taskList[j].isCompleted === '0' && $.taskList[j].inviteNums !== -1) {
        console.log(`去完成:[${$.taskList[j].name}],共[${$.taskList[j].inviteNums}]次`)
        for (k = 0; k < $.taskList[j].inviteNums; k++) {
          await taskSubmit($.taskList[j].id, $.taskList[j].businessCode)
          await $.wait(1500)
        }
      } else {
        console.log(`[${$.taskList[j].name}]已完成`)
        continue
      }
    }
    console.log(`【开始分享抽奖页】`)
    await share()
    await $.wait(1500)
    console.log(`【开始抽奖】`)
    await lottery()
    await $.wait(1500)
    console.log(`【查询账号信息】`)
    await centerInfo()
    console.log(`用户ID:[${$.memberId}]，拥有:[${$.point}]积分`)
    msg += `用户ID:[${$.memberId}]\n拥有:[${$.point}]积分\n\n`
    await showMsg()
    await $.wait(2000)
  } else console.log(`获取账号信息失败！退出~`)
}
/**
 * 获取账户信息
 */
async function centerInfo() {
  let body = `{"mer_id":1}`
  return new Promise(resolve => {
    $.post(taskPostUrl('centerInfo', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.code === 200) {
              $.memberId = data.data.memberInfo.id
              $.mobile = data.data.memberInfo.mobile
              $.nickName = data.data.memberInfo.nickName
              $.unionId = data.data.memberInfo.unionId
              $.point = data.data.proteinInfo.pointsBalance
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, data)
      } finally {
        resolve(resp);
      }
    })
  })
}
/**
 * 获取签到详情
 */
async function signInfo() {
  let body = `?businessCode=01&unionId=${$.unionId}`
  return new Promise(resolve => {
    $.get(taskUrl('signInfo', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.code === 200) {
              if (data.data.isCompleted == -1) {
                await taskSubmit(data.data.id, data.data.businessCode)
              } else console.log(`[今日签到]已完成`)
            } else {
              console.log(data.msg)
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 * 获取任务列表
 */
async function taskList() {
  let body = `?businessCode=01&position=2&unionId=${$.unionId}`
  return new Promise(resolve => {
    $.get(taskUrl('taskList', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.code === 200) {
              console.log(`获取成功！`)
              $.taskList = data.data
              //console.log(JSON.stringify($.taskList))
            } else {
              console.log(data.msg)
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 * 
 * 完成任务
 */
async function taskSubmit(id, businessCode) {
  let body = `{"businessCode":"${businessCode}","taskId":${id},"unionId":"${$.unionId}"}`
  return new Promise(resolve => {
    $.post(taskPostUrl('taskSubmit', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.code === 200) {
              console.log(`操作成功！`)
              //console.log(JSON.stringify($.taskList))
            } else {
              console.log(data.msg)
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 * 
 * 分享
 */
async function share() {
  let body = `{"mer_id":96}`
  return new Promise(resolve => {
    $.post(lotteryPostUrl('share_success', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.status === 200) {
              console.log(`分享成功！`)
              //console.log(JSON.stringify($.taskList))
            } else {
              console.log(data.msg)
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 * 
 * 抽奖
 */
async function lottery() {
  let body = `{"mer_id":91}`
  return new Promise(resolve => {
    $.post(lotteryPostUrl('lucky_draw', body), async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${err}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            //console.log(JSON.stringify(data));
            if (data.status === 200) {
              console.log(`抽奖成功，获得:${data.data.level}[${data.data.prize_name}]`)
              msg += `抽奖获得:${data.data.level}[${data.data.prize_name}]\n`
              //console.log(JSON.stringify($.taskList))
            } else {
              console.log(data.message)
            }
          } else {
            console.log("没有返回数据")
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
/**
 * 
 * API
 */
function taskUrl(type, body) {
  return {
    url: `https://member-api.mengniu.cn/user/mnme/member/${type}${body}`,
    headers: {
      'Host': 'member-api.mengniu.cn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat',
      'X-Token': 'Bearer ' + cookie,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-us,en'
    }
  }
}

function taskPostUrl(type, body) {
  return {
    url: `https://member-api.mengniu.cn/user/mnme/member/${type}`,
    headers: {
      'Host': 'member-api.mengniu.cn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat',
      'X-Token': 'Bearer ' + cookie,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-us,en'
    },
    body: body
  }
}

function lotteryPostUrl(type, body) {
  return {
    url: `https://mul-cml.mengniu.cn/api/store/lottery/${type}/352`,
    headers: {
      'Host': 'mul-cml.mengniu.cn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat',
      'CHANNEL': 1,
      'MERCHANT': 91,
      'X-Token': 'Bearer ' + cookie,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    body: body
  }
}
/**
 * cookie处理
 */
function requireConfig() {
  if (cookie) {
    if (cookie.indexOf("@") != -1) {
      cookie.split("@").forEach((item) => {
        cookiesArr.push(item);
      });
    } else if (cookie.indexOf("\n") != -1) {
      cookie.split("\n").forEach((item) => {
        cookiesArr.push(item);
      });
    } else {
      cookiesArr.push(cookie);
    }
    console.log(`\n=============================================    \n脚本执行 - 北京时间(UTC+8)：${new Date(new Date().getTime() +new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000).toLocaleString()} \n=============================================\n`)
    console.log(`\n=========共有${cookiesArr.length}个${$.name}账号Cookie=========\n`);
  } else {
    console.log(`\n【缺少mnCookie环境变量或者mnCookie为空！】`)
    return;
  }
}
/**
 * 
 * 消息推送
 */
async function showMsg() {
  message += `====[${$.nickName}]====\n`;
  message += msg
  //console.log(message)
}
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}