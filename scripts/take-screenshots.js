const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve('readme-assets');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Edge...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Home Page
  console.log('Navigating to Home...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'home.png') });
  console.log('Captured home.png');

  // 2. Docs Page
  console.log('Navigating to Docs...');
  await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'docs.png') });
  console.log('Captured docs.png');

  // 3. Cache Page
  console.log('Navigating to Cache...');
  await page.goto(`${BASE_URL}/cache`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'cache.png') });
  console.log('Captured cache.png');

  // 4. Login Page
  console.log('Navigating to Login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'login.png') });
  console.log('Captured login.png');

  // 5. Signup Page
  console.log('Navigating to Signup...');
  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'signup.png') });
  console.log('Captured signup.png');

  // 6. Sign up or Log in
  console.log('Attempting to log in or register test user...');
  const testEmail = 'test-demo@paruluniversity.ac.in';
  const testPassword = 'Password123';
  const testName = 'Test Student';

  // Let's try registering first
  try {
    console.log('Filling out signup form...');
    await page.type('input[placeholder="Riya Patel"]', testName);
    await page.type(`input[placeholder="yourname@paruluniversity.ac.in"]`, testEmail);
    await page.type('input[placeholder="At least 8 characters"]', testPassword);
    
    console.log('Submitting signup...');
    await page.click('button[type="submit"]');
    
    // Wait for either navigation to /app or error message
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
  } catch (err) {
    console.log('Signup step encountered error or was already done:', err.message);
  }

  // If we are not on /app, let's try logging in
  let currentUrl = page.url();
  if (!currentUrl.endsWith('/app')) {
    console.log('Not on /app, going to /login to sign in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    await page.type(`input[placeholder="yourname@paruluniversity.ac.in"]`, testEmail);
    await page.type('input[placeholder="At least 8 characters"]', testPassword);
    
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
  }

  // Verify we are logged in
  currentUrl = page.url();
  console.log('Current URL after auth attempts:', currentUrl);

  // Take screenshot of AppChat
  if (currentUrl.endsWith('/app')) {
    console.log('Successfully logged in! Taking screenshot of app...');
    // Give a second for any dynamic animations
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'app.png') });
    console.log('Captured app.png');

    // 7. Profile Page
    console.log('Navigating to Profile...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'profile.png') });
    console.log('Captured profile.png');

    // 8. Admin Page
    console.log('Navigating to Admin...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'admin.png') });
    console.log('Captured admin.png');
  } else {
    console.log('Warning: Could not log in. App/Profile/Admin screenshots may be blank or redirect to login.');
    // Let's capture anyway so we have a visual reference
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'app.png') });
  }

  await browser.close();
  console.log('Screenshots complete!');
}

run().catch(err => {
  console.error('Error during screenshot run:', err);
  process.exit(1);
});
