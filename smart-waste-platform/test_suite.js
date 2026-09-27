const http = require('node:http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting EcoCollect API and Integration Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Static homepage
    const home = await request('GET', '/');
    assert(home.status === 200 && typeof home.data === 'string' && home.data.includes('EcoCollect'), 'Homepage static HTML served (200 OK)');

    // 2. Categories
    const catRes = await request('GET', '/api/categories');
    assert(catRes.status === 200 && catRes.data.success && catRes.data.categories.length === 8, 'Fetch categories returns 8 waste categories');

    // 3. Platform Stats
    const statsRes = await request('GET', '/api/stats');
    assert(statsRes.status === 200 && statsRes.data.stats.totalRequests >= 7, 'Platform stats returned with valid total requests');
    assert(statsRes.data.stats.totalDivertedKg > 0, `Stats show positive diverted weight: ${statsRes.data.stats.totalDivertedKg} kg`);

    // 4. Drivers
    const driverRes = await request('GET', '/api/drivers');
    assert(driverRes.status === 200 && driverRes.data.drivers.length === 4, 'Fetch collection fleet drivers returns 4 drivers');

    // 5. Disposal Guide Search
    const guideRes = await request('GET', '/api/guide?q=battery');
    assert(guideRes.status === 200 && guideRes.data.items.length > 0, 'Disposal guide search for "battery" returns results');

    // 6. Submit New Pickup Request
    const newReqPayload = {
      category_id: 'plastic',
      item_description: '6 bags of clean HDPE milk jugs and PET seltzer bottles',
      estimated_weight_kg: 18.5,
      bag_count: 6,
      address: '888 Sustainability Way',
      apartment: 'Suite 200',
      city: 'Springfield',
      zip_code: '97477',
      user_name: 'Jordan Rivera',
      user_phone: '+1 (555) 432-9090',
      user_email: 'jordan.rivera@example.com',
      pickup_date: '2026-10-01',
      pickup_time_slot: 'Morning (08:00 AM - 12:00 PM)',
      special_instructions: 'Place on side driveway under covered canopy'
    };

    const createRes = await request('POST', '/api/requests', newReqPayload);
    assert(createRes.status === 201 && createRes.data.success && createRes.data.request.tracking_id.startsWith('ECO-'), 'Create new pickup request returned 201 and ECO- tracking ID');
    const createdTrackingId = createRes.data.request.tracking_id;

    // 7. Track Request by Code
    const trackRes = await request('GET', `/api/requests/${createdTrackingId}`);
    assert(trackRes.status === 200 && trackRes.data.request.tracking_id === createdTrackingId, `Track request by ID verified for ${createdTrackingId}`);
    assert(trackRes.data.request.status === 'pending', 'Initial request status is "pending"');
    assert(trackRes.data.request.history.length >= 1, 'Initial status history record exists');

    // 8. Dispatcher Update: Assign Driver and Schedule
    const updateRes1 = await request('PATCH', `/api/requests/${createdTrackingId}/status`, {
      status: 'scheduled',
      assigned_driver_id: 1,
      admin_notes: 'Approved for morning route.'
    });
    assert(updateRes1.status === 200 && updateRes1.data.request.status === 'scheduled' && updateRes1.data.request.assigned_driver_id === 1, 'Admin scheduled request and assigned driver');

    // 9. Dispatcher Update: Mark In Transit
    const updateRes2 = await request('PATCH', `/api/requests/${createdTrackingId}/status`, {
      status: 'in_progress',
      admin_notes: 'Driver Marcus Vance en route.'
    });
    assert(updateRes2.status === 200 && updateRes2.data.request.status === 'in_progress', 'Request status transitioned to "in_progress"');

    // 10. Dispatcher Update: Mark Completed & Recycled
    const updateRes3 = await request('PATCH', `/api/requests/${createdTrackingId}/status`, {
      status: 'completed',
      admin_notes: '18.5 kg recycled at Regional Polymer Processing Facility.'
    });
    assert(updateRes3.status === 200 && updateRes3.data.request.status === 'completed', 'Request status transitioned to "completed"');

    // 11. Verify History Logs Accumulated
    const trackAfter = await request('GET', `/api/requests/${createdTrackingId}`);
    assert(trackAfter.data.request.history.length >= 4, `Full audit trail captured: ${trackAfter.data.request.history.length} status events`);

    // 12. Filter Requests by Status
    const completedList = await request('GET', '/api/requests?status=completed');
    assert(completedList.status === 200 && completedList.data.requests.every(r => r.status === 'completed'), 'Filter by status=completed returns only completed records');

    // 13. Filter Requests by Category
    const plasticList = await request('GET', '/api/requests?category=plastic');
    assert(plasticList.status === 200 && plasticList.data.requests.some(r => r.tracking_id === createdTrackingId), 'Filter by category=plastic includes our created request');

    // 14. Search Requests
    const searchRes = await request('GET', '/api/requests?search=Jordan');
    assert(searchRes.status === 200 && searchRes.data.requests.some(r => r.user_name.includes('Jordan')), 'Search for "Jordan" locates the request');

    console.log(`\n========================================`);
    console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
