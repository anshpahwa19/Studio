// Desktop shell: runs the app's server in the background and shows it in a window.
// Data lives in the user's Application Support folder, so app updates never touch it.
const { app, BrowserWindow, dialog, shell, utilityProcess } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Same data folder whether run from source or installed: ~/Library/Application Support/Salon Studio
app.setName('Salon Studio');
app.setPath('userData', path.join(app.getPath('appData'), 'Salon Studio'));
let server = null;
let win = null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

function prepareData() {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const db = path.join(dir, 'salon.db');
  if (!fs.existsSync(db)) {
    const starter = path.join(ROOT, 'prisma', 'dev.db');
    if (!fs.existsSync(starter)) throw new Error('No starter database found. Run "npm run setup" first.');
    fs.copyFileSync(starter, db);
  }
  const secretFile = path.join(dir, 'session-secret');
  if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return { db, secret: fs.readFileSync(secretFile, 'utf8').trim() };
}

function startServer({ db, secret }) {
  return new Promise((resolve, reject) => {
    server = utilityProcess.fork(path.join(__dirname, 'server.js'), [], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: `file:${db}`, SESSION_SECRET: secret },
      stdio: 'inherit',
    });
    const timer = setTimeout(() => reject(new Error('The app server took too long to start.')), 60000);
    server.on('message', (m) => {
      clearTimeout(timer);
      if (m && m.port) resolve(m.port);
      else reject(new Error((m && m.error) || 'The app server failed to start.'));
    });
    server.on('exit', (code) => { if (code) reject(new Error(`The app server stopped (code ${code}).`)); });
  });
}

async function launch() {
  if (!fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
    dialog.showErrorBox('Salon Studio is not built yet', 'Start it with "npm run desktop", which builds the app before opening it.');
    return app.quit();
  }
  try {
    const port = await startServer(prepareData());
    win = new BrowserWindow({
      width: 1440, height: 920, minWidth: 1024, minHeight: 680,
      title: 'Salon Studio', backgroundColor: '#f7f5f8', show: false,
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
    });
    const origin = `http://127.0.0.1:${port}`;
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (!url.startsWith(origin)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { win = null; });
    await win.loadURL(`${origin}/login`);
  } catch (err) {
    dialog.showErrorBox('Salon Studio could not start', String(err && err.message ? err.message : err));
    app.quit();
  }
}

app.whenReady().then(launch);
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { if (server) server.kill(); });
