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
  systemSmall: { w: 155, h: 155, pad: 12, title: 17, body: 15, foot: 11 },
  systemMedium: { w: 329, h: 155, pad: 14, title: 17, body: 15, foot: 11 },
  systemLarge: { w: 329, h: 345, pad: 18, title: 21, body: 15, foot: 12 },
  systemExtraLarge: { w: 345, h: 345, pad: 18, title: 21, body: 15, foot: 12 }
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
    rule: hexToRgba(trim(env.RULE) || st.rule, st.ruleAlpha),
    ruled: ruledMode === 'auto' ? !!st.ruled : ruledMode === 'on',
    grid: !!st.grid,
    decor: decorMode === 'auto' ? st.decor : decorMode,
    font: FONTS[pick(env.FONT, Object.keys(FONTS), 'system')] || null,
    align: pick(env.ALIGN, ['left', 'center', 'right'], 'left'),
    size: Math.max(0, num(env.SIZE, 15)),
    bullet: trim(env.BULLET),
    title: trim(env.TITLE),
    footer: trim(env.FOOTER),
    url: trim(env.URL),
    hours: Math.min(72, Math.max(0, num(env.REFRESH_HOURS, 6)))
  };
}

// ── 画布 ─────────────────────────────────────────────────
function readCanvas(ctx, family) {
  const f = FAMILY[family];
  let w = 0, h = 0;
  const s = (ctx && ctx.size) || null;
  if (s) {
    w = num(s.width, 0) || num(s.w, 0);
    h = num(s.height, 0) || num(s.h, 0);
  }
  if (!w || !h) {
    w = f ? f.w : 329;
    h = f ? f.h : 155;
  }
  return { family: family, w: Math.round(w), h: Math.round(h) };
}

function limitFor(family, env) {
  const f = FAMILY[family] || FAMILY.systemMedium;
  const key = family === 'systemSmall' ? 'LINES_S' : family === 'systemLarge' ? 'LINES_L' : 'LINES_M';
  const v = trim(env[key]).toLowerCase();
  if (!v || v === 'auto') return 0;                     // 0 = 按画布自动
  const n = num(v, 0);
  return n > 0 ? Math.floor(n) : 0;
}

// ── 排版计算 ─────────────────────────────────────────────
// 优先级：把用户写的所有行都放下 → 放不下就逐档缩字（最小 9pt）→ 还放不下才截断
function computeLayout(canvas, cfg, lineCount) {
  const f = FAMILY[canvas.family] || FAMILY.systemMedium;
  const decorH = cfg.decor !== 'none' ? 4 : 0;
  const padTop = f.pad + decorH;
  const padBottom = f.pad;
  const availH = canvas.h - padTop - padBottom;
  const hasTitle = !!cfg.title;
  const hasFoot = !!cfg.footer;
  const fixed = cfg.size > 0;                     // 填了字号就固定，不自动缩
  const start = fixed ? cfg.size : f.body;
  const floor = fixed ? start : 10;               // 0 = 自动：逐档缩到放得下，最小 10pt

  let pick2 = null;
  for (let s = start; s >= floor; s--) {
    const titleSize = Math.max(12, Math.round(s * 1.18));
    const footSize = Math.max(9, Math.round(s * 0.75));
    const titleH = hasTitle ? Math.round(titleSize * 1.35) : 0;
    const footH = hasFoot ? Math.round(footSize * 1.4) : 0;
    const gapT = hasTitle ? 5 : 0;
    const gapF = hasFoot ? 5 : 0;
    const lineH = Math.round(s * 1.4);
    const bodyH = availH - titleH - gapT - footH - gapF;
    const fit = Math.max(0, Math.floor(bodyH / lineH));
    pick2 = { bodySize: s, titleSize: titleSize, footSize: footSize, titleH: titleH, footH: footH, gapT: gapT, gapF: gapF, lineH: lineH, bodyH: bodyH, fit: fit };
    if (pick2.fit >= lineCount && pick2.fit > 0) break;
  }
  pick2.padTop = padTop;
  pick2.padBottom = padBottom;
  pick2.padL = f.pad;
  pick2.padR = f.pad;
  pick2.contentW = canvas.w - f.pad * 2;
  pick2.shown = Math.min(pick2.fit, lineCount);
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
    const x = cx - 7;
    return "<path d='M " + x + " 6 v 20 a 7 7 0 0 0 14 0 V 11 a 4.5 4.5 0 0 0 -9 0 V 24' " +
      "fill='none' stroke='" + accent + "' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/>";
  }
  return '';
}

function buildBackground(canvas, cfg) {
  const w = canvas.w, h = canvas.h;
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

  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + w + ' ' + h + "' width='" + w + "' height='" + h + "'>" +
    parts.join('') + '</svg>';
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

function alignChildren(node, align) {
  if (align === 'right') return [{ type: 'spacer' }, node];
  if (align === 'center') return [{ type: 'spacer' }, node, { type: 'spacer' }];
  return [node];
}

function wrapAlign(node, align) {
  const c = alignChildren(node, align);
  return c.length === 1 ? node : { type: 'stack', direction: 'row', alignItems: 'center', children: c };
}

function render(canvas, cfg, lines, now, cap) {
  const L = computeLayout(canvas, cfg, lines.length);
  if (cap > 0) L.shown = Math.min(L.shown, cap);
  const children = [];

  if (cfg.title) {
    children.push(wrapAlign({
      type: 'text',
      text: cfg.title,
      font: fontOf(cfg, L.titleSize, 'bold'),
      textColor: cfg.accent,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 0.6
    }, cfg.align));
    children.push({ type: 'spacer', length: L.gapT });
  }

  if (lines.length === 0) {
    children.push({ type: 'spacer' });
    children.push(wrapAlign({
      type: 'text',
      text: '✍️ 在模块设置里写点什么',
      font: fontOf(cfg, Math.max(11, L.bodySize - 1), 'regular'),
      textColor: typeof cfg.ink === 'string' ? hexToRgba(cfg.ink, 0.5) : cfg.ink,
      textAlign: 'center',
      maxLines: 1,
      minScale: 0.6
    }, 'center'));
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
      minScale: 0.55
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

  if (lines.length > L.shown) {
    // 放不下的行用省略提示，不挤爆布局
    children.push(wrapAlign({
      type: 'text',
      text: '⋯ 还有 ' + (lines.length - L.shown) + ' 行',
      font: fontOf(cfg, Math.max(8, L.footSize - 1), 'regular'),
      textColor: typeof cfg.ink === 'string' ? hexToRgba(cfg.ink, 0.45) : cfg.ink,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 0.6
    }, cfg.align));
  }

  children.push({ type: 'spacer' });

  if (cfg.footer) {
    children.push({ type: 'spacer', length: L.gapF });
    children.push(wrapAlign({
      type: 'text',
      text: fmt(cfg.footer, now),
      font: fontOf(cfg, L.footSize, 'regular'),
      textColor: typeof cfg.ink === 'string' ? hexToRgba(cfg.ink, 0.55) : cfg.ink,
      textAlign: cfg.align,
      maxLines: 1,
      minScale: 0.6
    }, cfg.align));
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

function buildWidget(env, ctx) {
  const family = ctx && ctx.widgetFamily ? String(ctx.widgetFamily) : 'systemMedium';
  const now = new Date();
  const cfg = readConfig(env || {});
  const canvas = readCanvas(ctx, family);
  const lines = readLines(env || {});
  const cap = limitFor(family, env || {});
  const rendered = render(canvas, cfg, lines, now, cap);
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
  } else {
    root.padding = [rendered.L.padTop, rendered.L.padL, rendered.L.padBottom, rendered.L.padR];
    root.backgroundColor = cfg.paper;
    root.backgroundImage = buildBackground(canvas, cfg);
  }
  if (cfg.url) root.url = cfg.url;
  return root;
}

function fallback(ctx, err) {
  const family = ctx && ctx.widgetFamily ? String(ctx.widgetFamily) : 'systemMedium';
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
      minScale: 0.6
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

export { buildWidget, readLines, readConfig, computeLayout, STYLES, VERSION };
