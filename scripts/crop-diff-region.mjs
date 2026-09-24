import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

function crop(name, y0, y1) {
  const png = PNG.sync.read(readFileSync(`artifacts/visual-diff/${name}.png`));
  const H = y1 - y0;
  const out = new PNG({ width: png.width, height: H });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < png.width; x++) {
      const si = ((y + y0) * png.width + x) * 4;
      const di = (y * png.width + x) * 4;
      for (let k = 0; k < 4; k++) out.data[di + k] = png.data[si + k];
    }
  }
  writeFileSync(`artifacts/visual-diff/_crop-${name}-${y0}.png`, PNG.sync.write(out));
  console.log(`saved _crop-${name}-${y0}.png`);
}

crop('modal-create-schedule.actual', 430, 513);
crop('modal-create-schedule.expected', 430, 513);
crop('modal-batch-schedule.actual', 150, 260);
crop('modal-batch-schedule.expected', 150, 260);