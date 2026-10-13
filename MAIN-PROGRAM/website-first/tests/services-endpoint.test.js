const test = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../src/server');
const http = require('node:http');

function request(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({host:'127.0.0.1', port, path, method:'GET'}, res => {
      let body='';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({status:res.statusCode, body}));
    });
    req.on('error', reject);
    req.end();
  });
}

test('service status endpoint is available at canonical and compatibility paths', async () => {
  const srv = http.createServer(server).listen(0);
  try {
    const port = srv.address().port;
    const canonical = await request(port, '/api/services');
    const compatibility = await request(port, '/api/services/status');
    assert.equal(canonical.status, 200);
    assert.equal(compatibility.status, 200);
    const a = JSON.parse(canonical.body);
    const b = JSON.parse(compatibility.body);
    assert.ok(Array.isArray(a.services));
    assert.deepEqual(b.services, a.services);
  } finally {
    await new Promise(resolve => srv.close(resolve));
  }
});
