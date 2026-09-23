#!/usr/bin/env node
/**
 * 批量截图脚本：一次性截取所有运行时页面
 * 
 * 用法：
 *   node scripts/capture-screens.mjs --round=1
 *   node scripts/capture-screens.mjs --round=2 --screens=home,departments
 * 
 * 输出：artifacts/visual-diff/round-N/actuals/*.png
 */

import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProject, gateCredentials } from "./lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

// 解析命令行参数
const args = process.argv.slice(2);
const roundArg = args.find(a => a.startsWith('--round='));
const screensArg = args.find(a => a.startsWith('--screens='));

const round = roundArg ? roundArg.split('=')[1] : '1';
const targetScreens = screensArg ? screensArg.split('=')[1].split(',') : null;

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const { slug } = resolveProject(root);
const { email, password, storageKey } = gateCredentials(root);

// 从 screenConfigs 读取路由列表
function loadScreenConfigs() {
  const configPath = resolve(root, "apps/web/src/generated/screenConfigs.ts");
  if (!existsSync(configPath)) {
    console.error("❌ screenConfigs.ts 不存在，请先运行 npm run visual:gen");
    process.exit(1);
  }
  
  const content = readFileSync(configPath, "utf-8");
  const routes = [];
  
  // 解析 routeConfig 数组（JSON 键序：name 在 route 前，支持两种顺序）
  const routeRegex = /route:\s*['"]([^'"]+)['"][\s\S]{0,120}?name:\s*['"]([^'"]+)['"]|name:\s*['"]([^'"]+)['"][\s\S]{0,120}?route:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    if (match[1] !== undefined) {
      routes.push({ route: match[1], name: match[2] });
    } else {
      routes.push({ route: match[4], name: match[3] });
    }
  }
  
  return routes;
}

// 从 Layout IR 读取视口配置
function loadViewport(screenName) {
  const layoutIRPath = resolve(root, `fixtures/${slug}/layout-ir/${screenName}.json`);
  
  if (existsSync(layoutIRPath)) {
    const layoutIR = JSON.parse(readFileSync(layoutIRPath, "utf-8"));
    if (layoutIR.screen && layoutIR.screen.width && layoutIR.screen.height) {
      return {
        width: layoutIR.screen.width,
        height: layoutIR.screen.height
      };
    }
  }
  
  // 默认视口
  return { width: 1440, height: 1068 };
}

async function main() {
  const playwright = require("playwright");
  
  console.log(`🔄 开始第 ${round} 轮批量截图...\n`);
  
  // 加载路由配置
  const routes = loadScreenConfigs();
  const filteredRoutes = targetScreens 
    ? routes.filter(r => targetScreens.some(s => r.route.includes(s) || r.name.includes(s)))
    : routes;
  
  console.log(`📄 待截图页面：${filteredRoutes.length} 个`);
  if (targetScreens) {
    console.log(`   筛选：${targetScreens.join(', ')}`);
  }
  console.log('');
  
  // 准备输出目录
  const outDir = resolve(root, `artifacts/visual-diff/round-${round}/actuals`);
  mkdirSync(outDir, { recursive: true });
  
  // 启动浏览器
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // 1. 一次性登录
    console.log("🔑 正在登录...");
    const loginRes = await fetch(`${WEB_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: gateCredentials(root).username, password }),
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    const accessToken = loginBody.access_token || loginBody.token;
    
    if (!loginRes.ok || !accessToken) {
      console.error("❌ 登录失败", loginRes.status, loginBody);
      process.exit(1);
    }
    
    console.log("✅ 登录成功\n");
    
    // 2. 设置登录态
    await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem(storageKey, token);
        localStorage.setItem(storageKey + "_user", JSON.stringify(user));
      },
      { token: accessToken, user: loginBody.user }
    );
    
    // 3. 批量截图所有页面
    console.log("📸 开始批量截图...\n");
    const screenshots = [];
    
    for (const route of filteredRoutes) {
      const routeName = route.name || route.route.replace('/', '') || 'home';
      const screenshotName = `${routeName}.png`;
      
      console.log(`   截图：${routeName} (${route.route})`);
      
      try {
        // 从 Layout IR 读取视口（动态尺寸）
        const viewport = loadViewport(routeName);
        await page.setViewportSize(viewport);
        
        // 访问页面（带 visualGate=1 冻结数据）
        await page.goto(`${WEB_URL}${route.route}?visualGate=1`, { 
          waitUntil: "networkidle",
          timeout: 30000
        });
        
        // 等待字体加载完成
        await page.evaluate(() => document.fonts.ready);
        
        // 等待侧栏加载（确保页面已完全渲染）
        try {
          await page.waitForSelector(".app-sider", { timeout: 10000 });
        } catch {
          // 某些页面可能没有侧栏
        }
        
        // 截图
        const screenshot = await page.screenshot({ fullPage: false });
        const outputPath = resolve(outDir, screenshotName);
        writeFileSync(outputPath, screenshot);
        
        screenshots.push({
          name: routeName,
          route: route.route,
          path: outputPath,
          status: 'success',
          viewport
        });
        
        console.log(`      ✅ 成功 (视口：${viewport.width}×${viewport.height})\n`);
      } catch (error) {
        console.error(`      ❌ 失败：${error.message}\n`);
        screenshots.push({
          name: routeName,
          route: route.route,
          path: null,
          status: 'failed',
          error: error.message,
          viewport: loadViewport(routeName)
        });
      }
    }
    
    // 4. 输出统计
    const successCount = screenshots.filter(s => s.status === 'success').length;
    const failedCount = screenshots.filter(s => s.status === 'failed').length;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 截图统计：");
    console.log(`   总页面数：${screenshots.length}`);
    console.log(`   ✅ 成功：${successCount}`);
    console.log(`   ❌ 失败：${failedCount}`);
    console.log(`   输出目录：${outDir}`);
    
    if (failedCount > 0) {
      console.log("\n   失败的页面：");
      screenshots.filter(s => s.status === 'failed').forEach(s => {
        console.log(`   - ${s.name}: ${s.error}`);
      });
    }
    
    console.log("=".repeat(60) + "\n");
    
    // 保存截图清单
    const manifest = {
      round: parseInt(round),
      timestamp: new Date().toISOString(),
      totalScreens: screenshots.length,
      successCount,
      failedCount,
      screenshots
    };
    
    writeFileSync(
      resolve(outDir, "manifest.json"),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log("✅ 批量截图完成！");
    console.log(`   清单文件：${resolve(outDir, "manifest.json")}\n`);
    
  } catch (error) {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
