#!/usr/bin/env node
/**
 * Loxone Miniserver — Swagger UI Server
 * ─────────────────────────────────────
 * Standalone, zero-dependency Node.js server:
 *   • Serves interactive Swagger UI at /
 *   • Serves OpenAPI spec at /spec.yaml
 *   • Proxies /lox/* → Miniserver (CORS-free Try-It-Out, server-side auth)
 *
 * Usage:
 *   node server.js --host 192.168.1.77 --user admin --pass secret
 *   LOX_HOST=192.168.1.77 LOX_USER=admin LOX_PASS=secret node server.js
 *
 * Config (env var / CLI flag):
 *   PORT          / --port           UI port              (default 8077)
 *   LOX_HOST      / --host           Miniserver IP/host   (default 192.168.1.77)
 *   LOX_PORT      / --lox-port       Miniserver port      (default 80)
 *   LOX_TLS       / --tls            Use HTTPS to MS      (default off)
 *   LOX_TLS_INSECURE / --insecure    Skip cert verify     (default off)
 *   LOX_USER      / --user           Basic auth user      (optional)
 *   LOX_PASS      / --pass           Basic auth password  (optional)
 */

'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}
function flag(name) {
  return process.argv.includes(name);
}

const CFG = {
  port:        parseInt(arg('--port')     || process.env.PORT          || '8077', 10),
  loxHost:     arg('--host')              || process.env.LOX_HOST      || '192.168.1.77',
  loxPort:     parseInt(arg('--lox-port') || process.env.LOX_PORT      || '80', 10),
  loxTls:      flag('--tls')              || process.env.LOX_TLS       === '1',
  tlsInsecure: flag('--insecure')         || process.env.LOX_TLS_INSECURE === '1',
  loxUser:     arg('--user')              || process.env.LOX_USER      || '',
  loxPass:     arg('--pass')              || process.env.LOX_PASS      || '',
};

const AUTH_HEADER = CFG.loxUser
  ? 'Basic ' + Buffer.from(`${CFG.loxUser}:${CFG.loxPass}`).toString('base64')
  : null;

// ─── Static assets ───────────────────────────────────────────────────────────

const DIR = __dirname;
let HTML, SPEC;
try {
  HTML = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  SPEC = fs.readFileSync(path.join(DIR, 'loxone-miniserver-api.yaml'), 'utf8');
} catch (e) {
  console.error('✗ Missing file:', e.message);
  console.error('  server.js requires index.html and loxone-miniserver-api.yaml in the same directory.');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function corsPreflight(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

// ─── Proxy /lox/* → Miniserver ───────────────────────────────────────────────

function proxy(req, res) {
  const targetPath = req.url.replace(/^\/lox/, '') || '/';

  const opts = {
    hostname: CFG.loxHost,
    port: CFG.loxPort,
    path: targetPath,
    method: req.method,
    timeout: 15000,
    headers: {
      'Host': `${CFG.loxHost}:${CFG.loxPort}`,
      'Accept': req.headers['accept'] || '*/*',
      'User-Agent': 'loxone-swagger-proxy/1.0',
    },
  };

  if (AUTH_HEADER) opts.headers['Authorization'] = AUTH_HEADER;
  // Allow per-request auth override from the browser
  if (req.headers['authorization']) opts.headers['Authorization'] = req.headers['authorization'];

  if (CFG.loxTls && CFG.tlsInsecure) opts.rejectUnauthorized = false;

  const lib = CFG.loxTls ? https : http;

  const upstream = lib.request(opts, (up) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': up.headers['content-type'] || 'application/json',
    };
    if (up.headers['content-length']) headers['Content-Length'] = up.headers['content-length'];
    res.writeHead(up.statusCode || 502, headers);
    up.pipe(res);
  });

  upstream.on('timeout', () => {
    upstream.destroy();
    send(res, 504, JSON.stringify({ error: 'Miniserver timeout', target: `${CFG.loxHost}:${CFG.loxPort}` }), 'application/json');
  });

  upstream.on('error', (err) => {
    send(res, 502, JSON.stringify({
      error: 'Cannot reach Miniserver',
      detail: err.message,
      target: `${CFG.loxTls ? 'https' : 'http'}://${CFG.loxHost}:${CFG.loxPort}`,
      hint: 'Check LOX_HOST / LOX_PORT / LOX_TLS configuration',
    }, null, 2), 'application/json');
  });

  req.pipe(upstream);
}

// ─── Router ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'OPTIONS') return corsPreflight(res);

  if (url === '/' || url === '/index.html')
    return send(res, 200, HTML, 'text/html; charset=utf-8');

  if (url === '/spec.yaml')
    return send(res, 200, SPEC, 'application/yaml; charset=utf-8');

  if (url === '/health')
    return send(res, 200, JSON.stringify({
      status: 'ok',
      proxy_target: `${CFG.loxTls ? 'https' : 'http'}://${CFG.loxHost}:${CFG.loxPort}`,
      auth: AUTH_HEADER ? `basic (${CFG.loxUser})` : 'none',
      uptime_s: Math.round(process.uptime()),
    }, null, 2), 'application/json');

  if (req.url.startsWith('/lox/') || req.url === '/lox')
    return proxy(req, res);

  send(res, 404, JSON.stringify({ error: 'Not found', routes: ['/', '/spec.yaml', '/health', '/lox/*'] }), 'application/json');
});

server.listen(CFG.port, () => {
  const scheme = CFG.loxTls ? 'https' : 'http';
  console.log('┌──────────────────────────────────────────────────────┐');
  console.log('│  Loxone Miniserver — Swagger UI Server               │');
  console.log('├──────────────────────────────────────────────────────┤');
  console.log(`│  UI:      http://localhost:${String(CFG.port).padEnd(25)}│`);
  console.log(`│  Spec:    http://localhost:${CFG.port}/spec.yaml`.padEnd(55) + '│');
  console.log(`│  Proxy:   /lox/* → ${scheme}://${CFG.loxHost}:${CFG.loxPort}`.padEnd(55) + '│');
  console.log(`│  Auth:    ${(AUTH_HEADER ? 'Basic (' + CFG.loxUser + ')' : 'none — pass via Swagger Authorize')}`.padEnd(55) + '│');
  console.log('└──────────────────────────────────────────────────────┘');
});

process.on('SIGINT',  () => { console.log('\n✓ bye'); process.exit(0); });
process.on('SIGTERM', () => process.exit(0));
