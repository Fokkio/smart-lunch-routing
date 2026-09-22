import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'lunch-ui-'));
const viewportWidth = Number(process.env.QA_WIDTH || 1440);
const viewportHeight = Number(process.env.QA_HEIGHT || 900);
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  '--remote-allow-origins=*', `--window-size=${viewportWidth},${viewportHeight}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
let sequence = 0;
const pending = new Map();

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  for (let i = 0; i < 40; i++) {
    const result = await check().catch(() => false);
    if (result) return result;
    await pause(150);
  }
  throw new Error(`Timed out: ${label}`);
}
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}
async function exists(selector) { return evaluate(`!!document.querySelector(${JSON.stringify(selector)})`); }
async function click(text, selector = 'button') {
  const didClick = await evaluate(`(() => { const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(x => x.textContent.trim().includes(${JSON.stringify(text)})); if (!element) return false; element.click(); return true; })()`);
  if (!didClick) throw new Error(`Button not found: ${text}`);
}
async function navigate(path) {
  await cdp('Page.navigate', { url: `http://127.0.0.1:4200${path}` });
  await until(() => exists('h1'), path);
}
async function assertNoPageOverflow(label) {
  const overflow = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth');
  if (overflow) throw new Error(`Horizontal page overflow: ${label}`);
}

try {
  const port = await until(async () => Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]), 'Chrome debugging port');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
    }
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await cdp('Page.enable');
  await cdp('Runtime.enable');

  await navigate('/owner/delivery');
  await click('คำนวณเส้นทาง');
  await until(() => exists('.result-grid'), 'route result');
  await assertNoPageOverflow('delivery result');
  if (process.env.QA_CAPTURE) {
    await pause(2000);
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(process.env.QA_CAPTURE, Buffer.from(screenshot.data, 'base64'));
  }
  await click('คำนวณใหม่เพื่อเปรียบเทียบ');
  await until(() => exists('.comparison'), 'route comparison');
  await click('เลือกแผนใหม่');

  await navigate('/rider');
  await click('LUNCH-101');
  await until(() => exists('.job-summary'), 'rider summary');
  await assertNoPageOverflow('rider summary');
  await click('เริ่มส่ง');
  await until(() => exists('.delivery-stop'), 'first stop');
  for (let i = 0; i < 3; i++) await click('ส่งจุดนี้สำเร็จ');
  await until(() => exists('.completed-panel'), 'completed screen');

  await navigate('/owner/customers');
  await click('เพิ่มลูกค้า');
  await until(() => exists('.form-panel'), 'customer form');
  await assertNoPageOverflow('customer form');
  await click('ระบุพิกัดด้วยตัวเลข');
  await evaluate("for (const [name,value] of Object.entries({name:'ลูกค้าทดสอบ',phone:'0000000000',manualLat:'16.246',manualLng:'103.253'})) { const field = document.getElementsByName(name)[0]; field.value=value; field.dispatchEvent(new Event('input',{bubbles:true})); }");
  await pause(100);
  await click('ใช้ตำแหน่งนี้');
  await until(() => exists('.location-confirm'), 'keyboard location selection');
  await click('บันทึกข้อมูล');
  await until(() => evaluate('document.body.textContent.includes("27 รายการ")'), 'customer saved');
  console.log('PASS: route calculation, comparison, rider three-stop flow, keyboard location entry');
} finally {
  socket?.close();
  chrome.kill();
  await pause(300);
  if (!resolve(profile).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary profile path');
  await rm(profile, { recursive: true, force: true });
}
