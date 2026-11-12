// Mini créateur de fichier ZIP (sans compression) : suffisant pour un .xlsx.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function createZip(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const entries = files.map((f) => {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    return { name, data, crc: crc32(data) };
  });

  const total =
    entries.reduce((s, e) => s + 30 + e.name.length + e.data.length, 0) +
    entries.reduce((s, e) => s + 46 + e.name.length, 0) +
    22;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let pos = 0;
  const offsets = [];

  const u16 = (v) => { view.setUint16(pos, v, true); pos += 2; };
  const u32 = (v) => { view.setUint32(pos, v, true); pos += 4; };
  const bytes = (b) => { out.set(b, pos); pos += b.length; };

  for (const e of entries) {
    offsets.push(pos);
    u32(0x04034b50); u16(20); u16(0x0800); u16(0);
    u16(dosTime); u16(dosDate);
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.name.length); u16(0);
    bytes(e.name); bytes(e.data);
  }

  const cdStart = pos;
  entries.forEach((e, i) => {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0);
    u16(dosTime); u16(dosDate);
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.name.length); u16(0); u16(0); u16(0); u16(0); u32(0);
    u32(offsets[i]);
    bytes(e.name);
  });
  const cdSize = pos - cdStart;

  u32(0x06054b50); u16(0); u16(0);
  u16(entries.length); u16(entries.length);
  u32(cdSize); u32(cdStart); u16(0);

  return out;
}
