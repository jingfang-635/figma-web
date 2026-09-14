#!/usr/bin/env node
/**
 * JWT 密钥自动生成脚本
 * 
 * 用法：
 *   node scripts/generate-jwt-secret.mjs
 * 
 * 输出：随机生成的 64 字符 JWT_SECRET
 */

import { randomBytes } from 'crypto';

const secret = randomBytes(32).toString('hex');
console.log(secret);
