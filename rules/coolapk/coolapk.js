// ⚠️ 本文件由 rules/coolapk/sync.py 自动生成，请勿手动修改。
// 上游脚本 : https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/coolapk.js
// 上游 hash : 6cc214c7df85
// 生成时间 : 2026-11-04 02:35 UTC
//
// 上游是 Surge 写法（$request / $response / $done），这里套一层 Egern http-response 兼容壳：
//   · ctx.response.text() 读出原始响应体 → $response.body
//   · 上游调用 $done(obj) 时抛哨兵异常来中止，模拟 Surge 的「立即结束」
//   · 上游抛错 / 没调用 $done → 原样放行（fail open，绝不弄坏酷安）
export default async function (ctx) {
  const response = ctx.response;
  if (!response) return;

  let raw;
  try {
    raw = await response.text();
  } catch (e) {
    return;
  }
  if (!raw) return;

  const DONE = Symbol('surge-done');
  const $request = {
    url: ctx.request ? ctx.request.url : '',
    method: ctx.request ? ctx.request.method : 'GET',
    headers: ctx.request ? ctx.request.headers : {},
  };
  const $response = { status: response.status, headers: response.headers, body: raw };
  let result = null;

  const $done = (v) => {
    const e = new Error('surge-done');
    e[DONE] = true;
    e.value = v || {};
    throw e;
  };

  try {
    (function () {
      // ===================== 上游脚本开始 =====================
      /********************************
      Coolapk Remove Ads - Version 1.0
      Please note that you may need to reinstall app for script to work.

      QuantumultX rewrite link:
      https://raw.githubusercontent.com/zirawell/R-Store/main/Rule/QuanX/Adblock/App/K/酷安/rewrite/coolapk.conf

      Surge module link:
      https://raw.githubusercontent.com/zirawell/R-Store/main/Rule/Surge/Adblock/App/K/酷安/coolapk.sgmodule
      ********************************/

      const url = $request.url;
      if (!$response.body) $done({});
      let obj = JSON.parse($response.body);

      if (url.includes("/feed/detail")) {
        if (obj.data?.hotReplyRows?.length > 0) {
          obj.data.hotReplyRows = obj.data.hotReplyRows.filter((item) => item.id);
        }
        if (obj.data?.topReplyRows?.length > 0) {
          obj.data.topReplyRows = obj.data.topReplyRows.filter((item) => item.id);
        }
        const item = ["detailSponsorCard", "include_goods", "include_goods_ids"];
        for (let i of item) {
          if (obj.data?.[i]) {
            obj.data[i] = [];
          }
        }
      } else if (url.includes("/feed/replyList")) {
        if (obj.data?.length > 0) {
          obj.data = obj.data.filter((item) => item.id);
        }
      } else if (url.includes("/main/dataList")) {
        if (obj.data?.length > 0) {
          obj.data = obj.data.filter(
              (item) =>
                  !(item.entityTemplate === "sponsorCard" || item.title === "精选配件")
          );
        }
      } else if (url.includes("/main/indexV")) {
        if (obj.data?.length > 0) {
          obj.data = obj.data.filter(
              (item) =>
                  !(
                      item.entityTemplate === "sponsorCard" ||
                      item.entityId === 8639 ||
                      item.entityId === 29349 ||
                      item.entityId === 33006 ||
                      item.entityId === 32557 ||
                      item.title.includes("值得买") ||
                      item.title.includes("红包")
                  )
          );
        }
      } else if (url.includes("/main/init")) {
        if (obj.data?.length > 0) {
          obj.data = obj.data.filter(
              (item) => ![944, 945, 6390].includes(item?.entityId)
          );
        }
      } else if (url.includes("/page/dataList")) {
        if (obj.data?.length > 0) {
          obj.data = obj.data.filter((item) => !(item.title === "酷安热搜"));
        }
      }

      $done({body: JSON.stringify(obj)});
      // ===================== 上游脚本结束 =====================
    })();
  } catch (e) {
    if (e && e[DONE]) {
      result = e.value;
    } else {
      return; // 上游异常 → 不接管，原样返回
    }
  }

  if (!result || typeof result.body !== 'string') return;
  if (result.body === raw) return;
  return { body: result.body };
}
