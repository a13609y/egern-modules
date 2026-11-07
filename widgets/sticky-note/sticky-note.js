/**
 * 便签 · Sticky Note（Egern 小组件）
 * 文字全部来自模块参数：LINE1..LINE8（或 NOTE 多行）、TITLE、FOOTER，留空即不显示。
 * 样式 9 种预设，可用 STYLE 切换；颜色 / 装饰 / 横线 / 字体 / 对齐 / 字号均可单独覆盖。
 *
 * 设计约束（务必遵守，改代码前先看）：
 *  1. 每一行文字都是「固定高度的小盒子 + maxLines:1 + minScale」，宁可缩字也不换行/溢出。
 *  2. 行数 = 可用高度 / 行高，放不下就少显示一行，绝不挤压。
 *  3. 背景 SVG 的 viewBox 直接取真实画布尺寸，天然 1:1，不会因等比填充错位。
 */

const VERSION = '1.0.0';

const FAMILY = {
  systemSmall: { w: 155, h: 155, pad: 14, padV: 10, title: 17, body: 15, foot: 11 },
  systemMedium: { w: 329, h: 155, pad: 14, padV: 10, title: 17, body: 15, foot: 11 },
  systemLarge: { w: 329, h: 345, pad: 18, padV: 14, title: 21, body: 15, foot: 12 },
  systemExtraLarge: { w: 345, h: 345, pad: 18, title: 21, body: 15, foot: 12 },
  accessoryRectangular: { w: 160, h: 72, pad: 2, title: 13, body: 15, foot: 10 },
  accessoryCircular: { w: 76, h: 76, pad: 2, title: 12, body: 13, foot: 10 },
  accessoryInline: { w: 160, h: 22, pad: 0, title: 12, body: 13, foot: 10 }
};

// ── 样式预设 ─────────────────────────────────────────────
// paper 纸色 / ink 字色 / accent 标题色 / rule 横线色 / ruled 默认横线 / grid 方格 / decor 默认装饰
const STYLES = {
  paper: {
    label: '米白信纸',
    paper: '#FBF7EE', ink: '#3C342A', accent: '#8A6A3D',
    rule: '#8C7350', ruleAlpha: 0.22, ruled: true, grid: false, decor: 'tape'
  },
  sticky: {
    label: '黄色便利贴',
    paper: '#FFF3A6', ink: '#4A3A0F', accent: '#A87C18',
    rule: '#96802A', ruleAlpha: 0.18, ruled: false, grid: false, decor: 'none'
  },
  rose: {
    label: '粉色便签',
    paper: '#FFDCE5', ink: '#5B2337', accent: '#C2456E',
    rule: '#C2456E', ruleAlpha: 0.16, ruled: false, grid: false, decor: 'tape'
  },
  memo: {
    label: '备忘录白',
    paper: '#FFFFFF', ink: '#1C1C1E', accent: '#D0A93E',
    rule: '#000000', ruleAlpha: 0.07, ruled: false, grid: false, decor: 'clip'
  },
  kraft: {
    label: '牛皮纸',
    paper: '#D9BE96', ink: '#3A2A16', accent: '#6B4622',
    rule: '#4A3016', ruleAlpha: 0.22, ruled: true, grid: false, decor: 'tape'
  },
  grid: {
    label: '方格纸',
    paper: '#F8FBFF', ink: '#22303A', accent: '#3F7C9E',
    rule: '#5A96BE', ruleAlpha: 0.20, ruled: false, grid: true, decor: 'tape'
  },
  chalk: {
    label: '黑板',
    paper: '#2C3330', ink: '#EEF0E9', accent: '#9FD8A6',
    rule: '#FFFFFF', ruleAlpha: 0.10, ruled: false, grid: false, decor: 'none'
  },
  night: {
    label: '深蓝夜',
    paper: '#1E2A44', ink: '#E6ECF7', accent: '#7FB0FF',
    rule: '#FFFFFF', ruleAlpha: 0.08, ruled: false, grid: false, decor: 'none'
  },
  transparent: {
    label: '透明',
    paper: 'transparent', ink: { light: '#1C1C1E', dark: '#FFFFFF' },
    accent: { light: '#8A6A3D', dark: '#E3C27A' },
    rule: '#FFFFFF', ruleAlpha: 0.06, ruled: false, grid: false, decor: 'none',
    border: { light: 'rgba(0,0,0,0.10)', dark: 'rgba(255,255,255,0.16)' }
  }
};

const FONTS = {
  system: null,
  kaiti: 'Kaiti SC',
  songti: 'Songti SC',
  mono: 'Menlo',
  pingfang: 'PingFang SC'
};

// ── 小工具 ───────────────────────────────────────────────
function str(v) {
  return v === undefined || v === null ? '' : String(v);
}
function trim(v) {
  return str(v).replace(/\u00a0/g, ' ').trim();
}
function num(v, def) {
  const n = parseFloat(str(v).replace(/[^\d.+-]/g, ''));
  return Number.isFinite(n) ? n : def;
}
function pick(v, allowed, def) {
  const s = trim(v).toLowerCase();
  return allowed.indexOf(s) >= 0 ? s : def;
}
function bool(v, def) {
  const s = trim(v).toLowerCase();
  if (['1', 'true', 'yes', 'on', '开'].indexOf(s) >= 0) return true;
  if (['0', 'false', 'no', 'off', '关'].indexOf(s) >= 0) return false;
  return def;
}
function hexToRgba(color, alpha) {
  const a = typeof alpha === 'number' ? alpha : 1;
  const c = trim(color);
  if (/^#[0-9a-f]{6}$/i.test(c)) {
    return 'rgba(' + parseInt(c.slice(1, 3), 16) + ',' + parseInt(c.slice(3, 5), 16) + ',' + parseInt(c.slice(5, 7), 16) + ',' + a + ')';
  }
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return hexToRgba('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3], a);
  }
  return c;
}
function svgUri(svg) {
  // ASCII-only SVG；百分号编码最稳，Base64 需要 btoa（部分运行时缺失）
  return 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27');
}
function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function fmt(tpl, d) {
  return str(tpl)
    .replace(/\{date\}/g, (d.getMonth() + 1) + '月' + d.getDate() + '日')
    .replace(/\{md\}/g, pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()))
    .replace(/\{yyyy\}/g, String(d.getFullYear()))
    .replace(/\{mm\}/g, pad2(d.getMonth() + 1))
    .replace(/\{dd\}/g, pad2(d.getDate()))
    .replace(/\{weekday\}/g, WEEK[d.getDay()])
    .replace(/\{time\}/g, pad2(d.getHours()) + ':' + pad2(d.getMinutes()))
    .replace(/\{MM\}/g, String(d.getMonth() + 1) + '月')
    .replace(/\{D\}/g, String(d.getDate()));
}

// ── 参数解析 ─────────────────────────────────────────────
function readLines(env) {
  const note = str(env.NOTE);
  let raw;
  if (trim(note)) {
    raw = note.replace(/\r\n?/g, '\n').split('\n');
  } else {
    raw = [];
    for (let i = 1; i <= 8; i++) raw.push(str(env['LINE' + i]));
  }
  while (raw.length && !trim(raw[raw.length - 1])) raw.pop();
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const t = str(raw[i]).replace(/\u00a0/g, ' ').trim();
    if (t === '-') out.push('');        // 单个 - 表示空行
    else if (t) out.push(t);
  }
  return out;
}

function readConfig(env) {
  const styleKey = pick(env.STYLE, Object.keys(STYLES), 'paper');
  const st = STYLES[styleKey];
  const ruledMode = pick(env.RULED, ['auto', 'on', 'off'], 'auto');
  const decorMode = pick(env.DECOR, ['auto', 'tape', 'pin', 'clip', 'none'], 'auto');
  return {
    styleKey: styleKey,
    style: st,
    paper: trim(env.COLOR) || st.paper,
    ink: trim(env.INK) || st.ink,
    accent: trim(env.ACCENT) || st.accent,
    rule: (function () {
      const custom = trim(env.RULE);
      if (custom) return hexToRgba(custom, 1);
      if (styleKey === 'transparent') {
        // 透明样式没有纸色，白线看不见，改用字色淡淡一条
        return typeof st.ink === 'string' ? hexToRgba(st.ink, 0.15) : 'rgba(128,128,128,0.28)';
      }
      return hexToRgba(st.rule, st.ruleAlpha);
    })(),
    ruled: ruledMode === 'auto' ? !!st.ruled : ruledMode === 'on',
    grid: !!st.grid,
    decor: decorMode === 'auto' ? st.decor : decorMode,
    font: FONTS[pick(env.FONT, Object.keys(FONTS), 'system')] || null,
    align: pick(env.ALIGN, ['left', 'center', 'right'], 'center'),
    size: (function () { const v = num(env.SIZE, 15); return v >= 10 ? v : 15; })(),
    lockSize: (function () { const v = num(env.LOCK_SIZE, 15); return v >= 9 && v <= 32 ? v : 15; })(),
    bullet: trim(env.BULLET),
    title: trim(env.TITLE),
    footer: trim(env.FOOTER),
    url: trim(env.URL),
    stamp: pick(env.STAMP, ['on', 'off'], 'on') === 'on',
    stampColor: trim(env.STAMP_COLOR),
    debug: pick(env.DEBUG, ['on', 'off'], 'off') === 'on',
    stampSize: (function () { const v = num(env.STAMP_SIZE, 30); return v >= 15 && v <= 100 ? v : 30; })(),
    stampPos: (function () {
      const raw = trim(env.STAMP_POS).toLowerCase();
      const alias = { '右上': 'top-right', '左上': 'top-left', '右下': 'bottom-right', '左下': 'bottom-left', tr: 'top-right', tl: 'top-left', br: 'bottom-right', bl: 'bottom-left' };
      const v = alias[raw] || raw;
      return ['top-right', 'top-left', 'bottom-right', 'bottom-left'].indexOf(v) >= 0 ? v : 'top-right';
    })(),
    hours: Math.min(72, Math.max(0, num(env.REFRESH_HOURS, 6)))
  };
}


// ── 画布识别 ─────────────────────────────────────────────
// Egern 各版本传进来的 ctx.widgetFamily 可能是 systemSmall / small / 空，
// 名字对不上就会退到中号默认值（这正是「只有中号能显示」的原因）。
const FAMILY_ALIAS = {
  systemsmall: 'systemSmall', small: 'systemSmall',
  systemmedium: 'systemMedium', medium: 'systemMedium',
  systemlarge: 'systemLarge', large: 'systemLarge',
  systemextralarge: 'systemExtraLarge', extralarge: 'systemExtraLarge', xl: 'systemExtraLarge',
  accessoryrectangular: 'accessoryRectangular',
  accessorycircular: 'accessoryCircular',
  accessoryinline: 'accessoryInline'
};

function rawFamily(ctx) {
  if (!ctx) return '';
  return String(ctx.widgetFamily || ctx.family || ctx.widget_family || '');
}

function sizeObject(ctx) {
  if (!ctx) return null;
  const cand = ctx.size || ctx.widgetSize || ctx.widget_size;
  if (!cand) return null;
  const w = num(cand.width !== undefined ? cand.width : cand.w, 0);
  const h = num(cand.height !== undefined ? cand.height : cand.h, 0);
  if (!(w > 0) || !(h > 0)) return null;
  return { w: w, h: h };
}

function resolveFamily(ctx) {
  const raw = rawFamily(ctx).trim().toLowerCase();
  if (FAMILY_ALIAS[raw]) return FAMILY_ALIAS[raw];
  // 兜一层关键字匹配：widgetSmall / system_small / SMALL 之类都能认
  const key = raw.replace(/[^a-z]/g, '');
  if (key) {
    if (key.indexOf('accessory') === 0) {
      if (key.indexOf('rect') >= 0) return 'accessoryRectangular';
      if (key.indexOf('circle') >= 0) return 'accessoryCircular';
      if (key.indexOf('inline') >= 0) return 'accessoryInline';
    }
    if (key.indexOf('extralarge') >= 0) return 'systemExtraLarge';
    if (key.indexOf('small') >= 0) return 'systemSmall';
    if (key.indexOf('large') >= 0) return 'systemLarge';
    if (key.indexOf('medium') >= 0) return 'systemMedium';
  }
  // 名字不认识：用画布尺寸反推（小号近似正方形、中号很扁、大号很高）
  const s = sizeObject(ctx);
  if (s) {
    if (s.h > 250) return 'systemLarge';
    if (s.w > 240 && s.h < 220) return 'systemMedium';
    if (Math.abs(s.w - s.h) <= 40) return 'systemSmall';
  }
  return 'systemMedium';
}

// ── 画布 ─────────────────────────────────────────────────
function readCanvas(ctx, family) {
  const f = FAMILY[family] || FAMILY.systemMedium;
  const s = sizeObject(ctx);
  let w = f.w, h = f.h;
  if (s) {
    // 合理区间内才采信，避免某些版本给出像素值把排版撑爆
    const ratio = s.w / s.h;
    if (ratio > 0.3 && ratio < 3.2 && s.w >= 80 && s.w <= 1400) { w = s.w; h = s.h; }
  }
  return { family: family, w: Math.round(w), h: Math.round(h) };
}

const DEFAULT_LIMIT = { systemSmall: 4, systemMedium: 4, systemLarge: 8, systemExtraLarge: 8 };

function limitFor(family, env) {
  const key = family === 'systemSmall' ? 'LINES_S' : family === 'systemLarge' ? 'LINES_L' : 'LINES_M';
  const v = trim(env[key]).toLowerCase();
  if (!v || v === 'auto') return DEFAULT_LIMIT[family] || 4;
  const n = num(v, 0);
  return n > 0 ? Math.floor(n) : (DEFAULT_LIMIT[family] || 4);
}

// ── 排版计算 ─────────────────────────────────────────────
// 优先级：把用户写的所有行都放下 → 放不下就逐档缩字（最小 9pt）→ 还放不下才截断
function computeLayout(canvas, cfg, lineCount, cap) {
  const f = FAMILY[canvas.family] || FAMILY.systemMedium;
    const decorH = ({ tape: 8, pin: 12, clip: 24 })[cfg.decor] || 0;
  const padTop = (f.padV || f.pad) + decorH;
  const padBottom = f.padV || f.pad;
  const availH = canvas.h - padTop - padBottom;
  const hasTitle = !!cfg.title;
  const hasFoot = !!cfg.footer;
  const s = cfg.size > 0 ? cfg.size : f.body;      // 固定字号，永不为塞行数缩字
  const titleSize = Math.max(12, Math.round(s * 1.18));
  const footSize = Math.max(9, Math.round(s * 0.75));
  const titleH = hasTitle ? Math.round(titleSize * 1.35) : 0;
  const footH = hasFoot ? Math.round(footSize * 1.4) : 0;
  const gapT = hasTitle ? 5 : 0;
  const gapF = hasFoot ? 5 : 0;
  const baseLineH = Math.round(s * 1.32);
  const bodyH = availH - titleH - gapT - footH - gapF;
  const fit = Math.max(0, Math.floor(bodyH / baseLineH));
  const shownN = Math.max(1, Math.min(fit, lineCount, cap > 0 ? cap : lineCount));
  // 行数少就把行距撑开铺满，避免下半屏空着（上限 2.2 倍字号，太散反而难看）
  const maxLineH = Math.round(s * (canvas.family === 'systemLarge' ? 2.8 : 2.2));
  const lineH = shownN >= 2 ? Math.min(maxLineH, Math.max(baseLineH, Math.floor(bodyH / shownN))) : baseLineH;
  const pick2 = { bodySize: s, titleSize: titleSize, footSize: footSize, titleH: titleH, footH: footH, gapT: gapT, gapF: gapF, lineH: lineH, bodyH: bodyH, fit: fit };
  pick2.padTop = padTop;
  pick2.padBottom = padBottom;
  pick2.padL = f.pad;
  pick2.padR = f.pad;
  pick2.contentW = canvas.w - f.pad * 2;
  pick2.shown = Math.max(0, Math.min(pick2.fit, lineCount, cap > 0 ? cap : lineCount));
  return pick2;
}

// ── 装饰 / 背景 SVG ───────────────────────────────────────
function decorSvg(kind, w, accent) {
  const cx = Math.round(w / 2);
  if (kind === 'tape') {
    return "<g transform='rotate(-2.5 " + cx + " 9)'>" +
      "<rect x='" + (cx - 32) + "' y='0' width='64' height='18' fill='#FFFFFF' fill-opacity='0.55'/>" +
      "<rect x='" + (cx - 32) + "' y='0' width='64' height='18' fill='none' stroke='#000000' stroke-opacity='0.06'/>" +
      "</g>";
  }
  if (kind === 'pin') {
    return "<circle cx='" + cx + "' cy='8' r='7' fill='" + accent + "'/>" +
      "<circle cx='" + (cx - 2) + "' cy='6' r='2.4' fill='#FFFFFF' fill-opacity='0.45'/>";
  }
  if (kind === 'clip') {
    const x = cx - 5.5;
    return "<path d='M " + x + " 4 v 12 a 5.5 5.5 0 0 0 11 0 V 8 a 3.4 3.4 0 0 0 -6.8 0 V 17' " +
      "fill='none' stroke='" + accent + "' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/>";
  }
  return '';
}


const GLYPHS = {" ":[227,""],"0":[590,"M295 -14C446 -14 546 118 546 374C546 628 446 754 295 754C144 754 44 629 44 374C44 118 144 -14 295 -14ZM295 101C231 101 183 165 183 374C183 580 231 641 295 641C359 641 406 580 406 374C406 165 359 101 295 101Z"],"1":[590,"M82 0H527V120H388V741H279C232 711 182 692 107 679V587H242V120H82Z"],"2":[590,"M43 0H539V124H379C344 124 295 120 257 115C392 248 504 392 504 526C504 664 411 754 271 754C170 754 104 715 35 641L117 562C154 603 198 638 252 638C323 638 363 592 363 519C363 404 245 265 43 85Z"],"3":[590,"M273 -14C415 -14 534 64 534 200C534 298 470 360 387 383V388C465 419 510 477 510 557C510 684 413 754 270 754C183 754 112 719 48 664L124 573C167 614 210 638 263 638C326 638 362 604 362 546C362 479 318 433 183 433V327C343 327 386 282 386 209C386 143 335 106 260 106C192 106 139 139 95 182L26 89C78 30 157 -14 273 -14Z"],"4":[590,"M337 0H474V192H562V304H474V741H297L21 292V192H337ZM337 304H164L279 488C300 528 320 569 338 609H343C340 565 337 498 337 455Z"],"5":[590,"M277 -14C412 -14 535 81 535 246C535 407 432 480 307 480C273 480 247 474 218 460L232 617H501V741H105L85 381L152 338C196 366 220 376 263 376C337 376 388 328 388 242C388 155 334 106 257 106C189 106 136 140 94 181L26 87C82 32 159 -14 277 -14Z"],"6":[590,"M316 -14C442 -14 548 82 548 234C548 392 459 466 335 466C288 466 225 438 184 388C191 572 260 636 346 636C388 636 433 611 459 582L537 670C493 716 427 754 336 754C187 754 50 636 50 360C50 100 176 -14 316 -14ZM187 284C224 340 269 362 308 362C372 362 414 322 414 234C414 144 369 97 313 97C251 97 201 149 187 284Z"],"7":[590,"M186 0H334C347 289 370 441 542 651V741H50V617H383C242 421 199 257 186 0Z"],"8":[590,"M295 -14C444 -14 544 72 544 184C544 285 488 345 419 382V387C467 422 514 483 514 556C514 674 430 753 299 753C170 753 76 677 76 557C76 479 117 423 174 382V377C105 341 47 279 47 184C47 68 152 -14 295 -14ZM341 423C264 454 206 488 206 557C206 617 246 650 296 650C358 650 394 607 394 547C394 503 377 460 341 423ZM298 90C229 90 174 133 174 200C174 256 202 305 242 338C338 297 407 266 407 189C407 125 361 90 298 90Z"],"9":[590,"M255 -14C402 -14 539 107 539 387C539 644 414 754 273 754C146 754 40 659 40 507C40 350 128 274 252 274C302 274 365 304 404 354C397 169 329 106 247 106C203 106 157 129 130 159L52 70C96 25 163 -14 255 -14ZM402 459C366 401 320 379 280 379C216 379 175 420 175 507C175 598 220 643 275 643C338 643 389 593 402 459Z"],"月":[1000,"M187 802V472C187 319 174 126 21 -3C48 -20 96 -65 114 -90C208 -12 258 98 284 210H713V65C713 44 706 36 682 36C659 36 576 35 505 39C524 6 548 -52 555 -87C659 -87 729 -85 777 -64C823 -44 841 -9 841 63V802ZM311 685H713V563H311ZM311 449H713V327H304C308 369 310 411 311 449Z"],"日":[1000,"M277 335H723V109H277ZM277 453V668H723V453ZM154 789V-78H277V-12H723V-76H852V789Z"],".":[325,"M163 -14C215 -14 254 28 254 82C254 137 215 178 163 178C110 178 71 137 71 82C71 28 110 -14 163 -14Z"],"-":[370,"M49 233H322V339H49Z"],":":[325,"M163 366C215 366 254 407 254 461C254 516 215 557 163 557C110 557 71 516 71 461C71 407 110 366 163 366ZM163 -14C215 -14 254 28 254 82C254 137 215 178 163 178C110 178 71 137 71 82C71 28 110 -14 163 -14Z"],"/":[387,"M14 -181H112L360 806H263Z"],"|":[296,"M100 -284H196V851H100Z"],"A":[641,"M-4 0H146L198 190H437L489 0H645L408 741H233ZM230 305 252 386C274 463 295 547 315 628H319C341 549 361 463 384 386L406 305Z"],"B":[681,"M91 0H355C518 0 641 69 641 218C641 317 583 374 503 393V397C566 420 604 489 604 558C604 696 488 741 336 741H91ZM239 439V627H327C416 627 460 601 460 536C460 477 420 439 326 439ZM239 114V330H342C444 330 497 299 497 227C497 150 442 114 342 114Z"],"C":[656,"M392 -14C489 -14 568 24 629 95L550 187C511 144 462 114 398 114C281 114 206 211 206 372C206 531 289 627 401 627C457 627 500 601 538 565L615 659C567 709 493 754 398 754C211 754 54 611 54 367C54 120 206 -14 392 -14Z"],"D":[714,"M91 0H302C521 0 660 124 660 374C660 623 521 741 294 741H91ZM239 120V622H284C423 622 509 554 509 374C509 194 423 120 284 120Z"],"E":[615,"M91 0H556V124H239V322H498V446H239V617H545V741H91Z"],"F":[585,"M91 0H239V300H502V424H239V617H547V741H91Z"],"G":[717,"M409 -14C511 -14 599 25 650 75V409H386V288H517V142C497 124 460 114 425 114C279 114 206 211 206 372C206 531 290 627 414 627C480 627 522 600 559 565L638 659C590 708 516 754 409 754C212 754 54 611 54 367C54 120 208 -14 409 -14Z"],"H":[757,"M91 0H239V320H519V0H666V741H519V448H239V741H91Z"],"I":[330,"M91 0H239V741H91Z"],"J":[568,"M252 -14C411 -14 481 100 481 239V741H333V251C333 149 299 114 234 114C192 114 152 137 124 191L23 116C72 29 145 -14 252 -14Z"],"K":[686,"M91 0H239V208L336 333L528 0H690L424 449L650 741H487L242 419H239V741H91Z"],"L":[578,"M91 0H540V124H239V741H91Z"],"M":[853,"M91 0H224V309C224 380 212 482 205 552H209L268 378L383 67H468L582 378L642 552H647C639 482 628 380 628 309V0H763V741H599L475 393C460 348 447 299 431 252H426C411 299 397 348 381 393L255 741H91Z"],"N":[749,"M91 0H232V297C232 382 219 475 213 555H218L293 396L506 0H657V741H517V445C517 361 529 263 537 186H532L457 346L242 741H91Z"],"O":[770,"M385 -14C581 -14 716 133 716 374C716 614 581 754 385 754C189 754 54 614 54 374C54 133 189 -14 385 -14ZM385 114C275 114 206 216 206 374C206 532 275 627 385 627C495 627 565 532 565 374C565 216 495 114 385 114Z"],"P":[667,"M91 0H239V263H338C497 263 624 339 624 508C624 683 498 741 334 741H91ZM239 380V623H323C425 623 479 594 479 508C479 423 430 380 328 380Z"],"Q":[770,"M385 107C275 107 206 207 206 374C206 532 275 627 385 627C495 627 565 532 565 374C565 207 495 107 385 107ZM624 -201C678 -201 723 -192 749 -179L722 -70C701 -77 673 -83 641 -83C574 -83 507 -59 473 -3C620 35 716 171 716 374C716 614 581 754 385 754C189 754 54 614 54 374C54 162 159 23 317 -8C367 -120 473 -201 624 -201Z"],"R":[682,"M239 397V623H335C430 623 482 596 482 516C482 437 430 397 335 397ZM494 0H659L486 303C571 336 627 405 627 516C627 686 504 741 348 741H91V0H239V280H342Z"],"S":[624,"M312 -14C483 -14 584 89 584 210C584 317 525 375 435 412L338 451C275 477 223 496 223 549C223 598 263 627 328 627C390 627 439 604 486 566L561 658C501 719 415 754 328 754C179 754 72 660 72 540C72 432 148 372 223 342L321 299C387 271 433 254 433 199C433 147 392 114 315 114C250 114 179 147 127 196L42 94C114 24 213 -14 312 -14Z"],"T":[625,"M238 0H386V617H595V741H30V617H238Z"],"U":[748,"M376 -14C556 -14 661 88 661 333V741H519V320C519 166 462 114 376 114C289 114 235 166 235 320V741H88V333C88 88 194 -14 376 -14Z"],"V":[619,"M221 0H398L624 741H474L378 380C355 298 339 224 315 141H310C287 224 271 298 248 380L151 741H-5Z"],"W":[915,"M161 0H342L423 367C434 424 445 481 456 537H460C468 481 479 424 491 367L574 0H758L895 741H755L696 379C685 302 674 223 663 143H658C642 223 628 303 611 379L525 741H398L313 379C297 302 281 223 266 143H262C251 223 239 301 227 379L170 741H19Z"],"X":[627,"M15 0H171L250 164C268 202 285 241 304 286H308C329 241 348 202 366 164L449 0H613L405 375L600 741H444L374 587C358 553 342 517 324 471H320C298 517 283 553 265 587L191 741H26L222 381Z"],"Y":[580,"M217 0H364V271L587 741H433L359 560C337 505 316 453 293 396H289C266 453 246 505 225 560L151 741H-6L217 271Z"],"Z":[613,"M43 0H573V124H225L570 652V741H76V617H388L43 89Z"]};

// 印章里的文字一律用路径画：部分版本的 SVG 光栅化器不支持 <text>，
// 整张背景图会失效（iOS 桌面上表现为灰色占位图标），换成 path 就没有字体依赖了。
const GLYPH_EM = 1000;

function glyphText(str, cx, baseline, size, color, tracking) {
  const s = size / GLYPH_EM;
  const chars = Array.from(String(str));
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    const g = GLYPHS[chars[i]];
    total += (g ? g[0] : GLYPH_EM * 0.5) * s;
    if (i < chars.length - 1) total += tracking || 0;
  }
  let x = cx - total / 2;
  let out = "<g fill='" + color + "'>";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const g = GLYPHS[ch];
    if (g && g[1]) {
      out += "<path d='" + g[1] + "' transform='translate(" + x.toFixed(2) + " " + baseline + ") scale(" + s.toFixed(5) + " " + (-s).toFixed(5) + ")'/>";
    }
    x += (g ? g[0] : GLYPH_EM * 0.5) * s + (tracking || 0);
  }
  return out + "</g>";
}

// ── 今日日期印章 ─────────────────────────────────────────
// 直接画在背景 SVG 上（z 序在文字之下），不占排版空间，所以正文行数不受影响。
function prand(seed, n) {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function stampColorOf(cfg) {
  const custom = cfg.stampColor;
  if (custom && custom !== 'auto' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(custom)) return custom;
  const a = cfg.accent;
  if (typeof a === 'string' && /^#/.test(a)) return a;
  return '#AD292E';
}

function stampGroup(x, y, w, cfg, now, seed) {
  const scale = w / 600;
  const rot = (prand(seed, 1) * 4 - 2).toFixed(2);          // -2° ~ 2°，每天稳定
  const color = stampColorOf(cfg);
  const dateText = (now.getMonth() + 1) + '月' + now.getDate() + '日';
  const j = (base, n) => (base + (prand(seed + base, n) * 1.6 - 0.8)).toFixed(2);
  return "<g id='stamp' transform='translate(" + x + " " + y + ") scale(" + scale + ") rotate(" + rot + " 300 130)' opacity='0.72'>" +
    "<g fill='none' stroke='" + color + "' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='" + j(18, 2) + "' y='" + j(18, 3) + "' width='564' height='224' rx='28' stroke-width='9'/>" +
    "<rect x='" + j(30, 4) + "' y='" + j(30, 5) + "' width='540' height='200' rx='19' stroke-width='2.5'/>" +
    "<path d='M95 " + j(67, 6) + " H220 M380 " + j(67, 7) + " H505' stroke-width='2.5'/>" +
    "<path d='M95 " + j(198, 8) + " H220 M380 " + j(198, 9) + " H505' stroke-width='2.5'/>" +
    "<path d='M53 " + j(65, 10) + " Q53 " + j(48, 11) + " 70 " + j(48, 12) + " M547 " + j(65, 13) + " Q547 " + j(48, 14) + " 530 " + j(48, 15) +
    " M53 " + j(195, 16) + " Q53 " + j(212, 17) + " 70 " + j(212, 18) + " M547 " + j(195, 19) + " Q547 " + j(212, 20) + " 530 " + j(212, 21) + "' stroke-width='3'/>" +
    "<path d='M265 " + j(67, 22) + " H335 M265 " + j(198, 23) + " H335' stroke-width='2'/>" +
    "</g>" +
    glyphText('DAILY RECORD', 300, 57, 13, color, 5) +
    glyphText('PERSONAL ARCHIVE', 300, 220, 11, color, 4) +
    glyphText(dateText, 300, 155, 77, color, 1) +
    "</g>";
}

function buildStamp(canvas, cfg, now, seed) {
  if (!cfg.stamp) return '';
  const w = canvas.w, h = canvas.h;
  const sw = Math.max(40, Math.round(w * (cfg.stampSize / 100)));
  const sh = Math.round(sw * 260 / 600);
  const pad = Math.round(Math.min(w, h) * 0.04);
  const pos = cfg.stampPos || 'top-right';
  const right = pos.indexOf('right') >= 0;
  const bottom = pos.indexOf('bottom') >= 0;
  const x = right ? w - sw - pad : pad;
  const y = bottom ? h - sh - pad : pad;
  return stampGroup(x, y, sw, cfg, now, seed);
}

function buildStampLayer(canvas, cfg, now) {
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const stamp = buildStamp(canvas, cfg, now, seed);
  if (!stamp) return null;
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + canvas.w + ' ' + canvas.h +
    "' width='" + canvas.w + "' height='" + canvas.h + "'>" + stamp + '</svg>';
  return safeSvg(svg, canvas.w, canvas.h, '#000000');
}

function buildBackground(canvas, cfg, now) {
  const w = canvas.w, h = canvas.h;
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const parts = [];
  const paper = cfg.style.paper === 'transparent' ? '#000000' : cfg.paper;
  parts.push("<rect x='0' y='0' width='" + w + "' height='" + h + "' fill='" + paper + "'/>");

  if (cfg.grid) {
    const step = 18;
    const stroke = hexToRgba(cfg.style.rule, cfg.style.ruleAlpha);
    let d = '';
    for (let x = step; x < w; x += step) d += 'M' + x + ' 0V' + h;
    for (let y = step; y < h; y += step) d += 'M0 ' + y + 'H' + w;
    parts.push("<path d='" + d + "' stroke='" + stroke + "' stroke-width='1' fill='none'/>");
  }

  if (cfg.decor !== 'none') {
    const accent = typeof cfg.accent === 'string' ? cfg.accent : '#B08A3E';
    parts.push(decorSvg(cfg.decor, w, accent));
  }

  const stamp = buildStamp(canvas, cfg, now, seed);
  if (stamp) parts.push(stamp);

  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + ' ' + h + "' width='" + w + "' height='" + h + "'>" +
    parts.join('') + '</svg>';
  return safeSvg(svg, w, h, cfg.style.paper === 'transparent' ? '#000000' : cfg.paper);
}

// 万一某个数值算成 NaN/Infinity，整张 SVG 会失效（iOS 上表现为占位图标），
// 所以生成后统一兜一层：有非法值就退回纯色纸底，至少不会白板。
function safeSvg(svg, w, h, color) {
  if (/NaN|undefined|Infinity/.test(svg)) {
    return svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + " " + h + "' width='" + w + "' height='" + h + "'>" +
      "<rect x='0' y='0' width='" + w + "' height='" + h + "' fill='" + (color || '#FBF7EE') + "'/></svg>");
  }
  return svgUri(svg);
}

function buildRule(cfg, width, lineH) {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + width + ' ' + lineH + "' width='" + width + "' height='" + lineH + "'>" +
    "<rect x='0' y='" + (lineH - 1) + "' width='" + width + "' height='1' fill='" + cfg.rule + "'/>" +
    '</svg>';
  return svgUri(svg);
}

// ── 渲染 ─────────────────────────────────────────────────
function fontOf(cfg, size, weight) {
  const f = { size: size, weight: weight || 'regular' };
  if (cfg.font) f.family = cfg.font;
  return f;
}

// Egern 的定宽 stack 会把子元素居中摆放，所以「左对齐」也必须靠尾部弹性 spacer 顶出来
function alignChildren(node, align) {
  if (align === 'right') return [{ type: 'spacer' }, node];
  if (align === 'center') return [{ type: 'spacer' }, node, { type: 'spacer' }];
  return [node, { type: 'spacer' }];
}

function rowBox(width, children) {
  return { type: 'stack', direction: 'row', width: width, alignItems: 'center', children: children };
}

function wrapAlign(node, align) {
  const c = alignChildren(node, align);
  return c.length === 1 ? node : { type: 'stack', direction: 'row', alignItems: 'center', children: c };
}

function render(canvas, cfg, lines, now, cap) {
  const L = computeLayout(canvas, cfg, lines.length, cap);
  if (cap > 0) L.shown = Math.min(L.shown, cap);
  const children = [{ type: 'spacer' }];

  if (cfg.title) {
    children.push(rowBox(L.contentW, alignChildren({
      type: 'text',
      text: cfg.title,
      font: fontOf(cfg, L.titleSize, 'bold'),
      textColor: cfg.accent,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 1
    }, cfg.align)));
    children.push({ type: 'spacer', length: L.gapT });
  }

  if (lines.length === 0) {
    children.push(rowBox(L.contentW, alignChildren({
      type: 'text',
      text: '✍️ 在模块设置里写点什么',
      font: fontOf(cfg, Math.max(11, L.bodySize - 1), 'regular'),
      textColor: typeof cfg.ink === 'string' ? hexToRgba(cfg.ink, 0.5) : cfg.ink,
      textAlign: 'center',
      maxLines: 1,
      minScale: 1
    }, 'center')));
    children.push({ type: 'spacer' });
    return { L: L, children: children };
  }

  const ruleSrc = cfg.ruled ? buildRule(cfg, L.contentW, L.lineH) : null;
  const clipped = lines.slice(0, L.shown);
  for (let i = 0; i < clipped.length; i++) {
    const raw = clipped[i] === '' ? ' ' : (cfg.bullet ? cfg.bullet + ' ' + clipped[i] : clipped[i]);
    const textNode = {
      type: 'text',
      text: raw,
      font: fontOf(cfg, L.bodySize, 'regular'),
      textColor: cfg.ink,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 1
    };
    const node = {
      type: 'stack',
      direction: 'row',
      width: L.contentW,
      height: L.lineH,
      alignItems: 'center',
      children: alignChildren(textNode, cfg.align)
    };
    if (ruleSrc) node.backgroundImage = ruleSrc;
    children.push(node);
  }

  children.push({ type: 'spacer' });

  if (cfg.footer) {
    children.push({ type: 'spacer', length: L.gapF });
    children.push(rowBox(L.contentW, alignChildren({
      type: 'text',
      text: fmt(cfg.footer, now),
      font: fontOf(cfg, L.footSize, 'regular'),
      textColor: typeof cfg.ink === 'string' ? hexToRgba(cfg.ink, 0.55) : cfg.ink,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 1
    }, cfg.align)));
  }

  return { L: L, children: children };
}

function refreshAfter(cfg, now) {
  const hasDate = /\{(date|md|yyyy|mm|dd|weekday|MM|D|time)\}/.test(cfg.footer || '');
  const d = new Date(now.getTime());
  if (hasDate) {
    d.setHours(24, 2, 0, 0);
    return d.toISOString();
  }
  d.setTime(d.getTime() + Math.max(1, cfg.hours) * 3600 * 1000);
  return d.toISOString();
}


// ── 锁屏（accessory）──────────────────────────────────────
// 锁屏组件由系统用「单色 vibrancy」绘制：不能有背景、不能用自定义颜色，
// 所以这里只输出纯文字，标题一律不显示，正文最多 3 条。
function isAccessory(family) {
  return family === 'accessoryRectangular' || family === 'accessoryCircular' || family === 'accessoryInline';
}

function renderAccessory(canvas, cfg, lines, family) {
  const f = FAMILY[family] || FAMILY.accessoryRectangular;
  const items = lines.filter(function (l) { return l !== ''; }).slice(0, 3);
  const size = Math.max(9, Math.min(32, cfg.lockSize || f.body));
  const root = { type: 'widget', gap: 0, padding: [1, 0, 1, 0], refreshAfter: refreshAfter(cfg, new Date()) };

  if (items.length === 0) {
    root.children = [{
      type: 'text',
      text: '写点什么',
      font: { size: size, weight: 'regular' },
      maxLines: 1,
      minScale: 1
    }];
    if (cfg.url) root.url = cfg.url;
    return root;
  }

  if (family === 'accessoryInline') {
    root.children = [{
      type: 'text',
      text: items[0],
      font: { size: size, weight: 'regular' },
      maxLines: 1,
      minScale: 1
    }];
    if (cfg.url) root.url = cfg.url;
    return root;
  }

  if (family === 'accessoryCircular') {
    const pic = items.slice(0, 2);
    root.padding = 2;
    root.children = pic.map(function (t) {
      return {
        type: 'text',
        text: t,
        font: { size: Math.max(9, Math.round(size * 0.85)), weight: 'regular' },
        textAlign: 'center',
        maxLines: 1,
        minScale: 1
      };
    });
    if (cfg.url) root.url = cfg.url;
    return root;
  }

  // accessoryRectangular：一条一行，最多 3 条，超出部分直接不画
  const lineH = Math.round(size * 1.32);
  const width = canvas.w;
  root.children = items.map(function (t) {
    return {
      type: 'stack',
      direction: 'row',
      width: width,
      height: lineH,
      alignItems: 'center',
      children: alignChildren({
        type: 'text',
        text: t,
        font: { size: size, weight: 'regular' },
        textAlign: cfg.align,
        maxLines: 1,
        minScale: 1
      }, cfg.align)
    };
  });
  if (cfg.url) root.url = cfg.url;
  return root;
}

function buildWidget(env, ctx) {
  const family = resolveFamily(ctx);
  const now = new Date();
  const cfg = readConfig(env || {});
  const canvas = readCanvas(ctx, family);
  const lines = readLines(env || {});
  if (isAccessory(family)) return renderAccessory(canvas, cfg, lines, family);
  const cap = limitFor(family, env || {});
  const rendered = render(canvas, cfg, lines, now, cap);
  if (cfg.debug) {
    rendered.children.push({
      type: 'text',
      text: 'dbg ' + (rawFamily(ctx) || '∅') + ' / ' + canvas.family + ' / ' + canvas.w + '×' + canvas.h,
      font: { size: 8, weight: 'regular' },
      textColor: '#888888',
      maxLines: 1,
      minScale: 1
    });
  }
  const transparent = cfg.style.paper === 'transparent';

  const root = {
    type: 'widget',
    gap: 0,
    refreshAfter: refreshAfter(cfg, now),
    children: rendered.children
  };

  if (transparent) {
    root.padding = 0;
    root.children = [{
      type: 'stack',
      direction: 'column',
      alignItems: 'start',
      gap: 0,
      width: canvas.w,
      height: canvas.h,
      padding: [rendered.L.padTop, rendered.L.padL, rendered.L.padBottom, rendered.L.padR],
      borderWidth: 1,
      borderColor: cfg.style.border,
      borderRadius: 16,
      children: rendered.children
    }];
    const stampLayer = buildStampLayer(canvas, cfg, now);
    if (stampLayer) root.children[0].backgroundImage = stampLayer;
  } else {
    root.padding = [rendered.L.padTop, rendered.L.padL, rendered.L.padBottom, rendered.L.padR];
    root.backgroundColor = cfg.paper;
    root.backgroundImage = buildBackground(canvas, cfg, now);
  }
  if (cfg.url) root.url = cfg.url;
  return root;
}

function fallback(ctx, err) {
  const family = resolveFamily(ctx);
  const f = FAMILY[family] || FAMILY.systemMedium;
  return {
    type: 'widget',
    padding: 14,
    backgroundColor: '#FFF3A6',
    refreshAfter: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    children: [{
      type: 'text',
      text: '便签渲染失败\n' + String(err && err.message ? err.message : err).slice(0, 80),
      font: { size: f.body - 1, weight: 'regular' },
      textColor: '#8A5A00',
      maxLines: 3,
      minScale: 1
    }]
  };
}

export default async function (ctx) {
  try {
    return buildWidget((ctx && ctx.env) || {}, ctx);
  } catch (e) {
    return fallback(ctx, e);
  }
}

export { buildWidget, resolveFamily, readCanvas, readLines, readConfig, computeLayout, renderAccessory, STYLES, VERSION };
