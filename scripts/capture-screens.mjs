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
import { resolveProject, gateCredentials, shadowPad } from "./lib/project.mjs";

const require = createRequire(import.meta.url);
const root = resolve(process.cwd());

// 解析命令行参数
const args = process.argv.slice(2);
const roundArg = args.find(a => a.startsWith('--round='));
const screensArg = args.find(a => a.startsWith('--screens='));

const round = roundArg ? roundArg.split('=')[1] : '1';
const targetScreens = screensArg ? screensArg.split('=')[1].split(',') : null;

const WEB_URL = process.env.WEB_URL || "http://localhost:5173";
const { slug, spec } = resolveProject(root);
const { email, password, storageKey } = gateCredentials(root);

// 从 app-spec 读取弹窗清单（type=modal，含 trigger），与页面截图走同一套命名/目录
function loadModalTargets() {
  const screens = spec?.screens || [];
  return screens
    .filter((s) => s.type === "modal" && s.route && s.modal?.trigger)
    .map((s) => ({ id: s.id, route: s.route, name: s.name, trigger: s.modal.trigger }));
}

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
  const routeRegex = /"?(?:route)"?\s*:\s*['"]([^'"]+)['"][\s\S]{0,160}?"?(?:name)"?\s*:\s*['"]([^'"]+)['"]|"?(?:name)"?\s*:\s*['"]([^'"]+)['"][\s\S]{0,160}?"?(?:route)"?\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    if (match[1] !== undefined) {
      routes.push({ route: match[1], name: match[2] });
    } else {
      routes.push({ route: match[4], name: match[3] });
    }
  }
  
  // chrome 组件（sidebar 等）不是页面，跳过
  return routes.filter((r) => r.route && r.route !== '/sidebar');
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
const { PNG } = require("pngjs");

/** 弹窗截图补白边：按 IR 阴影余量四边补（详见 lib/project.mjs shadowPad）
 *  旧实现固定 12px 四边 → 纵向与标杆错位 shadow.y（本设计 4px）→ 逐像素比必判结构错位 */
function padWhite(buf, pad = { left: 12, right: 12, top: 12, bottom: 12 }) {
  const inner = PNG.sync.read(buf);
  const padded = new PNG({
    width: inner.width + pad.left + pad.right,
    height: inner.height + pad.top + pad.bottom,
  });
  padded.data.fill(255);
  PNG.bitblt(inner, padded, 0, 0, inner.width, inner.height, pad.left, pad.top);
  return PNG.sync.write(padded);
}
  
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

  // 弹窗目标（app-spec type=modal；--screens 过滤同样生效）
  const modalTargets = loadModalTargets().filter((m) =>
    !targetScreens || targetScreens.some((s) => m.route.includes(s) || m.name.includes(s) || m.id.includes(s))
  );
  if (modalTargets.length) {
    console.log(`🪟 待截图弹窗：${modalTargets.length} 个（trigger 驱动，截 .ant-modal-content）`);
    for (const m of modalTargets) console.log(`   - ${m.name} (${m.route}, trigger: ${m.trigger})`);
    console.log('');
  }
  
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
      ({ token, user, storageKey }) => {
        localStorage.setItem(storageKey, token);
        localStorage.setItem(storageKey + "_user", JSON.stringify(user));
      },
      { token: accessToken, user: loginBody.user, storageKey }
    );
    
    // 3. 批量截图所有页面 + 弹窗
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
    
    // 4. 弹窗截图（点击 trigger → 截 .ant-modal-content，命名与标杆图一致）
    for (const m of modalTargets) {
      console.log(`   弹窗：${m.name} (${m.route}, trigger: ${m.trigger})`);
      try {
        const viewport = loadViewport(m.id);
        await page.setViewportSize(viewport);
        await page.goto(`${WEB_URL}${m.route}?visualGate=1`, { waitUntil: "networkidle", timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        try {
          await page.waitForSelector(".ant-table, .calendar-grid, .app-content", { timeout: 10000 });
        } catch {
          // 页面主体选择器缺失时仍尝试点击
        }
        await page.getByRole("button", { name: m.trigger }).first().click({ force: true });
        await page.getByRole("dialog").waitFor({ state: "visible", timeout: 8000 });
        await page.waitForTimeout(400);
        await page.evaluate(() => document.fonts.ready);

        const content = page.locator(".ant-modal-content").last();
        const box = await content.boundingBox();
        if (!box) throw new Error("modal content not visible");
        const clip = {
          x: Math.max(0, Math.round(box.x)),
          y: Math.max(0, Math.round(box.y)),
          width: Math.ceil(box.width),
          height: Math.ceil(box.height),
        };
        const screenshot = await page.screenshot({ type: "png", clip, animations: "disabled", caret: "hide" });
        const outputPath = resolve(outDir, `${m.name}.png`);
        writeFileSync(outputPath, padWhite(screenshot, shadowPad(root, m.id)));
        screenshots.push({ name: m.name, route: m.route, path: outputPath, status: 'success', modal: true, viewport: clip });
        console.log(`      ✅ 成功 (弹窗 ${clip.width}×${clip.height})\n`);
      } catch (error) {
        console.error(`      ❌ 失败：${error.message}\n`);
        screenshots.push({ name: m.name, route: m.route, path: null, status: 'failed', modal: true, error: error.message });
      }
    }

    // 5. 输出统计
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
