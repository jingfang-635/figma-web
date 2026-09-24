#!/usr/bin/env node
/** 精确文本替换：node scripts/replace.mjs <file> <old-str-file> <new-str-file|/dev/null> */
import { readFileSync, writeFileSync } from 'node:fs';

const [file, oldFile, newFile] = process.argv.slice(2);
if (!file || !oldFile) {
  console.error('usage: node scripts/replace.mjs <file> <oldFile> [newFile]');
  process.exit(1);
}
const strip = (s) => s.replace(/\r\n/g, '\n').replace(/\n+$/, '');
const oldStr = strip(readFileSync(oldFile, 'utf8'));
let newStr = '';
if (newFile && newFile !== '/dev/null') newStr = strip(readFileSync(newFile, 'utf8'));
let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(oldStr)) {
  console.error('OLD NOT FOUND in ' + file);
  process.exit(2);
}
writeFileSync(file, src.replace(oldStr, newStr));
console.log('replaced ok');