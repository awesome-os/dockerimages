#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function parseOutPath(argv) {
  let outPath = '/tmp/holo-e2e-offscreen-probe.bmp';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out' && argv[i + 1]) {
      outPath = argv[i + 1];
      i++;
    } else if (arg.startsWith('--out=')) {
      outPath = arg.slice('--out='.length);
    }
  }
  return outPath;
}

function checkExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function checkGcc() {
  try {
    const out = execFileSync('gcc', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      gcc: true,
      gccVersion: out.split(/\r?\n/)[0]?.trim() || null,
    };
  } catch {
    return { gcc: false, gccVersion: null };
  }
}

function findLavapipeIcd() {
  const icdDirs = ['/usr/share/vulkan/icd.d', '/etc/vulkan/icd.d'];
  for (const dir of icdDirs) {
    try {
      const entries = fs.readdirSync(dir).sort();
      const match = entries.find((name) => /^lvp_icd.*\.json$/i.test(name));
      if (match) {
        return path.posix.join(dir, match);
      }
    } catch {
      // Directory may not exist on non-Linux hosts or minimal setups
    }
  }
  return null;
}

function writeAndVerifyBmp(outPath) {
  const width = 64;
  const height = 32;
  const bytesPerPixel = 3;
  const rowBytes = width * bytesPerPixel; // 192 bytes/row (divisible by 4 -> 0 padding)
  const pixelBytes = rowBytes * height; // 6144 bytes
  const headerBytes = 54;
  const totalBytes = headerBytes + pixelBytes; // 6198 bytes

  const buf = Buffer.alloc(totalBytes);
  // BMP File Header (14 bytes)
  buf.writeUInt8(0x42, 0); // 'B'
  buf.writeUInt8(0x4d, 1); // 'M'
  buf.writeUInt32LE(totalBytes, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(headerBytes, 10);

  // DIB BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // 24-bit RGB
  buf.writeUInt32LE(0, 30); // BI_RGB uncompressed
  buf.writeUInt32LE(pixelBytes, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI X
  buf.writeInt32LE(2835, 42); // ~72 DPI Y
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Deterministic offscreen BGR test pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = headerBytes + y * rowBytes + x * bytesPerPixel;
      buf[offset] = (x * 4) & 0xff;
      buf[offset + 1] = (y * 8) & 0xff;
      buf[offset + 2] = ((x + y) * 3) & 0xff;
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);

  const readBack = fs.readFileSync(outPath);
  const bmpOk =
    readBack.length === 6198 &&
    readBack[0] === 0x42 &&
    readBack[1] === 0x4d;
  const bmpSha512 = crypto.createHash('sha512').update(readBack).digest('hex');

  return {
    bmpOk,
    bmpBytes: readBack.length,
    bmpSha512,
  };
}

const args = process.argv.slice(2);
const liteMode = process.env.HOLO_E2E_LITE === '1' || args.includes('--lite');
const outPath = parseOutPath(args);
const nodeVersion = process.versions.node;
const nodeMajor = Number.parseInt(nodeVersion.split('.')[0] ?? '0', 10);
const nodeOk = Number.isFinite(nodeMajor) && nodeMajor >= 24;

const casDir = process.env.B8G_CAS_DIR ?? '';
const casV11Root = process.env.B8G_CAS_V11_ROOT ?? '';
const casOk =
  casDir === '/var/lib/b8g/cas' &&
  casV11Root === '/var/lib/b8g/cas/v11' &&
  fs.existsSync(casDir) &&
  fs.existsSync(casV11Root);

const holoPm = checkExecutable('/bin/holo-pm');
const { gcc, gccVersion } = checkGcc();
const lavapipeIcd = findLavapipeIcd();
const { bmpOk, bmpBytes, bmpSha512 } = writeAndVerifyBmp(outPath);

const result = {
  schema: 'holo-e2e.probe.v1',
  abiMagic: '0x33564742',
  offscreenZeroX11: true,
  liteMode,
  nodeVersion,
  nodeOk,
  casDir,
  casV11Root,
  casOk,
  holoPm,
  gcc,
  gccVersion,
  lavapipeIcd,
  bmpPath: outPath,
  bmpBytes,
  bmpSha512,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

const toolchainGpuOk = liteMode ? true : (gcc && Boolean(lavapipeIcd));
if (!nodeOk || !casOk || !holoPm || !toolchainGpuOk || !bmpOk) {
  process.exitCode = 1;
}
