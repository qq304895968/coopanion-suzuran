#!/usr/bin/env python3
"""Minimal Spine JSON renderer: region + mesh attachments, rest pose or named animation (pose sampled at t)."""
import json, math, sys
from PIL import Image, ImageDraw

def mat_mul(a, b):
    a0,a1,a2,a3,a4,a5 = a; b0,b1,b2,b3,b4,b5 = b
    return (a0*b0+a2*b1, a1*b0+a3*b1,
            a0*b2+a2*b3, a1*b2+a3*b3,
            a0*b4+a2*b5+a4, a1*b4+a3*b5+a5)

def local_matrix(x, y, rotation, sx, sy):
    c = math.cos(math.radians(rotation)); s = math.sin(math.radians(rotation))
    return (c*sx, s*sx, -s*sy, c*sy, x, y)

def apply(m, px, py):
    return (m[0]*px + m[2]*py + m[4], m[1]*px + m[3]*py + m[5])

def parse_atlas(path):
    with open(path, encoding='utf-8') as f:
        lines = [l.rstrip('\n') for l in f]
    regions = {}
    page = None
    i, n = 0, len(lines)
    while i < n:
        l = lines[i]
        if not l.strip():
            i += 1; continue
        s = l.strip()
        if l[0] not in ' \t':
            # page header (a .png file) vs region name (followed by indented props)
            nxt_indented = i + 1 < n and lines[i+1].strip() and lines[i+1][0] in ' \t'
            if s.endswith('.png') or not nxt_indented:
                page = s
            else:
                name = s
                j = i + 1
                info = {}
                while j < n and lines[j].strip() and lines[j][0] in ' \t':
                    kv = lines[j].strip()
                    if ':' in kv:
                        k, v = kv.split(':', 1)
                        info[k.strip()] = v.strip()
                    j += 1
                x, y = map(int, info['xy'].split(','))
                w, h = map(int, info['size'].split(','))
                regions[name] = {'page': page, 'x': x, 'y': y, 'w': w, 'h': h,
                                 'rotated': info.get('rotate') == 'true'}
                i = j
                continue
            i += 1; continue
        i += 1; continue
        name = s
        j = i + 1
        info = {}
        while j < n and lines[j].strip() and lines[j][0] in ' \t':
            kv = lines[j].strip()
            if ':' in kv:
                k, v = kv.split(':', 1)
                info[k.strip()] = v.strip()
            j += 1
        x, y = map(int, info['xy'].split(','))
        w, h = map(int, info['size'].split(','))
        regions[name] = {'page': page, 'x': x, 'y': y, 'w': w, 'h': h,
                         'rotated': info.get('rotate') == 'true'}
        i = j
    return regions

class SpineModel:
    def __init__(self, json_path, atlas_path, png_path):
        self.d = json.load(open(json_path, encoding='utf-8'))
        self.regions = parse_atlas(atlas_path)
        self.img = Image.open(png_path).convert('RGBA')
        self.bones = self.d['bones']
        self.slots = self.d['slots']
        self.skin_att = self.d['skins'][0].get('attachments', {})
        self.bone_idx = {b['name']: i for i, b in enumerate(self.bones)}

    def bone_world(self, bi, pose):
        b = self.bones[bi]
        p = pose.get(bi, {})
        m = local_matrix(p.get('x', b.get('x', 0)), p.get('y', b.get('y', 0)),
                         p.get('rotation', b.get('rotation', 0)),
                         p.get('scaleX', b.get('scaleX', 1)),
                         p.get('scaleY', b.get('scaleY', 1)))
        par = b.get('parent')
        if isinstance(par, str): par = self.bone_idx.get(par)
        if par is not None:
            m = mat_mul(self.bone_world(par, pose), m)
        return m

    def anim_pose(self, anim_name, t=0.0):
        anim = self.d['animations'][anim_name]
        pose = {}
        bone_idx = {b['name']: i for i, b in enumerate(self.bones)}
        for bname, tracks in anim.get('bones', {}).items():
            bi = bone_idx[bname]
            for track, keys in tracks.items():
                ks = sorted(keys, key=lambda k: k.get('time', 0))
                if not ks: continue
                prev = ks[0]
                for k in ks:
                    if k.get("time",0) <= t: prev = k
                    else: break
                nxt = None
                for k in ks:
                    if k.get("time",0) > t: nxt = k; break
                def getv(k):
                    if track == 'translate': return (k.get('x', 0), k.get('y', 0))
                    if track == 'scale': return (k.get('x', 1), k.get('y', 1))
                    return k.get('angle', k.get('y', k.get('value', 0)))
                if nxt is None:
                    v = getv(prev)
                else:
                    f = (t - prev.get("time",0)) / max(1e-6, nxt.get("time",0) - prev.get("time",0))
                    v0, v1 = getv(prev), getv(nxt)
                    if isinstance(v0, (int, float)):
                        d = v1 - v0
                        while d > 180: d -= 360
                        while d < -180: d += 360
                        v = v0 + d * f
                    else:
                        v = (v0[0] + (v1[0]-v0[0])*f, v0[1] + (v1[1]-v0[1])*f)
                if track == 'rotate': pose.setdefault(bi, {})['rotation'] = v
                elif track == 'translate':
                    q = pose.setdefault(bi, {})
                    q['x'] = self.bones[bi].get('x', 0) + v[0]
                    q['y'] = self.bones[bi].get('y', 0) + v[1]
                elif track == 'scale':
                    q = pose.setdefault(bi, {})
                    q['scaleX'] = v[0]; q['scaleY'] = v[1]
        return pose

    def render(self, out_path, scale=1.0, pose=None, ss=2):
        pose = pose or {}
        items = []
        for slot in self.slots:
            sname = slot['name']
            aname = slot.get('attachment')
            if not aname: continue
            att = self.skin_att.get(sname, {}).get(aname)
            if att is None: continue
            bm = self.bone_world(self.bone_idx[slot['bone']], pose)
            am = mat_mul(bm, local_matrix(att.get('x', 0), att.get('y', 0),
                                         att.get('rotation', 0),
                                         att.get('scaleX', 1), att.get('scaleY', 1)))
            t = att.get('type', 'region')
            tris = None
            if t == 'region':
                w = att.get('width', 100); h = att.get('height', 100)
                corners = [(-w/2, -h/2), (w/2, -h/2), (w/2, h/2), (-w/2, h/2)]
                pts = [apply(am, cx, cy) for cx, cy in corners]
                uvs = att.get('uvs') or [(0,0),(1,0),(1,1),(0,1)]
            else:
                verts = att.get('vertices', [])
                uvs = att.get('uvs', [])
                tris = att.get('triangles', [])
                if att.get('hull') is not None and len(verts) > 2*len(uvs)//2*2 and len(uvs) and len(verts) != len(uvs):
                    # weighted mesh: per vertex: count, (bone, x, y, weight)*count
                    pts = []
                    i = 0
                    nvert = len(uvs)//2
                    while i < len(verts) and len(pts) < nvert:
                        cnt = int(verts[i]); i += 1
                        px = py = 0.0
                        for _ in range(cnt):
                            bi = int(verts[i]); x = verts[i+1]; y = verts[i+2]; w = verts[i+3]
                            i += 4
                            bm2 = self.bone_world(bi, pose)
                            wx, wy = apply(bm2, x, y)
                            px += wx*w; py += wy*w
                        pts.append((px, py))
                else:
                    if len(verts) % 2: verts = verts[:-1]
                    pts = [apply(am, verts[k], verts[k+1]) for k in range(0, len(verts), 2)]
            region = self.regions.get(att.get('path') or aname) or self.regions.get(aname)
            if region is None:
                continue
            items.append((att, region, pts, uvs, tris, t))
        allp = [p for it in items for p in it[2]]
        xs = [p[0] for p in allp]; ys = [p[1] for p in allp]
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
        W = max(1, int((maxx-minx)*scale)); H = max(1, int((maxy-miny)*scale))
        out = Image.new('RGBA', (W*ss, H*ss), (0, 0, 0, 0))
        def to_px(p):
            return ((p[0]-minx)*scale*ss, (maxy-p[1])*scale*ss)
        for att, region, pts, uvs, tris, t in items:
            rx, ry, rw, rh = region['x'], region['y'], region['w'], region['h']
            if region['rotated']:
                src = self.img.crop((rx, ry, rx+rh, ry+rw)).transpose(Image.ROTATE_90)
                sw, sh = rh, rw
            else:
                src = self.img.crop((rx, ry, rx+rw, ry+rh))
                sw, sh = rw, rh
            soff = (rx, ry)
            if t == 'region':
                dpts = [to_px(p) for p in pts]
                if uvs and isinstance(uvs[0], (int, float)):
                    uvs = [(uvs[k], uvs[k+1]) for k in range(0, len(uvs)-1, 2)]
                spts = [(u[0]*sw, (1-u[1])*sh) for u in uvs]
                self._blit_quad(out, src, dpts, spts)
            else:
                dpts = [to_px(p) for p in pts]
                if uvs and isinstance(uvs[0], (int, float)):
                    uvs = [(uvs[k], uvs[k+1]) for k in range(0, len(uvs)-1, 2)]
                spts = [(u[0]*sw, (1-u[1])*sh) for u in uvs]
                if tris and isinstance(tris[0], (int, float)):
                    tris = [tuple(tris[k:k+3]) for k in range(0, len(tris)-2, 3)]
                for a, b, c in tris:
                    self._blit_tri(out, src, [dpts[a], dpts[b], dpts[c]],
                                   [spts[a], spts[b], spts[c]])
        out = out.resize((W, H), Image.LANCZOS)
        out.save(out_path)
        return out.size

    def _blit_quad(self, out, src, dpts, spts):
        self._blit_tri(out, src, [dpts[0], dpts[1], dpts[2]], [spts[0], spts[1], spts[2]])
        self._blit_tri(out, src, [dpts[0], dpts[2], dpts[3]], [spts[0], spts[2], spts[3]])

    def _blit_tri(self, out, src, dtri, stri):
        xs = [p[0] for p in dtri]; ys = [p[1] for p in dtri]
        x0, y0 = min(xs), min(ys); x1, y1 = max(xs), max(ys)
        w, h = int(x1-x0)+2, int(y1-y0)+2
        if w <= 0 or h <= 0: return
        d0, d1, d2 = [(p[0]-x0, p[1]-y0) for p in dtri]
        s0, s1, s2 = stri
        det = (d1[0]-d0[0])*(d2[1]-d0[1]) - (d2[0]-d0[0])*(d1[1]-d0[1])
        if abs(det) < 1e-6: return
        a = ((s1[0]-s0[0])*(d2[1]-d0[1]) - (s2[0]-s0[0])*(d1[1]-d0[1])) / det
        b = ((s2[0]-s0[0])*(d1[0]-d0[0]) - (s1[0]-s0[0])*(d2[0]-d0[0])) / det
        c = ((s1[1]-s0[1])*(d2[1]-d0[1]) - (s2[1]-s0[1])*(d1[1]-d0[1])) / det
        d = ((s2[1]-s0[1])*(d1[0]-d0[0]) - (s1[1]-s0[1])*(d2[0]-d0[0])) / det
        tx = s0[0] - a*d0[0] - b*d0[1]
        ty = s0[1] - c*d0[0] - d*d0[1]
        tmp = src.transform((w, h), Image.AFFINE, (a, b, tx, c, d, ty),
                            resample=Image.BILINEAR)
        mask = Image.new('L', (w, h), 0)
        ImageDraw.Draw(mask).polygon(list(d0)+list(d1)+list(d2), fill=255)
        out.paste(tmp, (int(x0), int(y0)), mask)

if __name__ == '__main__':
    jp, ap, pp, out = sys.argv[1:5]
    scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    anim = sys.argv[6] if len(sys.argv) > 6 else None
    t = float(sys.argv[7]) if len(sys.argv) > 7 else 0.0
    m = SpineModel(jp, ap, pp)
    pose = m.anim_pose(anim, t) if anim else {}
    print(m.render(out, scale=scale, pose=pose))
