/**
 * Spine 3.8 文本图集（.atlas）的解析 + AttachmentLoader。
 *
 * 3.8 的图集没有空行分隔：页面行是顶格且以扩展名结尾，区域名也是顶格、但不带扩展名的最后一段。
 * 区域属性缩进；`rotate: true` 表示这一页上存的是"横躺"的图，尺寸要换回来——
 * 几何用 `size` 的自然宽高，UV 用页面上的外框宽高，两者不能混。
 */
import {
  RegionAttachment, MeshAttachment, BoundingBoxAttachment, PathAttachment,
  PointAttachment, ClippingAttachment,
} from './spine38.js';

const PAGE_EXT = /\.(png|jpg|jpeg|webp)$/i;

export function parseAtlas(text) {
  const regions = [];
  let page = null;
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const indented = /^\s/.test(raw);
    const line = raw.trim();
    if (!indented) {
      if (PAGE_EXT.test(line)) {
        page = line;
        cur = null;
        continue;
      }
      const idx = line.indexOf(':');
      if (idx > 0 && cur === null) {
        // 页面属性写成顶格：只可能是 size/format/filter/repeat 这类键
        const key = line.slice(0, idx).trim().toLowerCase();
        if (key === 'size' || key === 'format' || key === 'filter' || key === 'repeat' || key === 'pma') continue;
      }
      cur = { name: line, page, x: 0, y: 0, width: 0, height: 0, rotate: false, originalWidth: 0, originalHeight: 0, offsetX: 0, offsetY: 0 };
      regions.push(cur);
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    switch (key) {
      case 'bounds': case 'xy': {
        const n = val.split(',').map(Number);
        cur.x = n[0]; cur.y = n[1]; cur.width = n[2]; cur.height = n[3];
        break;
      }
      case 'size': { const n = val.split(',').map(Number); cur.width = n[0]; cur.height = n[1]; break; }
      case 'orig': { const n = val.split(',').map(Number); cur.originalWidth = n[0]; cur.originalHeight = n[1]; break; }
      case 'offset': { const n = val.split(',').map(Number); cur.offsetX = n[0]; cur.offsetY = n[1]; break; }
      // 3.8 的图集里 rotate 有 0 / true(=90) / 180 / 270 四种，方向不一样，
      // 不能一律当 90 度处理（F_Face 是 270、F_Skirt 是 true，两者需要的换算正好相反）。
      case 'rotate': {
        const v = val.toLowerCase();
        cur.rotate = v === 'true' ? 90 : v === 'false' ? 0 : (Number(v) || 0);
        break;
      }
      default: break;
    }
  }
  const atlas = {
    pages: [...new Set(regions.map(r => r.page).filter(Boolean))],
    regions,
    find(name) { return regions.find(r => r.name === name) || null; },
  };
  for (const r of regions) {
    const quarter = r.rotate === 90 || r.rotate === 270;
    if (!r.originalWidth) r.originalWidth = quarter ? r.height : r.width;
    if (!r.originalHeight) r.originalHeight = quarter ? r.width : r.height;
  }
  return atlas;
}

/** 图集里的一块区域 → RegionAttachment 需要的视图（几何自然尺寸 + 页面外框 UV）。 */
export function regionView(reg, pageW, pageH) {
  const rot = reg.rotate || 0;
  const quarter = rot === 90 || rot === 270;      // 90/270 度才会把长宽换过来
  const footW = quarter ? reg.height : reg.width;
  const footH = quarter ? reg.width : reg.height;
  // 往里收半个像素：图集里两块图挨得紧，双线性采样会把邻居的那一条混进来，
  // 表现在头发、轮廓线边上发灰/变粗。收半个像素就只采自己这一块。
  const hw = pageW ? .5 / pageW : 0, hh = pageH ? .5 / pageH : 0;
  return {
    name: reg.name,
    rotate: rot,
    u: reg.x / pageW + hw,
    v: reg.y / pageH + hh,
    u2: (reg.x + footW) / pageW - hw,
    v2: (reg.y + footH) / pageH - hh,
    width: reg.width,
    height: reg.height,
    originalWidth: reg.originalWidth,
    originalHeight: reg.originalHeight,
    offsetX: reg.offsetX,
    offsetY: reg.offsetY,
  };
}

/**
 * 图集 + 页面像素尺寸 → SkeletonBinary 要的 loader。
 * 找不到的区域直接抛错：宁可加载失败给出明确原因，也不要画出半个人。
 */
export function createAttachmentLoader(atlas, pageSize, onMissing) {
  const view = (path) => {
    const reg = atlas.find(path);
    if (!reg) {
      if (onMissing) onMissing(path);
      throw new Error(`atlas region missing: ${path}`);
    }
    return regionView(reg, pageSize.width, pageSize.height);
  };
  return {
    newRegionAttachment(skin, name, path) {
      const a = new RegionAttachment(name);
      a.region = view(path);
      a.setRegion(a.region);
      a.updateOffset();
      return a;
    },
    newMeshAttachment(skin, name, path) {
      const a = new MeshAttachment(name);
      a.region = view(path);
      return a;
    },
    newBoundingBoxAttachment: (skin, name) => new BoundingBoxAttachment(name),
    newPathAttachment: (skin, name) => new PathAttachment(name),
    newPointAttachment: (skin, name) => new PointAttachment(name),
    newClippingAttachment: (skin, name) => new ClippingAttachment(name),
  };
}
