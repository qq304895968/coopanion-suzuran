/**
 * 把一帧的三角形画进 canvas：WebGL 1 也能跑的那份着色器（{{web/kit/rig.js}} 同样这么做）。
 *
 * 每个部件是 texture page 上的一小块，顶点与 UV 由 figure.js 每帧算好、按槽位顺序交进来；
 * 相邻且（贴图、透明度）相同的槽位合成一次 drawArrays，所以一套服装通常只有一两次绘制。
 * 贴图按预乘 alpha 上传（Spine 的图集是直通 alpha），混合用 ONE / ONE_MINUS_SRC_ALPHA，
 * 和 canvas 的 source-over 一致。
 *
 * 坐标是 256 单位方格里的逻辑单位（脚下 y=256），uView = [x0, y0, 1/w, 1/h] 把逻辑单位映射到裁剪空间。
 */

const VS = `
attribute vec2 aPos;
attribute vec2 aUv;
uniform vec4 uView;
varying vec2 vUv;
void main() {
  vec2 n = (aPos - uView.xy) * uView.zw;
  gl_Position = vec4(n.x * 2.0 - 1.0, 1.0 - n.y * 2.0, 0.0, 1.0);
  vUv = aUv;
}`;

const FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uAlpha;
void main() {
  gl_FragColor = texture2D(uTex, vUv) * uAlpha;
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

/**
 * `view` 是画布在逻辑空间里盖住的那块（{x, y, w, h}）：比 256 大方格更大，因为伞和狐狸会伸出去。
 * 返回 { upload, draw, lost, dispose }，`draw` 收一组批次：
 *   { tex, pos: Float32Array(顶点 xy), uv: Float32Array, idx: Uint16Array, alpha }
 * `pos` 已经是逻辑单位；批次之间按数组顺序画。
 */
export function createRenderer(canvas, view) {
  const attrs = { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true };
  const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
  if (!gl) throw new Error('webgl unavailable');
  const gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  let disposed = false, lost = false;

  let prog, loc;
  const textures = new Map();     // 名字 → { tex, src }
  const buffers = [];             // 复用的顶点/索引缓冲
  let bufAt = 0;

  function buildGL() {
    const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.bindAttribLocation(prog, 1, 'aUv');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    loc = {
      aPos: gl.getAttribLocation(prog, 'aPos'),
      aUv: gl.getAttribLocation(prog, 'aUv'),
      uView: gl.getUniformLocation(prog, 'uView'),
      uTex: gl.getUniformLocation(prog, 'uTex'),
      uAlpha: gl.getUniformLocation(prog, 'uAlpha'),
    };
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    // 丢掉旧贴图：上下文没了，它们跟着没了
    textures.clear();
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    buildGL();
    for (const entry of sources) upload(entry[0], entry[1]);
  });
  const sources = new Map();

  /** 上传（或重新上传）一张图集贴图；同名同源只做一次。 */
  function upload(name, src) {
    if (disposed) return null;
    sources.set(name, src);
    let entry = textures.get(name);
    if (!entry) { entry = { tex: gl.createTexture() }; textures.set(name, entry); }
    gl.bindTexture(gl.TEXTURE_2D, entry.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    // 不做 mipmap：画布是 2 倍超采样，贴图在画布里始终是“放大”采样，用不到 mip；
    // 而 mip 会把紧挨着的另一块图集混进来，头发、脸这些细线条边上就会发灰、变粗。
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return entry.tex;
  }

  function bufferAt(i) {
    let b = buffers[i];
    if (!b) {
      b = buffers[i] = { pos: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer(), idxCap: 0, vCap: 0 };
    }
    return b;
  }

  function draw(batches) {
    if (disposed || lost) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!batches || !batches.length) return;
    gl.useProgram(prog);
    gl.uniform4f(loc.uView, view.x, view.y, 1 / view.w, 1 / view.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(loc.uTex, 0);
    bufAt = 0;
    for (const b of batches) {
      const tex = textures.get(b.tex);
      if (!tex || !b.idx.length) continue;
      const buf = bufferAt(bufAt++);
      const nv = b.pos.length / 2;
      if (buf.vCap < nv) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos); gl.bufferData(gl.ARRAY_BUFFER, b.pos.byteLength * 2 + 64, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv); gl.bufferData(gl.ARRAY_BUFFER, b.uv.byteLength * 2 + 64, gl.DYNAMIC_DRAW);
        buf.vCap = nv * 2;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.pos);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, b.uv);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx);
      if (buf.idxCap < b.idx.length) {
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, b.idx.byteLength * 2 + 64, gl.DYNAMIC_DRAW);
        buf.idxCap = b.idx.length * 2;
      }
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, b.idx);
      gl.bindTexture(gl.TEXTURE_2D, tex.tex);
      gl.uniform1f(loc.uAlpha, b.alpha == null ? 1 : b.alpha);
      gl.drawElements(gl.TRIANGLES, b.idx.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  buildGL();

  return {
    upload,
    draw,
    get lost() { return lost; },
    dispose() {
      disposed = true;
      for (const { tex } of textures.values()) gl.deleteTexture(tex);
      textures.clear(); sources.clear();
      for (const b of buffers) { gl.deleteBuffer(b.pos); gl.deleteBuffer(b.uv); gl.deleteBuffer(b.idx); }
      buffers.length = 0;
      // 主动丢上下文：桌宠换形象时不留下一个 WebGL 上下文
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
