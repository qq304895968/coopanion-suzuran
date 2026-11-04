#!/usr/bin/env node
/**
 * 从 skins/<id>/ 里的 Spine 数据生成 model.json、model-data.js 和两个"老主机也能用"的兜底模块：
 *   <id>.skel.js   gzip+base64 的骨骼
 *   <id>.atlas.js  图集文本
 *
 * 生成的东西只依赖本包自己的 spine38.js / atlas.js，跑 `node tools/build-model.mjs` 就能重来一遍：
 *   - scale / origin：按 Idle 第一帧"去掉伞、狐狸等挂件后"的身体包围盒，把四套服装缩到一样高，
 *     脚底落在 y=250、水平中心落在 x=128（逻辑空间 256 单位）。
 *   - extent：同样那一帧画出来的全部像素（含伞），用来做悬停范围与特效外扩。
 *   - anchors：视线中心（眼睛槽位）、气泡、爱心、泪、z 的落点。
 *   - face：眼睛/嘴/闭眼/晕圈的槽位，供 figure.js 做眨眼、说话、晕头转向。
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SkeletonBinary, Skeleton } from '../spine38.js';
import { parseAtlas, regionView } from '../atlas.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(HERE, '..');

const TARGET_BODY = 152;   // 脚底到头顶（身体，不含伞）在逻辑空间里的高度
const FEET_Y = 250;
const CENTER_X = 128;

/** 四套服装：id、源目录名、角色骨骼、肢体骨骼。骨骼名取自各自骨架，缺了就留 null。 */
const SKINS = [
  {
    id: 'default',
    name: { zh: '默认', en: 'Default' },
    alias: ['default', 'classic', '基础'],
    bones: { head: 'F_Head', chest: 'F_Chest', waist: 'F_Waist', hips: 'F_Hip' },
    limbs: { armL: 'F_L_Arm', armR: 'F_R_Arm', legL: 'F_L_Leg', legR: 'F_R_Leg', earL: 'F_L_Ear', earR: 'F_R_Ear', tail: 'F_Tail' },
  },
  {
    id: 'spring',
    name: { zh: '春之颂', en: 'Spring' },
    alias: ['spring', 'e2', '和服', '春之颂'],
    bones: { head: 'F_Head', chest: 'F_Chest', waist: 'F_Waist', hips: null },
    limbs: { armL: 'F_L_Arm', armR: 'F_R_Arm', legL: 'F_L_Leg', legR: 'F_R_Leg', earL: 'F_L_Ear', earR: 'F_R_Ear', tail: 'F_Tail' },
  },
  {
    id: 'snow',
    name: { zh: '雪霁', en: 'Snow clearing' },
    alias: ['snow', 'xueji', '雪霁'],
    bones: { head: 'F_Head_01', chest: 'F_Body_01', waist: 'F_Waist_01', hips: null },
    limbs: { armL: 'F_L_Arm_01', armR: 'F_R_Arm_01', legL: 'F_L_Leg_01', legR: 'F_R_Leg_01', earL: 'F_L_Ear_1', earR: 'F_R_Ear_1', tail: 'F_Tail_01' },
  },
  {
    id: 'wild',
    name: { zh: '弃土花开', en: 'Wild blooms' },
    alias: ['wild', 'wild3', '弃土花开'],
    bones: { head: 'F_Head', chest: 'F_Chest', waist: 'F_Waist', hips: 'F_Hip' },
    limbs: { armL: 'F_L_Arm', armR: 'F_R_Arm', legL: 'F_L_Leg', legR: 'F_R_Leg', earL: 'F_L_Ear', earR: 'F_R_Ear', tail: 'F_Tail' },
  },
];

/** 挂件：算"身体"高度时排除，算 extent 时保留。 */
const PROP = /^(C_|B_|Weapon|Cane|F_Umbrella|F_Weapon|F_Pack|F_Cat|F_Fox|F_Muzzle)/;

const FACE_EYES = ['F_Face_Default_m', 'F_Face_Default_l', 'F_Face_Default_k', 'F_Face_Default_j', 'F_Face_Default_e', 'F_Face_Default_h'];
const FACE_LASH = ['F_Face_Default_d', 'F_Face_Default_f', 'F_Face_Default_g'];
const FACE_MOUTH = ['F_Face_Default_i', 'F_Face_Default_g'];

function pngSize(buf) {
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error('不是 PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function load(dir, id) {
  const skelBuf = fs.readFileSync(path.join(dir, `${id}.skel`));
  const atlasText = fs.readFileSync(path.join(dir, `${id}.atlas`), 'utf8');
  const atlas = parseAtlas(atlasText);
  const size = pngSize(fs.readFileSync(path.join(dir, `${id}.png`)));
  const missing = [];
  const views = new Map();
  const view = (p) => {
    if (views.has(p)) return views.get(p);
    const reg = atlas.find(p);
    if (!reg) { missing.push(p); throw new Error(`atlas 缺区域 ${p}`); }
    const v = regionView(reg, size.width, size.height);
    views.set(p, v);
    return v;
  };
  const loader = {
    newRegionAttachment(skin, name, p) {
      const a = new (globalThis.__RegionAttachment)(name);
      a.region = view(p); a.setRegion(a.region); a.updateOffset();
      return a;
    },
    newMeshAttachment(skin, name, p) {
      const a = new (globalThis.__MeshAttachment)(name);
      a.region = view(p);
      return a;
    },
    newBoundingBoxAttachment: (s, n) => new (globalThis.__BoundingBoxAttachment)(n),
    newPathAttachment: (s, n) => new (globalThis.__PathAttachment)(n),
    newPointAttachment: (s, n) => new (globalThis.__PointAttachment)(n),
    newClippingAttachment: (s, n) => new (globalThis.__ClippingAttachment)(n),
  };
  const data = new SkeletonBinary(loader).readSkeletonData(new Uint8Array(skelBuf));
  return { data, atlas, size, missing, skelBuf, atlasText };
}

/** 每个画出来的槽位在骨骼空间里的包围盒。 */
function slotBoxes(skel) {
  const out = new Map();
  for (const slot of skel.drawOrder) {
    const att = slot.getAttachment();
    if (!att || att.type > 2 || slot.color.a <= .004) continue;
    let verts;
    if (att.type === 0) { att.updateOffset(); verts = new Float32Array(8); att.computeWorldVertices(slot, verts, 0, 2); }
    else { verts = new Float32Array(att.worldVerticesLength); att.computeWorldVertices(slot, 0, verts.length, verts, 0, 2); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < verts.length; i += 2) {
      x0 = Math.min(x0, verts[i]); x1 = Math.max(x1, verts[i]);
      y0 = Math.min(y0, verts[i + 1]); y1 = Math.max(y1, verts[i + 1]);
    }
    out.set(slot.data.name, { x0, y0, x1, y1, att: att.name });
  }
  return out;
}

function build() {
  const outfits = [];
  for (const meta of SKINS) {
    const dir = path.join(PACK, 'skins', meta.id);
    const { data, atlas, size, skelBuf, atlasText } = load(dir, meta.id);

    const skel = new Skeleton(data);
    skel.setToSetupPose();
    data.findAnimation('Idle')?.apply(skel, 0, 0, false, [], 1, 0, 0);
    skel.updateWorldTransform();
    const boxes = slotBoxes(skel);

    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;   // 身体
    let fx0 = 1e9, fy0 = 1e9, fx1 = -1e9, fy1 = -1e9;   // 全部
    for (const [slot, b] of boxes) {
      fx0 = Math.min(fx0, b.x0); fx1 = Math.max(fx1, b.x1);
      fy0 = Math.min(fy0, b.y0); fy1 = Math.max(fy1, b.y1);
      if (PROP.test(slot)) continue;
      bx0 = Math.min(bx0, b.x0); bx1 = Math.max(bx1, b.x1);
      by0 = Math.min(by0, b.y0); by1 = Math.max(by1, b.y1);
    }
    const headBone = data.bones.find(b => b.name === meta.bones.head);
    const headTop = headBone ? skel.findBone(headBone.name).worldY + 40 : by1;
    const bodyH = Math.max(120, headTop - by0);
    const scale = TARGET_BODY / bodyH;
    const origin = [
      +(CENTER_X - (bx0 + bx1) / 2 * scale).toFixed(3),
      +(FEET_Y + by0 * scale).toFixed(3),
    ];
    const L = (x, y) => [+(origin[0] + x * scale).toFixed(1), +(origin[1] - y * scale).toFixed(1)];

    // 脸
    const slots = data.slots.map(s => s.name);
    const faceSlots = slots.filter(n => /^F_Face_Default_[a-z]$/.test(n));
    const match = (re) => slots.filter(n => re.test(n));
    const eyes = [...new Set([
      ...match(/Eye|Eyelid|Eyelash|Highlight|Eyeball|Eyelight/i).filter(n => !/Eyebrow/i.test(n)),
      ...FACE_EYES.filter(n => faceSlots.includes(n)),
    ])];
    const lash = [...new Set([...match(/Eyelash/i), ...FACE_LASH.filter(n => faceSlots.includes(n) && !eyes.includes(n))])];
    const mouth = [...new Set([...match(/^F_Mouth/i), ...FACE_MOUTH.filter(n => faceSlots.includes(n))])];
    const closed = [...new Set([...match(/close/i), 'F_L_Eyeclose', 'F_R_Eyeclose'].filter(n => slots.includes(n)))];
    // 晕：有的服装把螺旋眼做成了空槽位（雪霁的 F_L_Eye_01/F_R_Eye_01），有的是 F_Face_Stun_*
    const stun = [...new Set([...match(/Stun/i), 'F_L_Eye_01', 'F_R_Eye_01'].filter(n => slots.includes(n)))];
    for (const n of stun) {
      const sk = data.defaultSkin;
      const idx = data.findSlotIndex(n);
      if (!sk || idx < 0 || !sk.getAttachment(idx, n)) {
        const at = stun.indexOf(n);
        if (at >= 0) stun.splice(at, 1);
      }
    }

    const union = (list) => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const n of list) {
        const b = boxes.get(n);
        if (!b) continue;
        x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1);
        y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1);
      }
      return x0 > x1 ? null : { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
    };
    const eyeBox = union(eyes);
    const gaze = eyeBox ? L(eyeBox.cx, eyeBox.cy) : [CENTER_X, Math.round(FEET_Y - TARGET_BODY * .8)];
    const headBox = union(slots.filter(n => /Head|Headwear|Hair|Bangs|Temple|Ear|Face/i.test(n) && !PROP.test(n)));
    const topY = headBox ? L(headBox.cx, headBox.y1)[1] : origin[1] - headTop * scale;

    const anims = Object.fromEntries(data.animations.map(a => [a.name, +a.duration.toFixed(3)]));
    const roleAnim = {
      idle: anims.Idle ? 'Idle' : data.animations[0]?.name,
      enter: anims.Start ? 'Start' : null,
      attack: anims.Attack ? 'Attack' : null,
      die: anims.Die ? 'Die' : null,
      skill2: anims.Skill2 ? 'Skill2' : null,
      skill3: anims['Skill3_Begin'] ? 'Skill3_Begin' : null,
      skill3loop: anims['Skill3_Loop'] ? 'Skill3_Loop' : null,
      skill3end: anims['Skill3_End'] ? 'Skill3_End' : null,
    };

    outfits.push({
      id: meta.id,
      name: meta.name,
      alias: meta.alias,
      dir: `skins/${meta.id}`,
      atlas: `${meta.id}.atlas`,
      skel: `${meta.id}.skel`,
      page: `${meta.id}.png`,
      pageSize: [size.width, size.height],
      scale: +scale.toFixed(6),
      origin,
      bones: meta.bones,
      limbs: meta.limbs,
      anims,
      roleAnim,
      face: { eyes, lash, mouth, closed, stun, nativeBlink: closed.length > 0 },
      anchors: {
        gaze: gaze.map(v => Math.round(v)),
        bubble: [Math.round(gaze[0]), Math.max(4, Math.round(topY - 10))],
        hearts: [Math.round(gaze[0]), Math.round(gaze[1] + 46)],
        tear: [Math.round(gaze[0] + 14), Math.round(gaze[1] + 10)],
        z: [Math.round(gaze[0] + 40), Math.round(topY + 6)],
      },
      extent: [
        Math.round(origin[0] + fx0 * scale), Math.round(origin[1] - fy1 * scale),
        Math.round(origin[0] + fx1 * scale), Math.round(origin[1] - fy0 * scale),
      ],
      // 两个可摸的圈：身子一个、脑袋一个（套件的 hits() 用来判悬停和抚摸）
      hits: [
        [
          Math.round(gaze[0]),
          Math.round(origin[1] - (by0 + (by1 - by0) * .58) * scale),
          Math.round(Math.max(30, (bx1 - bx0) * scale * .55)),
        ],
        [
          Math.round(gaze[0]),
          Math.round(gaze[1]),
          Math.round(Math.max(22, (headBox ? headBox.w * scale : 60) * .55)),
        ],
      ],
      stats: {
        bones: data.bones.length,
        slots: data.slots.length,
        drawnSlots: boxes.size,
        pages: atlas.pages.length,
        regions: atlas.regions.length,
        bodyHeight: +(bodyH * scale).toFixed(1),
      },
    });

    // 兜底模块：老版本主机不认 fetch，模块 import 还是可以的
    fs.writeFileSync(path.join(dir, `${meta.id}.skel.js`),
      `// 生成物：${meta.id}.skel 的 gzip+base64（老版本主机的兜底）。别手改，跑 tools/build-model.mjs。\nexport default '${zlib.gzipSync(skelBuf, { level: 9 }).toString('base64')}';\n`);
    fs.writeFileSync(path.join(dir, `${meta.id}.atlas.js`),
      `// 生成物：${meta.id}.atlas 的文本镜像（老版本主机的兜底）。别手改，跑 tools/build-model.mjs。\nexport default ${JSON.stringify(atlasText)};\n`);

    console.log(`  ${meta.id}: ${data.bones.length} 骨 / ${data.slots.length} 槽 / ${boxes.size} 绘制 / scale ${scale.toFixed(4)} / extent ${outfits.at(-1).extent.join(',')}`);
  }

  const model = {
    name: 'suzuran',
    version: 2,
    about: '铃兰（明日方舟）四套服装的 Spine 战斗模型，逐帧还原游戏动画。',
    units: { box: 256, feetY: FEET_Y, centerX: CENTER_X, bodyHeight: TARGET_BODY },
    outfits,
  };

  fs.writeFileSync(path.join(PACK, 'model.json'), JSON.stringify(model, null, 1) + '\n');
  fs.writeFileSync(path.join(PACK, 'model-data.js'),
    `// 生成物：model.json 的内嵌版（figure.js 在 fetch 不可用时用它）。别手改，跑 tools/build-model.mjs。\nexport default ${JSON.stringify(model)};\n`);
  console.log(`model.json / model-data.js 写好：${outfits.length} 套服装`);
}

// spine38.js 的附件构造函数挂在模块里，这里按需取用
const spine = await import('../spine38.js');
globalThis.__RegionAttachment = spine.RegionAttachment;
globalThis.__MeshAttachment = spine.MeshAttachment;
globalThis.__BoundingBoxAttachment = spine.BoundingBoxAttachment;
globalThis.__PathAttachment = spine.PathAttachment;
globalThis.__PointAttachment = spine.PointAttachment;
globalThis.__ClippingAttachment = spine.ClippingAttachment;

build();
