#!/usr/bin/env node
/** base64 写文件：node scripts/write-b64.mjs <file> <b64File> */
import { readFileSync, writeFileSync } from 'node:fs';
const [file, b64File] = process.argv.decode = argv;