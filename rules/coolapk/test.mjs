import handler from './coolapk.mjs';

function ctx(url, body) {
  return {
    request: { url, method: 'GET', headers: {} },
    response: { status: 200, headers: {}, text: async () => body },
  };
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('✓', name); }
  else { fail++; console.log('✗', name, extra === undefined ? '' : JSON.stringify(extra)); }
}

// 1. 首页信息流广告
const indexV8 = JSON.stringify({ data: [
  { entityId: 1, title: '正常内容' },
  { entityId: 8639, entityTemplate: 'sponsorCard', title: '推广' },
  { entityId: 2, title: '值得买' },
  { entityId: 3, title: '正常2' },
]});
let r = await handler(ctx('https://api.coolapk.com/v6/main/indexV8?x=1', indexV8));
let d = r && r.body ? JSON.parse(r.body).data : null;
check('indexV8 去掉 sponsorCard/值得买', d && d.length === 2 && d.every(i => [1, 3].includes(i.entityId)), d);

// 2. 评论广告（无 id 的占位条目）
const replies = JSON.stringify({ data: [{ id: 11, t: 'a' }, { t: '广告位' }, { id: 12, t: 'b' }] });
r = await handler(ctx('https://api.coolapk.com/v6/feed/replyList?id=9', replies));
d = r && r.body ? JSON.parse(r.body).data : null;
check('replyList 去掉无 id 条目', d && d.length === 2, d);

// 3. 详情页商品卡
const detail = JSON.stringify({ data: { hotReplyRows: [{ id: 1 }, {}], topReplyRows: [], detailSponsorCard: { a: 1 }, include_goods: [1], include_goods_ids: [2] } });
r = await handler(ctx('https://api.coolapk.com/v6/feed/detail?id=1', detail));
d = r && r.body ? JSON.parse(r.body).data : null;
check('detail 清空商品字段', d && d.detailSponsorCard === undefined || (d && Array.isArray(d.detailSponsorCard) && d.detailSponsorCard.length === 0), d);

// 4. 干净数据不该被改动（返回 undefined = 放行）
const clean = JSON.stringify({ data: [{ id: 1, title: '正常' }] });
r = await handler(ctx('https://api.coolapk.com/v6/main/indexV8', clean));
check('无广告时放行', r === undefined, r);

// 5. 非法 JSON 不崩、放行
r = await handler(ctx('https://api.coolapk.com/v6/feed/replyList', '<html>oops'));
check('非法 JSON 放行', r === undefined, r);

// 6. 非目标 URL 放行
r = await handler(ctx('https://api.coolapk.com/v6/user/profile', '{"data":1}'));
check('非匹配 URL 放行', r === undefined, r);

// 7. JSON 字段缺失（data 为 null）不崩
r = await handler(ctx('https://api.coolapk.com/v6/page/dataList?x', '{"data":null}'));
check('data 为 null 不崩', r === undefined, r);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
