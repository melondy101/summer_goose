// 从 assets/concepts/aman-c-simple-v1.png 生成 PWA 图标。
// 只做缩放排版，不重画形象。纯 JS（node:zlib 解码/编码 PNG），不依赖浏览器或图像库。
// 用法：bun scripts/gen_icons.mjs
import { deflateSync, inflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SOURCE = path.join(ROOT, "assets", "concepts", "aman-c-simple-v1.png");
const OUT_DIR = path.join(ROOT, "assets", "icons");
const BG = [0xfb, 0xf4, 0xe7]; // --color-ground

const SIZES = [
  { name: "icon-192.png", size: 192, pad: 0.08 },
  { name: "icon-512.png", size: 512, pad: 0.08 },
  { name: "icon-maskable-512.png", size: 512, pad: 0.25 },
  { name: "apple-touch-icon.png", size: 180, pad: 0.1 },
];

// ---------- PNG 解码 ----------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** 解码为 { width, height, rgba: Uint8ClampedArray }；支持 8 位深的 0/2/4/6 色型。 */
function decodePng(bytes) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i += 1) {
    if (bytes[i] !== sig[i]) throw new Error("不是 PNG 文件");
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = -1;
  const idat = [];
  let palette = null;
  let transparency = null;

  while (pos < bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + pos, bytes.length - pos);
    const length = view.getUint32(0);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      const header = new DataView(data.buffer, data.byteOffset, data.length);
      width = header.getUint32(0);
      height = header.getUint32(4);
      bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8) throw new Error(`只支持 8 位深，遇到 ${bitDepth}`);
      if (data[12] !== 0) throw new Error("不支持交错 PNG");
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }
  if (!width || !height) throw new Error("缺少 IHDR");

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const offset = y * (stride + 1);
    const filter = raw[offset];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[offset + 1 + x];
      const left = x >= channels ? line[x - channels] : 0;
      const up = prev[x];
      const upLeft = x >= channels ? prev[x - channels] : 0;
      let out;
      if (filter === 0) out = value;
      else if (filter === 1) out = value + left;
      else if (filter === 2) out = value + up;
      else if (filter === 3) out = value + ((left + up) >> 1);
      else if (filter === 4) out = value + paeth(left, up, upLeft);
      else throw new Error(`未知过滤器 ${filter}`);
      line[x] = out & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const dst = (y * width + x) * 4;
      if (colorType === 6) {
        pixels[dst] = line[x * 4];
        pixels[dst + 1] = line[x * 4 + 1];
        pixels[dst + 2] = line[x * 4 + 2];
        pixels[dst + 3] = line[x * 4 + 3];
      } else if (colorType === 2) {
        pixels[dst] = line[x * 3];
        pixels[dst + 1] = line[x * 3 + 1];
        pixels[dst + 2] = line[x * 3 + 2];
        pixels[dst + 3] = 255;
      } else if (colorType === 0) {
        pixels[dst] = pixels[dst + 1] = pixels[dst + 2] = line[x];
        pixels[dst + 3] = 255;
      } else if (colorType === 4) {
        pixels[dst] = pixels[dst + 1] = pixels[dst + 2] = line[x * 2];
        pixels[dst + 3] = line[x * 2 + 1];
      } else if (colorType === 3) {
        const index = line[x];
        pixels[dst] = palette[index * 3];
        pixels[dst + 1] = palette[index * 3 + 1];
        pixels[dst + 2] = palette[index * 3 + 2];
        pixels[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      }
    }
    prev.set(line);
  }
  return { width, height, rgba: pixels };
}

// ---------- 面积平均重采样 ----------
function resample(source, srcW, srcH, dstW, dstH) {
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const sx = srcW / dstW;
  const sy = srcH / dstH;
  for (let dy = 0; dy < dstH; dy += 1) {
    const y0 = dy * sy;
    const y1 = y0 + sy;
    for (let dx = 0; dx < dstW; dx += 1) {
      const x0 = dx * sx;
      const x1 = x0 + sx;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let weight = 0;
      const iy0 = Math.floor(y0);
      const iy1 = Math.min(Math.ceil(y1), srcH);
      const ix0 = Math.floor(x0);
      const ix1 = Math.min(Math.ceil(x1), srcW);
      for (let iy = iy0; iy < iy1; iy += 1) {
        const wy = Math.min(y1, iy + 1) - Math.max(y0, iy);
        if (wy <= 0) continue;
        for (let ix = ix0; ix < ix1; ix += 1) {
          const wx = Math.min(x1, ix + 1) - Math.max(x0, ix);
          if (wx <= 0) continue;
          const w = wx * wy;
          const src = (iy * srcW + ix) * 4;
          const alpha = source[src + 3] / 255;
          r += source[src] * alpha * w;
          g += source[src + 1] * alpha * w;
          b += source[src + 2] * alpha * w;
          a += alpha * w;
          weight += w;
        }
      }
      const dst = (dy * dstW + dx) * 4;
      if (weight > 0 && a > 0) {
        // a 与 r 都按 0–1 的 alpha 权重累计：RGB 取加权均值，alpha 回存 0–255
        out[dst] = r / a;
        out[dst + 1] = g / a;
        out[dst + 2] = b / a;
        out[dst + 3] = Math.round((a / weight) * 255);
      } else {
        out[dst] = out[dst + 1] = out[dst + 2] = 0;
        out[dst + 3] = 0;
      }
    }
  }
  return out;
}

// ---------- PNG 编码 ----------
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // 过滤器 0，图标尺寸小，直接存
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- 主流程 ----------
const sourceBytes = new Uint8Array(await (await import("node:fs/promises")).readFile(SOURCE));
const image = decodePng(sourceBytes);
await mkdir(OUT_DIR, { recursive: true });

for (const { name, size, pad } of SIZES) {
  const inset = Math.round(size * pad);
  const box = size - inset * 2;
  const scaled = resample(image.rgba, image.width, image.height, box, box);
  // 铺在底色上，避免透明边缘在安装界面里发黑
  const canvas = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    canvas[i * 4] = BG[0];
    canvas[i * 4 + 1] = BG[1];
    canvas[i * 4 + 2] = BG[2];
    canvas[i * 4 + 3] = 255;
  }
  for (let y = 0; y < box; y += 1) {
    for (let x = 0; x < box; x += 1) {
      const src = (y * box + x) * 4;
      const alpha = scaled[src + 3] / 255;
      const dst = ((y + inset) * size + (x + inset)) * 4;
      canvas[dst] = scaled[src] * alpha + BG[0] * (1 - alpha);
      canvas[dst + 1] = scaled[src + 1] * alpha + BG[1] * (1 - alpha);
      canvas[dst + 2] = scaled[src + 2] * alpha + BG[2] * (1 - alpha);
      canvas[dst + 3] = 255;
    }
  }
  await writeFile(path.join(OUT_DIR, name), encodePng(size, size, canvas));
  console.log(`已生成 ${name} (${size}x${size})`);
}
console.log(`源图 ${image.width}x${image.height}，全部图标来自同一张阿满原图的缩放。`);
