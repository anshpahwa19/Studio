const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Ensure database URL is pointing to persistent user data if provided
const port = process.env.PORT || 3456;
const appDir = path.join(__dirname, '..');

const next = require('next');
const app = next({ dev: false, dir: appDir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  server.listen(port, '127.0.0.1', (err) => {
    if (err) throw err;
    console.log(`> Shruti Pahwa Luxury Salon Offline Server running at http://127.0.0.1:${port}`);
  });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
