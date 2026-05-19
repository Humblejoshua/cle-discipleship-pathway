const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

const JWT_SECRET = process.env.JWT_SECRET || 'cle-church-secret-key-2026';

function createApp() {
  const routes = [];
  const middlewares = [];

  const app = {
    use: (fn) => { middlewares.push(fn); return app; },
    get: (pattern, ...handlers) => { routes.push({ method: 'GET', pattern, handlers }); return app; },
    post: (pattern, ...handlers) => { routes.push({ method: 'POST', pattern, handlers }); return app; },
    put: (pattern, ...handlers) => { routes.push({ method: 'PUT', pattern, handlers }); return app; },
    delete: (pattern, ...handlers) => { routes.push({ method: 'DELETE', pattern, handlers }); return app; },
    listen: (port, cb) => {
      const server = http.createServer((req, res) => {
        handleRequest(req, res, routes, middlewares);
      });
      server.listen(port, cb);
      return server;
    },
  };
  return app;
}

function parseUrl(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts;
}

function matchRoute(method, pathname, route) {
  if (route.method !== method) return null;
  const routeParts = route.pattern.split('/').filter(Boolean);
  const urlParts = pathname.split('/').filter(Boolean);

  if (routeParts.length > 0 && routeParts[routeParts.length - 1] === '*') {
    if (routeParts.length - 1 > urlParts.length) return null;
    const params = {};
    for (let i = 0; i < routeParts.length - 1; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = urlParts[i];
      } else if (routeParts[i] !== urlParts[i]) {
        return null;
      }
    }
    params['*'] = urlParts.slice(routeParts.length - 1).join('/');
    return params;
  }

  if (routeParts.length !== urlParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = urlParts[i];
    } else if (routeParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

function parseBody(req) {
  return new Promise((resolve) => {
    const ct = req.headers['content-type'] || '';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(buf.toString())); } catch { resolve({}); }
      } else if (ct.includes('multipart/form-data')) {
        resolve(parseMultipart(buf, ct));
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const sp = new URLSearchParams(buf.toString());
        const obj = {};
        for (const [k, v] of sp) obj[k] = v;
        resolve(obj);
      } else {
        resolve(buf);
      }
    });
    req.on('error', () => resolve({}));
  });
}

function parseMultipart(buf, contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return {};
  const boundary = match[1] || match[2];
  const parts = buf.toString('binary').split(`--${boundary}`);
  const fields = {};
  const files = {};

  for (const part of parts) {
    if (part.includes('\r\n\r\n')) {
      const [headerSection, bodySection] = part.split('\r\n\r\n');
      const headerMatch = headerSection.match(/name="([^"]+)"/);
      if (!headerMatch) continue;
      const name = headerMatch[1];
      const filenameMatch = headerSection.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const filename = filenameMatch[1];
        const bodyBuf = Buffer.from(bodySection.split('\r\n')[0], 'binary');
        files[name] = { filename, data: bodyBuf };
      } else {
        const value = bodySection.split('\r\n')[0];
        fields[name] = value;
      }
    }
  }
  return { ...fields, _files: files };
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function sendFile(res, filePath, downloadName) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'File not found' });
    return;
  }
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${downloadName}"`,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': mimes[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
}

function jwtSign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 86400 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function jwtVerify(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === check;
}

function authenticateToken(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) { sendJson(res, 401, { error: 'Authentication required' }); return null; }
  const decoded = jwtVerify(token);
  if (!decoded) { sendJson(res, 403, { error: 'Invalid or expired token' }); return null; }
  req.user = decoded;
  return decoded;
}

function requireAdmin(req, res) {
  if (req.user.role !== 'admin') { sendJson(res, 403, { error: 'Admin access required' }); return false; }
  return true;
}

async function handleRequest(req, res, routes, middlewares) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method.toUpperCase();

  res.sendJson = (status, data) => sendJson(res, status, data);
  res.sendFile = (filePath, name) => sendFile(res, filePath, name);
  res.serveStatic = (filePath) => serveStatic(res, filePath);

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  for (const mw of middlewares) {
    const result = mw(req, res);
    if (result === false) return;
  }

  for (const route of routes) {
    const params = matchRoute(method, pathname, route);
    if (params) {
      req.params = params;
      req.query = parsed.query;
      req.body = await parseBody(req);

      for (const handler of route.handlers) {
        await handler(req, res);
        if (res.writableEnded) return;
      }
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found' });
}

module.exports = { createApp, sendJson, sendFile, serveStatic, jwtSign, jwtVerify, hashPassword, verifyPassword, authenticateToken, requireAdmin };
