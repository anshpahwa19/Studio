const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = 3456;

// 1. Prepare persistent writable SQLite database in userData
function setupDatabase() {
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const targetDbPath = path.join(userDataDir, 'dev.db');
  const sourceDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

  if (!fs.existsSync(targetDbPath) && fs.existsSync(sourceDbPath)) {
    console.log(`Copying initial database from ${sourceDbPath} to ${targetDbPath}`);
    fs.copyFileSync(sourceDbPath, targetDbPath);
  }

  return targetDbPath;
}

// 2. Poll server until ready
function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          // Any HTTP status indicates server is responsive
          resolve(true);
        })
        .on('error', () => {
          if (Date.now() - start > timeout) {
            reject(new Error('Server start timed out'));
          } else {
            setTimeout(check, 250);
          }
        });
    };
    check();
  });
}

// 3. Start embedded local Next.js server
function startServer(dbPath) {
  const serverScript = path.join(__dirname, 'server.js');
  const appDir = path.join(__dirname, '..');

  const env = Object.assign({}, process.env, {
    PORT: PORT.toString(),
    NODE_ENV: 'production',
    DATABASE_URL: `file:${dbPath}`,
    NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
    NEXTAUTH_SECRET: 'salon-management-secret-change-in-production-2024',
  });

  serverProcess = fork(serverScript, [], {
    env,
    cwd: appDir,
    silent: false,
  });

  serverProcess.on('error', (err) => {
    console.error('Local server process error:', err);
  });

  serverProcess.on('exit', (code, sig) => {
    console.log(`Local server process exited with code ${code} and signal ${sig}`);
  });
}

// 4. Create Desktop Application Window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    title: 'Shruti Pahwa Luxury Salon and Academy',
    backgroundColor: '#FAFAF9',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    const dbPath = setupDatabase();
    console.log('Database path:', dbPath);

    startServer(dbPath);

    console.log('Waiting for local offline server...');
    await waitForServer(`http://127.0.0.1:${PORT}/login`);
    console.log('Server is ready! Opening desktop window...');

    createWindow();
  } catch (err) {
    console.error('Initialization error:', err);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to launch Shruti Pahwa Luxury Salon offline server: ${err.message}`
    );
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {}
    serverProcess = null;
  }
}

app.on('before-quit', cleanup);
app.on('will-quit', cleanup);
app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
