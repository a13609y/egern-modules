// 行为测试：把生成的 coolapk.js 当纯函数跑，验证请求模式与响应模式
import handler from './coolapk.mjs';

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log('✓', name); }
  else { fail++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 200)); }
};
const H = (obj) => ({ forEach: (fn) => Object.keys(obj).forEach(k => fn(obj[k], k)), ...obj });
const resCtx = (url, body) => ({ request: { url, method: 'GET', headers: H({}) }, response: { status: 200, headers: H({}), text: async () => body } });
const reqCtx = (url, headers) => ({ request: { url, method: 'GET', headers: H(headers) }, response: undefined });

// ── 请求模式：init 去掉缓存校验头（否则 304，响应脚本永远拿不到新数据）──
{
  const r = await handler(reqCtx('https://api.coolapk.com/v6/main/init?x=1', {
    'If-None-Match': 'W/"abc"', 'if-modified-since': 'Tue, 01 Jan 2030 00:00:00 GMT', 'X-App-Id': 'coolapk',
  }));
  const hs = r && r.headers;
  check('init 请求去掉 If-None-Match/If-Modified-Since',
    hs && !Object.keys(hs).some(k => /^if-(none-match|modified-since)$/i.test(k)) && hs['X-App-Id'] === 'coolapk', hs);
}
// ── 请求模式：无关 URL 放行 ──
{
  const r = await handler(reqCtx('https://api.coolapk.com/v6/feed/detail?id=1', { 'If-None-Match': 'x' }));
  check('非 init 请求不改动', r === undefined, r);
}

// ── 响应模式：开屏卡 + SplashAd 配置 ──
{
  const init = JSON.stringify({ data: [
    { entityTemplate: 'imageCard', entityId: 1, title: '开屏' },
    { entityId: '6390', entityTemplate: 'configCard', extraDataArr: { 'SplashAd.Type': 'image', 'SplashAd.timeout': '3', foo: 'bar' } },
    { entityId: 944, entityTemplate: 'iconGridCard', title: '热门搜索' },
  ]});
  const r = await handler(resCtx('https://api2.coolapk.com/v6/main/init', init));
  const d = r && r.body ? JSON.parse(r.body).data : null;
  check('init 删除 imageCard 开屏卡', d && !d.some(i => i.entityTemplate === 'imageCard'), d);
  check('init 改写 SplashAd 配置', d && d.some(i => i.entityId === '6390' && i.extraDataArr['SplashAd.Type'] === '' && i.extraDataArr['SplashAd.timeout'] === '0'), d);
}

// ── 响应模式：首页信息流广告 ──
{
  const body = JSON.stringify({ data: [
    { entityId: 1, entityTemplate: 'feed', title: '正常动态' },
    { entityId: 8639, entityTemplate: 'sponsorCard', title: '推广' },
    { entityId: 2, entityTemplate: 'feed', title: '精选配件' },
    { entityId: 3, entityTemplate: 'feed', title: '正常2' },
    { entityId: 4, entityTemplate: 'feed', entityType: 'card', title: '红包活动' },
  ]});
  const r = await handler(resCtx('https://api.coolapk.com/v6/main/indexV8?x=1', body));
  const d = r && r.body ? JSON.parse(r.body).data : null;
  check('indexV8 去掉广告卡（保留正常动态）', d && d.map(i => i.entityId).join(',') === '1,3', d && d.map(i => i.entityId));
}

// ── 响应模式：评论区广告位 ──
{
  const body = JSON.stringify({ data: [{ id: 11 }, { t: '广告位' }, { id: 12 }, { entityTemplate: 'sponsorCard', id: 13 }] });
  const r = await handler(resCtx('https://api.coolapk.com/v6/feed/replyList?id=9', body));
  const d = r && r.body ? JSON.parse(r.body).data : null;
  check('replyList 去掉无 id / 广告条目', d && d.length === 2, d);
}

// ── 响应模式：详情页商品卡 ──
{
  const body = JSON.stringify({ data: { detailSponsorCard: { a: 1 }, include_goods: [1], hotReplyRows: [{ id: 1 }, {}], topReplyRows: [] } });
  const r = await handler(resCtx('https://api.coolapk.com/v6/feed/detail?id=1', body));
  const d = r && r.body ? JSON.parse(r.body).data : null;
  check('detail 清空商品字段 / 过滤无 id 回复', d && Array.isArray(d.detailSponsorCard) && d.detailSponsorCard.length === 0 && d.hotReplyRows.length === 1, d);
}

// ── 边界：干净数据不改动、坏 JSON 放行、非 JSON 放行 ──
{
  const clean = JSON.stringify({ data: [{ entityId: 1, entityTemplate: 'feed', title: '正常' }] });
  check('无广告时放行', (await handler(resCtx('https://api.coolapk.com/v6/main/indexV8', clean))) === undefined);
  check('坏 JSON 放行', (await handler(resCtx('https://api.coolapk.com/v6/feed/replyList', '<html>'))) === undefined);
  check('空响应体放行', (await handler(resCtx('https://api.coolapk.com/v6/feed/replyList', ''))) === undefined);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
