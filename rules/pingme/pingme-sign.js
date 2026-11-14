/*
@Name：PingMe 自动签到（仅签到，不含视频奖励）
@Author：怎么肥事 / 奶思 / yaowuliu
@date 2026-11-13

仅保留签到：按「每账号上次确认成功的时刻」满 24 小时才再签，失败就等下一个整点自动重试。
看视频得奖励已拆到独立的 pingme-video.js，各自独立 cron。

【Egern】由 pingme.yaml 的 schedule 调用，cron 默认 "30 * * * *"：
  全天每小时第 30 分触发一次，脚本不做任何"目标小时"判断，只看每个账号距上次「服务端确认成功」
  是否已满 24 小时：不足则本次跳过，满了（或从来没有成功记录）就签。成功才写时间戳，业务失败 /
  非 JSON / HTTP 非 2xx / 网络错误一律不写，下个整点继续重试。
*/
const SCRIPT_VER = 'sign-v2.0.0';
const NAME = 'PingMe签到';
const STORE_KEY = 'pingme_accounts_v1';   // 抓包脚本写入的多账号仓库
const LEGACY_KEY = 'pingme_capture_v3';   // 兼容单账号抓包格式
const LAST_OK_KEY = 'pingme_sign_last_ok_v2'; // 每账号上次「服务端确认成功」的毫秒时间戳
const OLD_RUN_KEY = 'pingme_sign_last_run_v1'; // 旧版：按自然日写的 "Y-M-D" 字符串，只保留不读、不作为成功依据
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';

/* 服务端按 24 小时判定，本地闸门同样按 24 小时（不是自然日） */
const INTERVAL_MS = 24 * 3600 * 1000;

const $ = {
  getdata(k) { try { return $persistentStore.read(k); } catch (e) { return null; } },
  setdata(v, k) { try { return $persistentStore.write(v, k); } catch (e) { return false; } },
  log(...a) { console.log(`[${NAME}] ` + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); },
  get(url, headers) {
    return new Promise((resolve, reject) => {
      try {
        $httpClient.get({ url, headers, timeout: 20 }, (err, resp, body) => {
          if (err) return reject({ error: err.error || String(err) });
          resolve({ status: (resp && (resp.status || resp.statusCode)) || 200, body });
        });
      } catch (e) { reject({ error: String(e) }); }
    });
  },
  msg(title, subtitle, body) { try { $notification.post(title, subtitle || '', body || ''); } catch (e) {} },
  done(v) { try { $done(v || {}); } catch (e) {} }
};

/* ---------------- 时间判定：只有「确认成功时刻」才是依据 ---------------- */
function loadOkMap() {
  const raw = $.getdata(LAST_OK_KEY);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return {};
    const out = {};
    Object.keys(obj).forEach(k => { if (typeof obj[k] === 'number' && Number.isFinite(obj[k])) out[k] = obj[k]; });
    return out;
  } catch (e) { return {}; }
}

function lastOkAt(id) {
  const v = loadOkMap()[id];
  return typeof v === 'number' ? v : null;
}

/* 距上次确认成功不足 24 小时 → 本次不发请求。
   旧键（pingme_sign_last_run_v1，日期字符串）不参与判定：它曾经把「只收到响应」当成功，
   甚至把失败/未满 24h 也记成当天已处理，不能作为成功时间戳，忽略它才能真正按时重试。 */
function needWait(id, nowMs) {
  const t = lastOkAt(id);
  if (t == null) return false;
  return nowMs - t < INTERVAL_MS;
}

/* 保守记录：以「本地收到服务端成功响应」的时刻为准（略晚于服务端受理时刻），
   保证下一次重试一定在服务端 24h 之后，不会被服务端判「未满 24 小时」。 */
function markSuccessAt(id, nowMs) {
  const m = loadOkMap();
  m[id] = nowMs;
  $.setdata(JSON.stringify(m), LAST_OK_KEY);
}

/* ---------------- 签名与请求 ---------------- */
function MD5(string) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
  function ConvertToWordArray(str) {
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1).fill(0);
    let lBytePosition = 0, lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] |= str.charCodeAt(lByteCount) << lBytePosition;
      lByteCount++;
    }
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] |= 0x80 << lBytePosition;
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue) {
    let WordToHexValue = '';
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue += WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  const x = ConvertToWordArray(string);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22, S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23, S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a,b,c,d,x[k+0],S11,0xD76AA478); d = FF(d,a,b,c,x[k+1],S12,0xE8C7B756); c = FF(c,d,a,b,x[k+2],S13,0x242070DB); b = FF(b,c,d,a,x[k+3],S14,0xC1BDCEEE);
    a = FF(a,b,c,d,x[k+4],S11,0xF57C0FAF); d = FF(d,a,b,c,x[k+5],S12,0x4787C62A); c = FF(c,d,a,b,x[k+6],S13,0xA8304613); b = FF(b,c,d,a,x[k+7],S14,0xFD469501);
    a = FF(a,b,c,d,x[k+8],S11,0x698098D8); d = FF(d,a,b,c,x[k+9],S12,0x8B44F7AF); c = FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1); b = FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a = FF(a,b,c,d,x[k+12],S11,0x6B901122); d = FF(d,a,b,c,x[k+13],S12,0xFD987193); c = FF(c,d,a,b,x[k+14],S13,0xA679438E); b = FF(b,c,d,a,x[k+15],S14,0x49B40821);
    a = GG(a,b,c,d,x[k+1],S21,0xF61E2562); d = GG(d,a,b,c,x[k+6],S22,0xC040B340); c = GG(c,d,a,b,x[k+11],S23,0x265E5A51); b = GG(b,c,d,a,x[k+0],S24,0xE9B6C7AA);
    a = GG(a,b,c,d,x[k+5],S21,0xD62F105D); d = GG(d,a,b,c,x[k+10],S22,0x02441453); c = GG(c,d,a,b,x[k+15],S23,0xD8A1E681); b = GG(b,c,d,a,x[k+4],S24,0xE7D3FBC8);
    a = GG(a,b,c,d,x[k+9],S21,0x21E1CDE6); d = GG(d,a,b,c,x[k+14],S22,0xC33707D6); c = GG(c,d,a,b,x[k+3],S23,0xF4D50D87); b = GG(b,c,d,a,x[k+8],S24,0x455A14ED);
    a = GG(a,b,c,d,x[k+13],S21,0xA9E3E905); d = GG(d,a,b,c,x[k+2],S22,0xFCEFA3F8); c = GG(c,d,a,b,x[k+7],S23,0x676F02D9); b = GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    a = HH(a,b,c,d,x[k+5],S31,0xFFFA3942); d = HH(d,a,b,c,x[k+8],S32,0x8771F681); c = HH(c,d,a,b,x[k+11],S33,0x6D9D6122); b = HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a = HH(a,b,c,d,x[k+1],S31,0xA4BEEA44); d = HH(d,a,b,c,x[k+4],S32,0x4BDECFA9); c = HH(c,d,a,b,x[k+7],S33,0xF6BB4B60); b = HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a = HH(a,b,c,d,x[k+13],S31,0x289B7EC6); d = HH(d,a,b,c,x[k+0],S32,0xEAA127FA); c = HH(c,d,a,b,x[k+3],S33,0xD4EF3085); b = HH(b,c,d,a,x[k+6],S34,0x04881D05);
    a = HH(a,b,c,d,x[k+9],S31,0xD9D4D039); d = HH(d,a,b,c,x[k+12],S32,0xE6DB99E5); c = HH(c,d,a,b,x[k+15],S33,0x1FA27CF8); b = HH(b,c,d,a,x[k+2],S34,0xC4AC5665);
    a = II(a,b,c,d,x[k+0],S41,0xF4292244); d = II(d,a,b,c,x[k+7],S42,0x432AFF97); c = II(c,d,a,b,x[k+14],S43,0xAB9423A7); b = II(b,c,d,a,x[k+5],S44,0xFC93A039);
    a = II(a,b,c,d,x[k+12],S41,0x655B59C3); d = II(d,a,b,c,x[k+3],S42,0x8F0CCC92); c = II(c,d,a,b,x[k+10],S43,0xFFEFF47D); b = II(b,c,d,a,x[k+1],S44,0x85845DD1);
    a = II(a,b,c,d,x[k+8],S41,0x6FA87E4F); d = II(d,a,b,c,x[k+15],S42,0xFE2CE6E0); c = II(c,d,a,b,x[k+6],S43,0xA3014314); b = II(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a = II(a,b,c,d,x[k+4],S41,0xF7537E82); d = II(d,a,b,c,x[k+11],S42,0xBD3AF235); c = II(c,d,a,b,x[k+2],S43,0x2AD7D2BB); b = II(b,c,d,a,x[k+9],S44,0xEB86D391);
    a = AddUnsigned(a,AA); b = AddUnsigned(b,BB); c = AddUnsigned(c,CC); d = AddUnsigned(d,DD);
  }
  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

function getUTCSignDate() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}

function parseRawQuery(url) {
  const query = (url.split('?')[1] || '').split('#')[0];
  const rawMap = {};
  query.split('&').forEach(pair => {
    if (!pair) return;
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    rawMap[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  return rawMap;
}

function buildSignedParamsRaw(capture) {
  const params = {};
  Object.keys(capture.paramsRaw || {}).forEach(k => {
    if (k !== 'sign' && k !== 'signDate') params[k] = capture.paramsRaw[k];
  });
  params.signDate = getUTCSignDate();
  const signBase = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  params.sign = MD5(signBase + SECRET);
  return params;
}

function buildUrl(path, capture) {
  const params = buildSignedParamsRaw(capture);
  const qs = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

function buildHeaders(capture) {
  const headers = {};
  Object.keys(capture.headers || {}).forEach(k => {
    const lk = k.toLowerCase();
    if (['content-length', ':authority', ':method', ':path', ':scheme', 'connection', 'proxy-connection', 'keep-alive'].indexOf(lk) !== -1) return;
    headers[k] = capture.headers[k];
  });
  headers['Host'] = 'api.pingmeapp.net';
  headers['Accept'] = headers['Accept'] || headers['accept'] || 'application/json';
  return headers;
}

/* ---------------- 账号 ---------------- */
function getEmail(acc) {
  if (acc && acc.email) return acc.email;
  const raw = acc && acc.capture && acc.capture.paramsRaw ? (acc.capture.paramsRaw.email || '') : '';
  try { return decodeURIComponent(raw); } catch (e) { return raw; }
}

function loadAccounts() {
  const out = { store: null, list: [] };
  const raw = $.getdata(STORE_KEY);
  if (raw) {
    try {
      const store = JSON.parse(raw);
      const accounts = store.accounts || {};
      const order = Array.isArray(store.order) ? store.order : Object.keys(accounts);
      out.store = { version: store.version || 1, accounts, order };
      out.list = order.filter(id => accounts[id]).map((id, i) => ({
        id, alias: accounts[id].alias || `账号${i + 1}`, email: getEmail(accounts[id]),
        capture: accounts[id].capture, baseUA: accounts[id].baseUA, uaSeed: accounts[id].uaSeed || 0
      }));
      if (out.list.length) return out;
    } catch (e) { $.log('账号仓库解析失败', String(e)); }
  }
  // 兼容 pingmeqd.js 时代的单账号抓包键
  const legacy = $.getdata(LEGACY_KEY);
  if (legacy) {
    try {
      const obj = JSON.parse(legacy);
      const cap = obj && obj.paramsRaw ? obj : (obj && obj.capture ? obj.capture : null);
      if (cap && cap.paramsRaw) {
        out.list = [{ id: 'legacy', alias: '账号1', email: '', capture: cap }];
      }
    } catch (e) { $.log('单账号仓库解析失败', String(e)); }
  }
  return out;
}

function removeAccount(id) {
  if (!id || id === 'legacy') return false;
  const raw = $.getdata(STORE_KEY);
  if (!raw) return false;
  try {
    const store = JSON.parse(raw);
    if (!store.accounts || !store.accounts[id]) return false;
    delete store.accounts[id];
    store.order = (store.order || []).filter(x => x !== id);
    $.setdata(JSON.stringify(store), STORE_KEY);
    return true;
  } catch (e) { return false; }
}

function isDeregistered(msg) { return typeof msg === 'string' && msg.indexOf('已被注销') !== -1; }

/* ---------------- 单个账号签到 ---------------- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function signAccount(acc) {
  const headers = buildHeaders(acc.capture);
  const msgs = [];
  const flag = { deregistered: false, networkFail: false };

  function fetchApi(path, n) {
    n = n || 1;
    return $.get(buildUrl(path, acc.capture), headers).catch(err => {
      const m = (err && err.error) || '';
      if (n < 3 && /SSL|SSLSessionState|timeout|timed out|reset|connection|network|stream closed|closed|EOF/i.test(m)) {
        return sleep(1500).then(() => fetchApi(path, n + 1));
      }
      throw err;
    });
  }

  return fetchApi('queryBalanceAndBonus').then(res => {
    try {
      const d = JSON.parse(res.body);
      if (d.retcode === 0) msgs.push(`💰 运行前余额：${d.result.balance} Coins`);
      else { msgs.push(`⚠️ 查询：${d.retmsg}`); if (isDeregistered(d.retmsg)) flag.deregistered = true; }
    } catch (e) { msgs.push('❌ 查询：解析失败'); }
    if (flag.deregistered) return null;
    return fetchApi('checkIn');
  }).then(res => {
    if (!res) return null;
    // 只有 HTTP 2xx + JSON retcode===0 才算「服务端确认成功」，才写成功时间戳。
    // 业务失败 / 非 JSON / HTTP 非 2xx / 网络错误 一律不写，交给下一个整点重试。
    if (!(typeof res.status === 'number' && res.status >= 200 && res.status < 300)) {
      msgs.push(`❌ 签到：HTTP ${res.status}（未确认成功，下个整点重试）`);
      return fetchApi('queryBalanceAndBonus');
    }
    let d = null;
    try { d = JSON.parse(res.body); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') {
      msgs.push('❌ 签到：响应不是 JSON（未确认成功，下个整点重试）');
      return fetchApi('queryBalanceAndBonus');
    }
    if (d.retcode === 0) {
      markSuccessAt(acc.id, Date.now());
      msgs.push(`✅ 签到：${(d.result && d.result.bonusHint ? d.result.bonusHint : (d.retmsg || '')).replace(/\n/g, ' ')}`);
    } else {
      msgs.push(`⚠️ 签到：${d.retmsg}（未确认成功，下个整点重试）`);
      if (isDeregistered(d.retmsg)) flag.deregistered = true;
    }
    return fetchApi('queryBalanceAndBonus');
  }).then(res => {
    if (res) {
      try {
        const d = JSON.parse(res.body);
        if (d.retcode === 0) msgs.unshift(`💰 最新余额：${d.result.balance} Coins`);
      } catch (e) { $.log('查询最新余额解析失败'); }
    }
    return { msgs, flag };
  }).catch(err => {
    flag.networkFail = true;
    msgs.push(`❌ 网络请求失败，稍后整点会自动重试：${(err && err.error) || String(err)}`);
    return { msgs, flag };
  });
}

/* ---------------- 主流程 ---------------- */
async function main() {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const hhmm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  $.log(`触发时间 ${hhmm}，按每账号上次确认成功时刻判断是否满 24h`);

  const { list } = loadAccounts();
  if (!list.length) {
    $.msg(`⚠️ ${NAME}`, '未抓到任何账号', '请先打开 PingMe 触发一次抓包');
    return $.done();
  }

  // 只看 24h：不足的跳过，满了或从未成功过的进入待签队列
  const pending = [];
  let waitCount = 0;
  list.forEach(acc => {
    if (needWait(acc.id, nowMs)) { waitCount++; return; }
    pending.push(acc);
  });

  if (!pending.length) {
    $.log(`全部 ${waitCount} 个账号距上次确认成功不足 24 小时，本次跳过`);
    return $.done();
  }

  const texts = [];
  const dead = [];
  for (let i = 0; i < pending.length; i++) {
    const acc = pending[i];
    const tag = `【账号${i + 1}/${pending.length} ${acc.alias}】` + (acc.email ? `\n📧 ${acc.email}` : '');
    const r = await signAccount(acc);
    texts.push(tag + '\n' + r.msgs.join('\n'));
    if (r.flag.deregistered && removeAccount(acc.id)) dead.push(acc.alias);
    if (i < pending.length - 1) await sleep(2500);
  }

  let extra = '';
  if (dead.length) extra = `\n———\n🗑 已移除注销账号：${dead.join('、')}`;
  $.msg(`🎉 ${NAME} 完成`, 'PingMe 自动签到', texts.join('\n———\n') + extra);
  $.log(`${SCRIPT_VER} 结束`);
  $.done();
}

main().catch(e => {
  $.log('异常', String(e));
  $.msg(`❌ ${NAME} 异常`, '', String(e));
  $.done();
});
