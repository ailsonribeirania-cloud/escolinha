import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const svg = await readFile('public/logo.svg');
for (const size of [192, 512]) await sharp(svg).resize(size,size).png().toFile(`public/icon-${size}.png`);
await sharp({create:{width:512,height:512,channels:4,background:'#245e50'}}).composite([{input:await sharp(svg).resize(320,320).toBuffer(),gravity:'centre'}]).png().toFile('public/icon-maskable.png');
