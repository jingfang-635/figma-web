import { chromium } from 'playwright';

const loginRes = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@sunshine.com', password: 'Admin@123456' }),
});
const login = await loginRes.json();
const token = login.access_token || login.token;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto('http://localhost:5173/login');
await page.evaluate((t) => {
  localStorage.setItem('auth_token', t);
  localStorage.setItem('auth_token_user', JSON.stringify({ username: 'admin', name: '管理员', role: 'ADMIN' }));
}, token);
await page.goto('http://localhost:5173/schedules');
await page.waitForTimeout(6000);
console.log('URL:', page.url());
await page.screenshot({ path: 'artifacts/visual-diff/_schedules-check.png', fullPage: true });
const html = await page.content();
console.log('has calendar-grid:', html.includes('calendar-grid'));
console.log('has page-title:', html.includes('page-title'));
console.log('body snippet:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' | '));
await browser.close();