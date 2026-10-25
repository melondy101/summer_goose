import { inflateSync } from "node:zlib";

function decode(bytes) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + pos);
    const length = view.getUint32(0);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(8);
      height = view.getUint32(12);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const px = new Uint8ClampedArray(width * height * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) {
    const off = y * (stride + 1);
    const f = raw[off];
    for (let x = 0; x < stride; x += 1) {
      const v = raw[off + 1 + x];
      const l = x >= 4 ? line[x - 4] : 0;
      const u = prev[x];
      const ul = x >= 4 ? prev[x - 4] : 0;
      let o;
      if (f === 0) o = v;
      else if (f === 1) o = v + l;
      else if (f === 2) o = v + u;
      else if (f === 3) o = v + ((l + u) >> 1);
      else o = v + paeth(l, u, ul);
      line[x] = o & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const d = (y * width + x) * 4;
      px[d] = line[x * 4];
      px[d + 1] = line[x * 4 + 1];
      px[d + 2] = line[x * 4 + 2];
      px[d + 3] = line[x * 4 + 3];
    }
    prev.set(line);
  }
  let sum = 0;
  let sq = 0;
  const n = width * height;
  for (let i = 0; i < n; i += 1) {
    const l = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
    sum += l;
    sq += l * l;
  }
  const mean = sum / n;
  const std = Math.sqrt(sq / n - mean * mean);
  return { width, height, colorType, mean: Number(mean.toFixed(1)), std: Number(std.toFixed(1)) };
}

const files = process.argv.slice(2);
for (const file of files) {
  const bytes = new Uint8Array(await Bun.file(file).arrayBuffer());
  console.log(file, JSON.stringify(decode(bytes)));
}
