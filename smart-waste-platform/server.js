const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./database');

// Ensure database is initialized
db.initDatabase();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Cap at 10MB for base64 photo upload safety
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not an /api route
      if (!pathname.startsWith('/api')) {
        const indexHtml = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexHtml, (err2, content) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API Endpoints ---
  try {
    // 1. Categories
    if (method === 'GET' && pathname === '/api/categories') {
      const categories = db.getCategories();
      return sendJson(res, 200, { success: true, categories });
    }

    // 2. Disposal Guide Item Search
    if (method === 'GET' && pathname === '/api/guide') {
      const q = parsedUrl.query.q || '';
      const items = db.searchDisposalGuide(q);
      return sendJson(res, 200, { success: true, items });
    }

    // 3. Drivers List
    if (method === 'GET' && pathname === '/api/drivers') {
      const drivers = db.getDrivers();
      return sendJson(res, 200, { success: true, drivers });
    }

    // 4. Platform Statistics
    if (method === 'GET' && pathname === '/api/stats') {
      const stats = db.getPlatformStatistics();
      return sendJson(res, 200, { success: true, stats });
    }

    // 5. Get All Requests (with filter query params)
    if (method === 'GET' && pathname === '/api/requests') {
      const filters = {
        status: parsedUrl.query.status,
        category: parsedUrl.query.category,
        search: parsedUrl.query.search,
        dateFrom: parsedUrl.query.dateFrom,
        dateTo: parsedUrl.query.dateTo
      };
      const requests = db.getAllRequests(filters);
      return sendJson(res, 200, { success: true, count: requests.length, requests });
    }

    // 6. Get Single Request by Tracking ID or ID
    const singleMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)$/);
    if (method === 'GET' && singleMatch) {
      const reqId = singleMatch[1];
      const request = db.getRequestByTrackingId(reqId);
      if (!request) {
        return sendJson(res, 404, { success: false, error: 'Request not found' });
      }
      return sendJson(res, 200, { success: true, request });
    }

    // 7. Submit New Pickup Request
    if (method === 'POST' && pathname === '/api/requests') {
      const body = await parseRequestBody(req);

      // Validation
      if (!body.category_id) {
        return sendJson(res, 400, { success: false, error: 'Waste category is required' });
      }
      if (!body.address || body.address.trim() === '') {
        return sendJson(res, 400, { success: false, error: 'Pickup address is required' });
      }
      if (!body.pickup_date) {
        return sendJson(res, 400, { success: false, error: 'Pickup date is required' });
      }
      if (!body.pickup_time_slot) {
        return sendJson(res, 400, { success: false, error: 'Pickup time slot is required' });
      }

      const newRequest = db.createRequest(body);
      return sendJson(res, 201, {
        success: true,
        message: 'Pickup request scheduled successfully',
        request: newRequest
      });
    }

    // 8. Update Request Status / Assign Driver
    const statusMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9_-]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const reqId = statusMatch[1];
      const body = await parseRequestBody(req);
      const updated = db.updateRequestStatus(reqId, body);
      if (!updated) {
        return sendJson(res, 404, { success: false, error: 'Request not found' });
      }
      return sendJson(res, 200, { success: true, message: 'Status updated', request: updated });
    }

    // 9. Re-seed demo data
    if (method === 'POST' && pathname === '/api/seed') {
      // Recreate database
      fs.unlinkSync(path.join(__dirname, 'waste_platform.db'));
      db.initDatabase();
      return sendJson(res, 200, { success: true, message: 'Database reset and re-seeded with demo data' });
    }

    // Static files
    return serveStatic(req, res, pathname);

  } catch (error) {
    console.error('Server error handling route:', error);
    return sendJson(res, 500, { success: false, error: error.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌿 Smart Waste & Recycling Platform running at:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

process.on('SIGTERM', () => {
  server.close(() => console.log('Server shut down cleanly.'));
});
