// Minimal ZIP builder using STORE method (no compression) with CRC32.
// Produces a valid .zip Blob from a list of { name, content } string files.

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
}
function u32(n) {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}
function concat(arrs) {
  let len = 0;
  arrs.forEach((a) => (len += a.length));
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

export function buildZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    const dataBytes = new TextEncoder().encode(f.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const lh = new Uint8Array(30 + nameBytes.length);
    lh.set(u32(0x04034b50), 0);
    lh.set(u16(20), 4);
    lh.set(u16(0), 6);
    lh.set(u16(0), 8);
    lh.set(u16(0), 10);
    lh.set(u16(0), 12);
    lh.set(u32(crc), 14);
    lh.set(u32(size), 18);
    lh.set(u32(size), 22);
    lh.set(u16(nameBytes.length), 26);
    lh.set(u16(0), 28);
    lh.set(nameBytes, 30);
    chunks.push(lh, dataBytes);

    const cd = new Uint8Array(46 + nameBytes.length);
    cd.set(u32(0x02014b50), 0);
    cd.set(u16(20), 4);
    cd.set(u16(20), 6);
    cd.set(u16(0), 8);
    cd.set(u16(0), 10);
    cd.set(u16(0), 12);
    cd.set(u16(0), 14);
    cd.set(u32(crc), 16);
    cd.set(u32(size), 20);
    cd.set(u32(size), 24);
    cd.set(u16(nameBytes.length), 28);
    cd.set(u16(0), 30);
    cd.set(u16(0), 32);
    cd.set(u16(0), 34);
    cd.set(u16(0), 36);
    cd.set(u32(0), 38);
    cd.set(u32(offset), 42);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += lh.length + dataBytes.length;
  }

  const centralBytes = concat(central);
  const eocd = new Uint8Array(22);
  eocd.set(u32(0x06054b50), 0);
  eocd.set(u16(0), 4);
  eocd.set(u16(0), 6);
  eocd.set(u16(files.length), 8);
  eocd.set(u16(files.length), 10);
  eocd.set(u32(centralBytes.length), 12);
  eocd.set(u32(offset), 16);
  eocd.set(u16(0), 20);

  return new Blob([concat(chunks), centralBytes, eocd], { type: "application/zip" });
}