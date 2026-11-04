/** 最小 PNG 文本块读写：保留 ComfyUI 自己写的 prompt/workflow，再补我们的元数据。 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface Chunk {
  type: string;
  data: Buffer;
  raw: Buffer;
}

function readChunks(bytes: Buffer): Chunk[] {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('不是 PNG 文件');
  const chunks: Chunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('PNG 块长度越界');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data, raw: bytes.subarray(offset, end) });
    offset = end;
    if (type === 'IEND') break;
  }
  return chunks;
}

function isLatin1(text: string): boolean {
  for (const ch of text) {
    if (ch.codePointAt(0)! > 0xff) return false;
  }
  return true;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** tEXt 只支持 Latin-1；keyword 必须 1–79 字节且不含 NUL。 */
function textChunk(keyword: string, text: string): Buffer {
  return makeChunk('tEXt', Buffer.concat([
    Buffer.from(keyword, 'latin1'),
    Buffer.from([0]),
    Buffer.from(text, 'latin1'),
  ]));
}

/** iTXt 支持 UTF-8；不压缩。 */
function itxtChunk(keyword: string, text: string): Buffer {
  const head = Buffer.concat([
    Buffer.from(keyword, 'latin1'),
    Buffer.from([0, 0, 0]), // keyword NUL, compression flag 0, method 0
    Buffer.from([0]), // language tag 空
    Buffer.from([0]), // translated keyword 空
  ]);
  return makeChunk('iTXt', Buffer.concat([head, Buffer.from(text, 'utf8')]));
}

function encodeMetadataChunk(keyword: string, text: string): Buffer {
  if (!keyword || keyword.length > 79 || keyword.includes('\0')) throw new Error(`非法 PNG 文本关键字: ${keyword}`);
  return isLatin1(text) ? textChunk(keyword, text) : itxtChunk(keyword, text);
}

export interface PngTextEntry {
  keyword: string;
  text: string;
  kind: 'tEXt' | 'iTXt';
}

export function readPngText(bytes: Uint8Array): PngTextEntry[] {
  const out: PngTextEntry[] = [];
  for (const chunk of readChunks(Buffer.from(bytes))) {
    if (chunk.type === 'tEXt') {
      const zero = chunk.data.indexOf(0);
      if (zero < 0) continue;
      out.push({
        keyword: chunk.data.toString('latin1', 0, zero),
        text: chunk.data.toString('latin1', zero + 1),
        kind: 'tEXt',
      });
    } else if (chunk.type === 'iTXt') {
      const first = chunk.data.indexOf(0);
      if (first < 0) continue;
      const keyword = chunk.data.toString('latin1', 0, first);
      let offset = first + 1;
      const compression = chunk.data[offset] ?? 0;
      offset += 2;
      const langEnd = chunk.data.indexOf(0, offset);
      if (langEnd < 0) continue;
      const translatedEnd = chunk.data.indexOf(0, langEnd + 1);
      if (translatedEnd < 0) continue;
      const textBytes = chunk.data.subarray(translatedEnd + 1);
      if (compression === 0) {
        out.push({ keyword, text: textBytes.toString('utf8'), kind: 'iTXt' });
      }
    }
  }
  return out;
}

/**
 * 在 IEND 前插入文本块；同名（keyword）的旧块会被替换，其它块原样保留。
 */
export function addPngText(bytes: Uint8Array, entries: Record<string, string>): Buffer {
  const source = Buffer.from(bytes);
  const chunks = readChunks(source);
  const keys = new Set(Object.keys(entries));
  const kept: Buffer[] = [PNG_SIGNATURE];
  for (const chunk of chunks) {
    if (chunk.type === 'IEND') break;
    if (chunk.type === 'tEXt') {
      const zero = chunk.data.indexOf(0);
      const keyword = zero < 0 ? '' : chunk.data.toString('latin1', 0, zero);
      if (keys.has(keyword)) continue;
    }
    if (chunk.type === 'iTXt') {
      const zero = chunk.data.indexOf(0);
      const keyword = zero < 0 ? '' : chunk.data.toString('latin1', 0, zero);
      if (keys.has(keyword)) continue;
    }
    kept.push(chunk.raw);
  }
  for (const [keyword, text] of Object.entries(entries)) {
    if (text === undefined || text === null || text === '') continue;
    kept.push(encodeMetadataChunk(keyword, text));
  }
  const iend = chunks.find((chunk) => chunk.type === 'IEND');
  kept.push(iend?.raw ?? makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(kept);
}

export interface PngSize {
  width: number;
  height: number;
}

/** 从 IHDR 读宽高，不做完整解码。 */
export function pngSize(bytes: Uint8Array): PngSize | null {
  try {
    const buffer = Buffer.from(bytes);
    const chunks = readChunks(buffer);
    const ihdr = chunks.find((chunk) => chunk.type === 'IHDR');
    if (!ihdr || ihdr.data.length < 8) return null;
    return { width: ihdr.data.readUInt32BE(0), height: ihdr.data.readUInt32BE(4) };
  } catch {
    return null;
  }
}
