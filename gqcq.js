/*
 作者：ZFeng1005
 日期：9-11
 APP：广汽传祺
 入口：广汽传祺APP-生活-攒G豆 / 广汽传祺微信小程序
 功能：完成任务，一天250豆子左右，100豆子=1￥
 抓包：
  APP：https://gsp.gacmotor.com/ 这个包里 headers 中的 token (必须)
  小程序：https://mall.gacmotor.com/ 这个包里 headers 中的 token (非必须)
  两个 token 用 & 进行连接 例：xxxxx&DS-AT-xxxxx
 变量：gqcqCookie='xxxx@xxxx '  多个账号用 @ 或者 换行 分割 
 定时一天三次，
 cron: 10 8,19,23 * * *
 */
 const $ = new Env('广汽传祺')
 const notify = $.isNode() ? require('./sendNotify') : '';
 const salt = "17aaf8118ffb270b766c6d6774317a133.8.1"
 let cookiesArr = [],
   message = "",
   textArr = ['东边日出西边雨，道是无晴却有晴。——唐·刘禹锡《竹枝词二首·其一》,释义：东边日出西边下起雨，说是无晴但是还有晴。', '日出江花红胜火，春来江水绿如蓝。——唐·白居易《忆江南·江南好》，释义：春天到来时，太阳从江面升起，把江边的鲜花照得比火红，碧绿的江水绿得胜过蓝草。', '日出扶桑一丈高，人间万事细如毛。——唐·刘叉《偶书》，释义：每天太阳从东方升起的时候，人世间纷繁复杂多如牛毛的事便开始一件件发生。', '日出东南隅，照我秦氏楼。——汉·佚名《陌上桑》，释义：太阳从东南方升起，照到我们秦家的小楼。', '白日地中出，黄河天外来。——唐·张蠙《登单于台》，释义：白炽的太阳从大地内部升起，奔腾的黄河从远天之外涌来。', '秦川朝望迥，日出正东峰。——唐·李欣《望秦川》，释义：我清晨从长安出发，回头东望，离秦川已经很远了，太阳从东峰上冉冉升起。', '日出而林霏开，云归而岩穴暝。——宋·欧阳修《醉翁亭记》，释义：太阳的升起，山林里的雾气散了；烟云聚拢来，山谷就显得昏暗了', '东方日出啼早鸦，城门人开扫落花。——唐·李白《扶风豪士歌》，释义：旭日东升曙光显，惊起鸟雀噪一片，开门扫除喜涟涟。', '荆山已去华山来，日出潼关四扇开。——唐·韩愈《次潼关先寄张十二阁老使君》释义：荆山刚刚越过华山迎面来，红日东升潼关也四门大开。']
 cookie = ($.isNode() ? process.env.gqcqCookie : $.getdata("gqcqCookie")) || ``
 !(async () => {
     await requireConfig();
     for (let i = 0; i < cookiesArr.length; i++) {
       if (cookiesArr[i]) {
         cookie = cookiesArr[i].split(`&`)[0];
         wxcookie = cookiesArr[i].split(`&`)[1]
         msg = '';
         $.index = i + 1;
         $.nickName = '';
         $.userId = '';
         $.mobile = '';
         $.userIdStr = '';
         $.vehicleToken = '';
         $.taskList = {}
         $.queryList = {}
         await getUserInfoV2();
         console.log(`\n******开始【🚙广汽传祺账号${$.index}】${$.nickName}|${$.mobile}*********\n`);
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
   if ($.userId) {
     console.log(`【开始获取任务列表】`)
     await getlistv1();
     await $.wait(1500)
 
     console.log(`\n【开始每日签到&抽奖】`)
     if ($.taskList[0].finishedNum === 0) {
       await signIn();
       await $.wait(1500)
       await luckyDraw();
       await $.wait(1500)
     } else console.log(`今日已签到&抽奖~`)
     await $.wait(1500)
 
     if(wxcookie){
       console.log(`\n【开始微信小程序签到】`)
       await wxsign()
       await $.wait(1500)
     }
 
     console.log(`\n【开始完成每日任务】`)
     if ($.taskList[1].finishedNum < $.taskList[1].total) {
       for (i = 0; i < $.taskList[1].total; i++) {
         console.log(`「发布文章」`)
         await post_topic()
         await $.wait(3000)
 
         if ($.topicId) {
           console.log(`「评论文章」`)
           await comment($.topicId, "真喜欢你关于日出日落的句子！")
           await $.wait(3000)
 
           console.log(`「分享文章」`)
           await forward($.topicId)
           await $.wait(3000)
 
           console.log(`「删除文章」`)
           await delete_topic($.topicId)
           await $.wait(3000)
         }
       }
     } else console.log(`今日任务已完成~`)
     await $.wait(1500)
 
     console.log(`\n【开始查询宝箱列表】`)
     await unopenlist();
     await $.wait(1500)
 
     if ($.boxList.length) {
       console.log(`\n【开始开宝箱】`)
       for (i = 0; i < $.boxList.length; i++) {
         await openbox($.boxList[i].recordId)
         await $.wait(1000)
       }
     } else console.log(`\n暂无宝箱可开启！`)
 
     console.log(`\n【开始获取G豆情况】`)
     await getusergdou();
     await $.wait(1500)
 
     await showMsg()
     await $.wait(1500)
   } else console.log(`获取userId失败，退出任务`)
 }
 /**
  * 
  * 获取账号信息
  */
 async function getUserInfoV2() {
   let body = ``;
   return new Promise(resolve => {
     $.post((taskPostUrl("gateway/webapi/account/getUserInfoV2", body)), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "200") {
               $.userId = data.data.userId
               $.nickName = data.data.nickname
               $.mobile = data.data.mobile
               $.userIdStr = data.data.userIdStr
               $.vehicleToken = data.data.vehicleToken
             } else {
               //console.log(JSON.stringify(data))
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
  * 任务列表
  */
 async function getlistv1() {
   let body = `place=1`;
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/community/api/mission/getlistv1', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               $.taskList = data.data
               console.log(`获取任务列表成功！`)
               //console.log($.taskList)
             } else {
               console.log(JSON.stringify(data))
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
  * 签到
  */
 async function signIn() {
   return new Promise(resolve => {
     $.get(taskUrl('gateway/app-api/sign/submit'), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "200") {
               console.log(`签到成功,你已经连续签到${data.data.dayCount}天 ,签到获得G豆${data.data.operationValue} 个`)
               //console.log($.taskList)
             } else {
               console.log(JSON.stringify(data))
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
  * 微信签到
  */
  async function wxsign() {
   let opt = {
     url: `https://mall.gacmotor.com/center-current-app/fronted/myHomePage/checkLoginSendGdou`,
     headers :{
       "Connection":'keep-alive',
       "Content-Length":2,
       "Content-Type":'application/json',
       "Host":'mall.gacmotor.com',
       "Referer":'https://servicewechat.com/wx86a1eb5a53a6973b/210/page-frame.html',
       "token":wxcookie,
       "User-Agent":'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.28(0x18001c2c) NetType/WIFI Language/zh_CN'
     },
     body : `{}`
   }
   return new Promise(resolve => {
     $.post(opt, async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.code === "0000" && data.success === true && data.data.flag === true) {
               console.log(`微信签到成功,签到获得G豆${data.data.gdouNum}个`)
             } else {
               console.log(`今日已签到`)
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
 async function luckyDraw() {
   let body = `activityCode=shop-draw`
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/activity/shopDraw/luckyDraw', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               msg = `抽奖成功，获得：${data.data.medalName}\n\n`
               console.log(`抽奖成功，获得：${data.data.medalName}`)
               //console.log($.taskList)
             } else {
               console.log(JSON.stringify(data))
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
  * 获取文章列表
  */
 async function Article_list() {
   return new Promise(resolve => {
     $.get(taskUrl('gw/app/community/api/post/channelPostList?current=1&size=20&channelId=&sortType=1'), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               $.queryList = data.data.records
               console.log(`获取文章列表成功！`)
               //console.log(JSON.stringify($.queryList))
             } else {
               console.log(JSON.stringify(data))
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
  * 评论文章
  */
 async function comment(id, comment) {
   let body = `commentContent=${encodeURIComponent(comment)}&commentType=0&commentatorId=${encodeURIComponent($.userIdStr)}&postId=${id}`
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/community/api/comment/add', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               console.log(`评论成功！`)
               //console.log(JSON.stringify($.queryList))
             } else {
               console.log(JSON.stringify(data))
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
  *分享文章
  */
 async function forward(id) {
   let body = `postId=${id}&userId=${$.userIdStr}`
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/community/api/post/forward', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               console.log(`分享文章成功！`)
               //console.log(JSON.stringify($.queryList))
             } else {
               console.log(JSON.stringify(data))
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
  *发布帖子
  */
 async function post_topic() {
   text = textArr[Math.floor(Math.random() * textArr.length)]
   let body = `postId=&postType=2&topicId=176&columnId=&postTitle=日升日落，皆有其理&postContent=[{"text":"${text}"}]&coverImg=https://pic-gsp.gacmotor.com/app/3c08eee3-6e60-4d9b-9469-41d1f5e3d28f.jpg&publishedTime=&contentWords=${text}&contentImgNums=1&lng=&lat=&address=&cityId=`
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/community/api/topic/appsavepost', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               console.log(`发布文章成功！`)
               $.topicId = data.data.postId
               //console.log(JSON.stringify($.queryList))
             } else {
               console.log(JSON.stringify(data))
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
  *删除帖子
  */
 async function delete_topic(id) {
   let body = `postId=${id}`
   return new Promise(resolve => {
     $.post(taskPostUrl('gw/app/community/api/post/delete', body), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               console.log(`删除文章成功！\n`)
               //console.log(JSON.stringify($.queryList))
             } else {
               console.log(JSON.stringify(data))
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
  * 查询宝箱列表
  */
 async function unopenlist() {
   let body = `activityCode=SIGN-BOX`
   return new Promise(resolve => {
     $.post((taskPostUrl("gw/app/activity/api/winrecord/unopenlist", body)), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               $.boxList = data.data
               console.log(`查询成功！`)
             } else {
               console.log(JSON.stringify(data))
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
  * 开宝箱
  */
 async function openbox(id) {
   let body = `activityCode=OPEN-BOX&recordId=${id}`
   return new Promise(resolve => {
     $.post((taskPostUrl("gw/app/activity/api/medal/openbox", body)), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "20000") {
               console.log(`开启成功！获得：${data.data.medalName}`)
             } else {
               console.log(JSON.stringify(data))
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
  * 获取G豆信息
  */
 async function getusergdou() {
   return new Promise(resolve => {
     $.get((taskUrl("gw/app-api/account/getusergdou")), async (err, resp, data) => {
       try {
         if (err) {
           console.log(`${err}`)
           console.log(`${$.name} API请求失败，请检查网路重试`)
         } else {
           if (data) {
             data = JSON.parse(data);
             //console.log(JSON.stringify(data));
             if (data.result === true && data.errorCode === "200") {
               $.beanNum = data.data
               console.log(`获取成功，共有：${$.beanNum}个G豆~`)
             } else {
               console.log(JSON.stringify(data))
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
 function taskUrl(type) {
   getreqSign()
   return {
     url: `https://gsp.gacmotor.com/${type}`,
     headers: {
       "Host": "gsp.gacmotor.com",
       "User-Agent": "GACClient/3.8.1 (iPad; iOS 15.4.1; Scale/2.00)",
       "token": cookie,
       "Accept-Language": "zh-Hans;q=1",
       "version": "3.8.1",
       "Accept": "*/*",
       "Content-Type": "application/x-www-form-urlencoded",
       "Accept-Encoding": "deflate, br",
       "verification": "signature",
       "reqTs": reqTs,
       "reqNonc": reqNonc,
       "reqSign": reqSign
     }
   }
 }
 
 function taskPostUrl(type, body) {
   getreqSign()
   return {
     url: `https://gsp.gacmotor.com/${type}`,
     body: `${body}`,
     headers: {
       "Host": "gsp.gacmotor.com",
       "User-Agent": "GACClient/3.8.1 (iPad; iOS 15.4.1; Scale/2.00)",
       "token": cookie,
       "Accept-Language": "zh-Hans;q=1",
       "version": "3.8.1",
       "Accept": "*/*",
       "Content-Type": "application/x-www-form-urlencoded",
       "Accept-Encoding": "deflate, br",
       "verification": "signature",
       "reqTs": reqTs,
       "reqNonc": reqNonc,
       "reqSign": reqSign
     }
   }
 }
 /**
  * 获取reqSign
  */
 function getreqSign() {
   reqTs = Date.now()
   reqNonc = Math.floor((Math.random() * 999999) + 100000);
   reqSign = hex_md5(`signature${reqNonc}${reqTs}${salt}`)
   //console.log(reqSign)
 }
 /**
  * 
  * 消息推送
  */
 function showMsg() {
   message += `=== ${$.nickName} | ${$.mobile} ===\n`;
   message += `G豆总数：${$.beanNum}🫒\n`
   message += msg
   //console.log(message)
 }
 /**
  * 
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
     console.log(`\n【缺少tcCookies环境变量或者Cookies为空！】`)
     return;
   }
 }
 // MD5
 var hexcase=0;function hex_md5(a){ if(a=="") return a; return rstr2hex(rstr_md5(str2rstr_utf8(a)))}function hex_hmac_md5(a,b){return rstr2hex(rstr_hmac_md5(str2rstr_utf8(a),str2rstr_utf8(b)))}function md5_vm_test(){return hex_md5("abc").toLowerCase()=="900150983cd24fb0d6963f7d28e17f72"}function rstr_md5(a){return binl2rstr(binl_md5(rstr2binl(a),a.length*8))}function rstr_hmac_md5(c,f){var e=rstr2binl(c);if(e.length>16){e=binl_md5(e,c.length*8)}var a=Array(16),d=Array(16);for(var b=0;b<16;b++){a[b]=e[b]^909522486;d[b]=e[b]^1549556828}var g=binl_md5(a.concat(rstr2binl(f)),512+f.length*8);return binl2rstr(binl_md5(d.concat(g),512+128))}function rstr2hex(c){try{hexcase}catch(g){hexcase=0}var f=hexcase?"0123456789ABCDEF":"0123456789abcdef";var b="";var a;for(var d=0;d<c.length;d++){a=c.charCodeAt(d);b+=f.charAt((a>>>4)&15)+f.charAt(a&15)}return b}function str2rstr_utf8(c){var b="";var d=-1;var a,e;while(++d<c.length){a=c.charCodeAt(d);e=d+1<c.length?c.charCodeAt(d+1):0;if(55296<=a&&a<=56319&&56320<=e&&e<=57343){a=65536+((a&1023)<<10)+(e&1023);d++}if(a<=127){b+=String.fromCharCode(a)}else{if(a<=2047){b+=String.fromCharCode(192|((a>>>6)&31),128|(a&63))}else{if(a<=65535){b+=String.fromCharCode(224|((a>>>12)&15),128|((a>>>6)&63),128|(a&63))}else{if(a<=2097151){b+=String.fromCharCode(240|((a>>>18)&7),128|((a>>>12)&63),128|((a>>>6)&63),128|(a&63))}}}}}return b}function rstr2binl(b){var a=Array(b.length>>2);for(var c=0;c<a.length;c++){a[c]=0}for(var c=0;c<b.length*8;c+=8){a[c>>5]|=(b.charCodeAt(c/8)&255)<<(c%32)}return a}function binl2rstr(b){var a="";for(var c=0;c<b.length*32;c+=8){a+=String.fromCharCode((b[c>>5]>>>(c%32))&255)}return a}function binl_md5(p,k){p[k>>5]|=128<<((k)%32);p[(((k+64)>>>9)<<4)+14]=k;var o=1732584193;var n=-271733879;var m=-1732584194;var l=271733878;for(var g=0;g<p.length;g+=16){var j=o;var h=n;var f=m;var e=l;o=md5_ff(o,n,m,l,p[g+0],7,-680876936);l=md5_ff(l,o,n,m,p[g+1],12,-389564586);m=md5_ff(m,l,o,n,p[g+2],17,606105819);n=md5_ff(n,m,l,o,p[g+3],22,-1044525330);o=md5_ff(o,n,m,l,p[g+4],7,-176418897);l=md5_ff(l,o,n,m,p[g+5],12,1200080426);m=md5_ff(m,l,o,n,p[g+6],17,-1473231341);n=md5_ff(n,m,l,o,p[g+7],22,-45705983);o=md5_ff(o,n,m,l,p[g+8],7,1770035416);l=md5_ff(l,o,n,m,p[g+9],12,-1958414417);m=md5_ff(m,l,o,n,p[g+10],17,-42063);n=md5_ff(n,m,l,o,p[g+11],22,-1990404162);o=md5_ff(o,n,m,l,p[g+12],7,1804603682);l=md5_ff(l,o,n,m,p[g+13],12,-40341101);m=md5_ff(m,l,o,n,p[g+14],17,-1502002290);n=md5_ff(n,m,l,o,p[g+15],22,1236535329);o=md5_gg(o,n,m,l,p[g+1],5,-165796510);l=md5_gg(l,o,n,m,p[g+6],9,-1069501632);m=md5_gg(m,l,o,n,p[g+11],14,643717713);n=md5_gg(n,m,l,o,p[g+0],20,-373897302);o=md5_gg(o,n,m,l,p[g+5],5,-701558691);l=md5_gg(l,o,n,m,p[g+10],9,38016083);m=md5_gg(m,l,o,n,p[g+15],14,-660478335);n=md5_gg(n,m,l,o,p[g+4],20,-405537848);o=md5_gg(o,n,m,l,p[g+9],5,568446438);l=md5_gg(l,o,n,m,p[g+14],9,-1019803690);m=md5_gg(m,l,o,n,p[g+3],14,-187363961);n=md5_gg(n,m,l,o,p[g+8],20,1163531501);o=md5_gg(o,n,m,l,p[g+13],5,-1444681467);l=md5_gg(l,o,n,m,p[g+2],9,-51403784);m=md5_gg(m,l,o,n,p[g+7],14,1735328473);n=md5_gg(n,m,l,o,p[g+12],20,-1926607734);o=md5_hh(o,n,m,l,p[g+5],4,-378558);l=md5_hh(l,o,n,m,p[g+8],11,-2022574463);m=md5_hh(m,l,o,n,p[g+11],16,1839030562);n=md5_hh(n,m,l,o,p[g+14],23,-35309556);o=md5_hh(o,n,m,l,p[g+1],4,-1530992060);l=md5_hh(l,o,n,m,p[g+4],11,1272893353);m=md5_hh(m,l,o,n,p[g+7],16,-155497632);n=md5_hh(n,m,l,o,p[g+10],23,-1094730640);o=md5_hh(o,n,m,l,p[g+13],4,681279174);l=md5_hh(l,o,n,m,p[g+0],11,-358537222);m=md5_hh(m,l,o,n,p[g+3],16,-722521979);n=md5_hh(n,m,l,o,p[g+6],23,76029189);o=md5_hh(o,n,m,l,p[g+9],4,-640364487);l=md5_hh(l,o,n,m,p[g+12],11,-421815835);m=md5_hh(m,l,o,n,p[g+15],16,530742520);n=md5_hh(n,m,l,o,p[g+2],23,-995338651);o=md5_ii(o,n,m,l,p[g+0],6,-198630844);l=md5_ii(l,o,n,m,p[g+7],10,1126891415);m=md5_ii(m,l,o,n,p[g+14],15,-1416354905);n=md5_ii(n,m,l,o,p[g+5],21,-57434055);o=md5_ii(o,n,m,l,p[g+12],6,1700485571);l=md5_ii(l,o,n,m,p[g+3],10,-1894986606);m=md5_ii(m,l,o,n,p[g+10],15,-1051523);n=md5_ii(n,m,l,o,p[g+1],21,-2054922799);o=md5_ii(o,n,m,l,p[g+8],6,1873313359);l=md5_ii(l,o,n,m,p[g+15],10,-30611744);m=md5_ii(m,l,o,n,p[g+6],15,-1560198380);n=md5_ii(n,m,l,o,p[g+13],21,1309151649);o=md5_ii(o,n,m,l,p[g+4],6,-145523070);l=md5_ii(l,o,n,m,p[g+11],10,-1120210379);m=md5_ii(m,l,o,n,p[g+2],15,718787259);n=md5_ii(n,m,l,o,p[g+9],21,-343485551);o=safe_add(o,j);n=safe_add(n,h);m=safe_add(m,f);l=safe_add(l,e)}return Array(o,n,m,l)}function md5_cmn(h,e,d,c,g,f){return safe_add(bit_rol(safe_add(safe_add(e,h),safe_add(c,f)),g),d)}function md5_ff(g,f,k,j,e,i,h){return md5_cmn((f&k)|((~f)&j),g,f,e,i,h)}function md5_gg(g,f,k,j,e,i,h){return md5_cmn((f&j)|(k&(~j)),g,f,e,i,h)}function md5_hh(g,f,k,j,e,i,h){return md5_cmn(f^k^j,g,f,e,i,h)}function md5_ii(g,f,k,j,e,i,h){return md5_cmn(k^(f|(~j)),g,f,e,i,h)}function safe_add(a,d){var c=(a&65535)+(d&65535);var b=(a>>16)+(d>>16)+(c>>16);return(b<<16)|(c&65535)}function bit_rol(a,b){return(a<<b)|(a>>>(32-b))};
 // prettier-ignore
 function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }