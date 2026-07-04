const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:3000/scratch-verify-followup-fix', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Run Setup")');
  await page.waitForTimeout(300);

  const logText1 = await page.locator('#log-output').innerText();
  console.log('--- AFTER SETUP ---');
  console.log(logText1);

  await page.click('button:has-text("Run Scheduler Tick")');
  console.log('Waiting for scheduler pacing gate to resolve (can take several minutes by design)...');
  await page.waitForFunction(
    () => document.querySelector('#log-output')?.textContent?.includes('WA_LOGS='),
    undefined,
    { timeout: 9 * 60_000 },
  );

  const logText2 = await page.locator('#log-output').innerText();
  console.log('--- AFTER SCHEDULER TICK ---');
  console.log(logText2);

  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
