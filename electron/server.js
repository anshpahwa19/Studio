// Runs inside an Electron utility process. Starts the built app on a free local port.
const http = require('http');
const path = require('path');
const next = require('next');

const app = next({ dev: false, dir: path.join(__dirname, '..') });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const srv = http.createServer((req, res) => handle(req, res));
    srv.listen(0, '127.0.0.1', () => process.parentPort.postMessage({ port: srv.address().port }));
  })
  .catch((err) => {
    process.parentPort.postMessage({ error: err.message });
    process.exit(1);
  });
