#!/usr/bin/env node
// Debug: load app after login, dump console errors + body snapshot.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const WEB_URL = "http://localhost:5173";

const login = await fetch(`${WEB_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@sunshine.clinic", password: "admin123" }),
}).then((r) => r.json());

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

await page.goto(`${WEB_URL}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate(({ token, user }) => {
  localStorage.setItem("sunshine_token", token);
  localStorage.setItem("sunshine_user", JSON.stringify(user));
}, { token: login.access_token, user: login.user });
await page.goto(`${WEB_URL}/?visualGate=1`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("SIDER VISIBLE:", await page.locator(".app-sider").isVisible().catch(() => false));
console.log("LOGIN BTN:", await page.getByRole("button", { name: /登\s*录/ }).count());
console.log("BODY SNIPPET:", (await page.evaluate(() => document.body.innerText.slice(0, 300))).replace(/\n+/g, " | "));
await browser.close();
