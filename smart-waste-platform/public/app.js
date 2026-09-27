/**
 * EcoCollect - Smart Waste Collection & Recycling Platform
 * Client Application Logic
 */

// Application State
const state = {
  categories: [],
  drivers: [],
  stats: null,
  allRequests: [],
  activeTab: 'request',
  selectedCategoryId: null,
  uploadedPhotoBase64: '',
  currentCreatedTrackingId: null,
  adminFilters: {
    status: 'all',
    category: 'all',
    search: ''
  },
  modalActiveRequestId: null
};

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupDatePickerDefaults();
  await loadCategories();
  await loadDrivers();
  await loadStats();
  await loadGuideItems();
  renderHistoryView();

  // If there is a tracking parameter in URL, open track tab
  const params = new URLSearchParams(window.location.search);
  const trackCode = params.get('track');
  if (trackCode) {
    trackSpecificRequest(trackCode);
  }
});

function setupDatePickerDefaults() {
  const dateInput = document.getElementById('pickup_date');
  if (!dateInput) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');

  const defaultDateStr = `${yyyy}-${mm}-${dd}`;
  dateInput.value = defaultDateStr;
  dateInput.min = defaultDateStr;
}

// -----------------------------------------------------------------------------
// NAVIGATION & TABS
// -----------------------------------------------------------------------------
function switchTab(tabId) {
  state.activeTab = tabId;

  // Hide all views
  const views = ['request', 'track', 'guide', 'history', 'admin'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');

    const navBtn = document.getElementById(`nav-${v}`);
    if (navBtn) {
      navBtn.classList.remove('bg-white', 'text-emerald-700', 'shadow-sm');
      navBtn.classList.add('text-slate-700');
    }
  });

  // Show target view
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.remove('hidden');

  const targetNavBtn = document.getElementById(`nav-${tabId}`);
  if (targetNavBtn) {
    targetNavBtn.classList.add('bg-white', 'text-emerald-700', 'shadow-sm');
    targetNavBtn.classList.remove('text-slate-700');
  }

  // Update admin toggle button styling
  const adminBtn = document.getElementById('adminSwitchBtn');
  const adminLabel = document.getElementById('adminSwitchLabel');
  if (tabId === 'admin') {
    adminBtn.classList.remove('bg-slate-900');
    adminBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    adminLabel.textContent = 'Exit Admin Portal';
    fetchAdminData();
  } else {
    adminBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
    adminBtn.classList.add('bg-slate-900');
    adminLabel.textContent = 'Admin Dashboard';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleAdminView() {
  if (state.activeTab === 'admin') {
    switchTab('request');
  } else {
    switchTab('admin');
  }
}

// -----------------------------------------------------------------------------
// DATA FETCHING
// -----------------------------------------------------------------------------
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      state.categories = data.categories;
      renderCategoryCards();
      renderCategorySelectOptions();
      renderEncyclopedia();
      // Select first category by default
      if (state.categories.length > 0) {
        selectCategory(state.categories[0].id);
      }
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadDrivers() {
  try {
    const res = await fetch('/api/drivers');
    const data = await res.json();
    if (data.success) {
      state.drivers = data.drivers;
      renderAdminFleetList();
    }
  } catch (err) {
    console.error('Failed to load drivers:', err);
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      state.stats = data.stats;
      updateHeaderTicker();
      updateAdminKpis();
      updateAdminCategoryBars();
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function updateHeaderTicker() {
  if (!state.stats) return;
  document.getElementById('tickerWeight').textContent = `${state.stats.totalDivertedKg.toLocaleString()} kg`;
  document.getElementById('tickerCo2').textContent = `${state.stats.totalCo2SavedKg.toLocaleString()} kg`;
  document.getElementById('tickerTrees').textContent = `${state.stats.treesPlantedEquivalent} 🌳`;
}

// -----------------------------------------------------------------------------
// REQUEST FORM: CATEGORY SELECTION & IMPACT CALCULATOR
// -----------------------------------------------------------------------------
function renderCategoryCards() {
  const container = document.getElementById('categoryCardsGrid');
  if (!container) return;

  container.innerHTML = state.categories.map(cat => {
    return `
      <div onclick="selectCategory('${cat.id}')" id="cat-card-${cat.id}"
        class="category-card cursor-pointer p-3.5 rounded-2xl border-2 border-slate-200 bg-white hover:border-emerald-300 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-2">
          <span class="text-2xl">${cat.icon}</span>
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
            ${cat.co2_factor_per_kg}x CO₂
          </span>
        </div>
        <div>
          <div class="font-bold text-xs text-slate-900 leading-tight">${cat.name}</div>
          <div class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${cat.tagline}</div>
        </div>
      </div>
    `;
  }).join('');
}

function selectCategory(catId) {
  state.selectedCategoryId = catId;
  document.getElementById('selectedCategoryId').value = catId;

  // Highlight card
  state.categories.forEach(c => {
    const el = document.getElementById(`cat-card-${c.id}`);
    if (el) {
      if (c.id === catId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    }
  });

  // Show category detail helper box
  const cat = state.categories.find(c => c.id === catId);
  if (cat) {
    const detailBox = document.getElementById('categoryDetailBox');
    detailBox.classList.remove('hidden');
    document.getElementById('catDetailName').textContent = `${cat.icon} ${cat.name}`;
    document.getElementById('catDetailGuide').textContent = cat.disposal_guide;
    document.getElementById('catCo2Badge').textContent = `${cat.co2_factor_per_kg} kg CO₂ / kg diverted`;
  }

  recalculateImpact();
}

function updateWeightDisplay(val) {
  document.getElementById('weightDisplay').textContent = `${Number(val).toFixed(1)} kg`;
  recalculateImpact();
}

function recalculateImpact() {
  const weight = Number(document.getElementById('weightSlider')?.value || 5);
  const cat = state.categories.find(c => c.id === state.selectedCategoryId) || state.categories[0];
  const factor = cat ? cat.co2_factor_per_kg : 1.0;

  const co2Avoided = (weight * factor).toFixed(2);
  const landfillKg = weight.toFixed(2);
  const ecoPoints = Math.round(weight * 10);

  document.getElementById('calcCo2Saved').textContent = `${co2Avoided} kg`;
  document.getElementById('calcLandfillKg').textContent = `${landfillKg} kg`;
  document.getElementById('calcEcoPoints').textContent = `${ecoPoints} pts`;
}

// Location presets
function applyPresetAddress(type) {
  if (type === 'downtown') {
    document.getElementById('address').value = '410 Metro Center Plaza';
    document.getElementById('apartment').value = 'Apt 8C';
    document.getElementById('city').value = 'Springfield';
    document.getElementById('zip_code').value = '97477';
    document.getElementById('latitude').value = '44.0532';
    document.getElementById('longitude').value = '-123.0189';
    showToast('Applied Downtown Metro location preset');
  } else if (type === 'techpark') {
    document.getElementById('address').value = '100 Silicon Way';
    document.getElementById('apartment').value = 'Innovation Dock 3';
    document.getElementById('city').value = 'Springfield';
    document.getElementById('zip_code').value = '97478';
    document.getElementById('latitude').value = '44.0610';
    document.getElementById('longitude').value = '-123.0040';
    showToast('Applied Tech Valley Campus preset');
  } else if (type === 'suburbs') {
    document.getElementById('address').value = '215 Oak Valley Road';
    document.getElementById('apartment').value = '';
    document.getElementById('city').value = 'Springfield';
    document.getElementById('zip_code').value = '97477';
    document.getElementById('latitude').value = '44.0480';
    document.getElementById('longitude').value = '-123.0310';
    showToast('Applied Green Hills Suburb preset');
  }
}

// Photo upload handler
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedPhotoBase64 = e.target.result;
    document.getElementById('photoPreviewImg').src = state.uploadedPhotoBase64;
    document.getElementById('photoPreviewContainer').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function clearPhotoPreview() {
  state.uploadedPhotoBase64 = '';
  document.getElementById('photoInput').value = '';
  document.getElementById('photoPreviewContainer').classList.add('hidden');
}

// Form Submission
async function handleSubmitRequest(event) {
  event.preventDefault();

  if (!state.selectedCategoryId) {
    showToast('Please select a waste category', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳ Scheduling Pickup...</span>';

  const payload = {
    category_id: state.selectedCategoryId,
    item_description: document.getElementById('item_description').value,
    estimated_weight_kg: Number(document.getElementById('weightSlider').value),
    bag_count: Number(document.getElementById('bag_count').value),
    address: document.getElementById('address').value,
    apartment: document.getElementById('apartment').value,
    city: document.getElementById('city').value,
    zip_code: document.getElementById('zip_code').value,
    user_name: document.getElementById('user_name').value,
    user_phone: document.getElementById('user_phone').value,
    user_email: document.getElementById('user_email').value,
    pickup_date: document.getElementById('pickup_date').value,
    pickup_time_slot: document.getElementById('pickup_time_slot').value,
    special_instructions: document.getElementById('special_instructions').value,
    latitude: Number(document.getElementById('latitude').value || 44.0521),
    longitude: Number(document.getElementById('longitude').value || -123.0165),
    photo_url: state.uploadedPhotoBase64 || ''
  };

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success && data.request) {
      state.currentCreatedTrackingId = data.request.tracking_id;
      saveToCitizenHistory(data.request);

      // Show confirmation
      document.getElementById('requestFormWrapper').classList.add('hidden');
      document.getElementById('createdTrackingId').textContent = data.request.tracking_id;
      document.getElementById('requestSuccessCard').classList.remove('hidden');

      showToast(`Pickup request ${data.request.tracking_id} scheduled!`, 'success');
      loadStats(); // refresh stats
    } else {
      showToast(data.error || 'Failed to submit request', 'error');
    }
  } catch (err) {
    console.error('Request error:', err);
    showToast('Network error submitting request', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🚀 Submit Pickup Request</span>';
  }
}

function resetRequestForm() {
  document.getElementById('pickupForm').reset();
  setupDatePickerDefaults();
  clearPhotoPreview();
  if (state.categories.length > 0) {
    selectCategory(state.categories[0].id);
  }
  document.getElementById('requestFormWrapper').classList.remove('hidden');
  document.getElementById('requestSuccessCard').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyTrackingId() {
  if (!state.currentCreatedTrackingId) return;
  navigator.clipboard.writeText(state.currentCreatedTrackingId);
  showToast(`Copied ${state.currentCreatedTrackingId} to clipboard!`);
}

// -----------------------------------------------------------------------------
// CITIZEN HISTORY & ECO-CERTIFICATE
// -----------------------------------------------------------------------------
function saveToCitizenHistory(request) {
  let list = getCitizenHistory();
  // prepend
  list = [request, ...list.filter(r => r.tracking_id !== request.tracking_id)];
  localStorage.setItem('ecocollect_user_history', JSON.stringify(list));
  renderHistoryView();
}

function getCitizenHistory() {
  try {
    const str = localStorage.getItem('ecocollect_user_history');
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return [];
  }
}

function renderHistoryView() {
  const list = getCitizenHistory();
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  // Calculate user totals
  let userKg = 0;
  let userCo2 = 0;
  list.forEach(r => {
    userKg += Number(r.estimated_weight_kg || 0);
    const factor = r.co2_factor_per_kg || 1.2;
    userCo2 += (Number(r.estimated_weight_kg || 0) * factor);
  });

  document.getElementById('userHistoryKg').textContent = `${userKg.toFixed(1)} kg`;
  document.getElementById('userHistoryCo2').textContent = `${userCo2.toFixed(1)} kg`;
  document.getElementById('userHistoryPoints').textContent = `${Math.round(userKg * 10)} pts`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="p-10 text-center">
        <div class="text-4xl mb-3">📦</div>
        <h3 class="text-base font-bold text-slate-800">No Pickup Requests Yet</h3>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          When you submit a recycling pickup, your request records, carbon diversion, and green certificates will be catalogued here.
        </p>
        <button onclick="switchTab('request')" class="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow">
          Book Your First Pickup
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="divide-y divide-slate-100">
      ${list.map(r => `
        <div class="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-100">
              ${r.category_icon || '♻️'}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-extrabold text-sm text-slate-900">${r.tracking_id}</span>
                ${getStatusBadgeHtml(r.status)}
              </div>
              <div class="text-xs text-slate-600 mt-0.5">
                ${r.category_name || 'Recyclables'} • ${r.estimated_weight_kg} kg • ${r.pickup_date} (${r.pickup_time_slot?.split(' ')[0] || 'Scheduled'})
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5 truncate max-w-md">
                📍 ${r.address}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="openCertificateModal('${r.tracking_id}')"
              class="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition">
              🏅 Eco-Certificate
            </button>
            <button onclick="trackSpecificRequest('${r.tracking_id}')"
              class="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition">
              Track Live →
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// -----------------------------------------------------------------------------
// TRACKING VIEW & STATUS TIMELINE
// -----------------------------------------------------------------------------
function handleSearchTracking(e) {
  e.preventDefault();
  const code = document.getElementById('trackInput').value.trim();
  if (!code) {
    showToast('Please enter a tracking code', 'error');
    return;
  }
  trackSpecificRequest(code);
}

async function trackSpecificRequest(trackingId) {
  switchTab('track');
  document.getElementById('trackInput').value = trackingId;

  const container = document.getElementById('trackingResultContainer');
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="p-8 text-center bg-white rounded-3xl border border-slate-200">
      <div class="animate-spin text-2xl inline-block mb-2">🔄</div>
      <div class="text-xs text-slate-500 font-medium">Fetching real-time collection details...</div>
    </div>
  `;

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}`);
    const data = await res.json();

    if (!data.success || !data.request) {
      container.innerHTML = `
        <div class="p-8 text-center bg-white rounded-3xl border border-rose-200">
          <div class="text-3xl mb-2">🔍</div>
          <h3 class="text-base font-bold text-slate-900">Request Not Found</h3>
          <p class="text-xs text-slate-500 mt-1">We couldn't locate any record with tracking ID "${trackingId}". Please verify the code.</p>
        </div>
      `;
      return;
    }

    renderTrackingDetails(data.request);
  } catch (err) {
    console.error('Tracking fetch error:', err);
    container.innerHTML = `
      <div class="p-6 text-center bg-white rounded-3xl border border-rose-200 text-rose-600 text-xs">
        Failed to fetch tracking details. Please try again.
      </div>
    `;
  }
}

function renderTrackingDetails(req) {
  const container = document.getElementById('trackingResultContainer');
  container.classList.remove('hidden');

  // 5 Status Steps:
  // 1: pending (Submitted)
  // 2: scheduled (Scheduled)
  // 3: assigned (Driver Assigned)
  // 4: in_progress (Out for Pickup)
  // 5: completed (Recycled & Processed)
  // cancelled is handled separately

  let stepLevel = 1;
  if (req.status === 'scheduled') stepLevel = 2;
  if (req.status === 'in_progress') stepLevel = 4;
  if (req.status === 'completed') stepLevel = 5;
  if (req.status === 'cancelled') stepLevel = 0;

  const co2Saved = (req.estimated_weight_kg * (req.co2_factor_per_kg || 1.2)).toFixed(1);

  container.innerHTML = `
    <!-- MAIN STATUS HERO CARD -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div class="text-xs text-slate-400 font-medium">Tracking Code</div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <span>${req.tracking_id}</span>
            <button onclick="navigator.clipboard.writeText('${req.tracking_id}'); showToast('Copied tracking ID!');"
              class="text-xs font-sans text-slate-500 hover:text-emerald-600 px-2 py-0.5 rounded border border-slate-200">
              📋
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3">
          ${getStatusBadgeHtml(req.status, 'lg')}
          <button onclick="openCertificateModal('${req.tracking_id}')"
            class="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition flex items-center gap-1.5">
            🏅 Eco-Receipt
          </button>
        </div>
      </div>

      <!-- VISUAL 5-STEP TIMELINE -->
      <div class="py-8">
        ${renderVisualStepper(req.status)}
      </div>

      <!-- DISPATCH & DRIVER INFO CARD (If assigned) -->
      ${req.driver_name ? `
        <div class="mt-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/30">
              🚛
            </div>
            <div>
              <div class="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Assigned Eco-Courier</div>
              <div class="font-extrabold text-sm text-white">${req.driver_name}</div>
              <div class="text-xs text-slate-300">${req.driver_vehicle} • Plate: <span class="font-mono text-emerald-300 font-bold">${req.driver_plate}</span></div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a href="tel:${req.driver_phone}" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1">
              📞 Call Courier
            </a>
          </div>
        </div>
      ` : (req.status !== 'completed' && req.status !== 'cancelled' ? `
        <div class="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base">⏳</span>
            <span>Driver assignment in progress. A certified collection courier will be dispatched before your scheduled slot.</span>
          </div>
        </div>
      ` : '')}
    </div>

    <!-- DETAILS GRID -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Pickup Summary -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Pickup Logistics Dossier</h3>

        <div class="space-y-3 text-xs">
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Waste Stream</span>
            <span class="font-bold text-slate-900 flex items-center gap-1">
              ${req.category_icon} ${req.category_name}
            </span>
          </div>

          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Item Breakdown</span>
            <span class="font-medium text-slate-800 text-right max-w-xs">${req.item_description}</span>
          </div>

          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Estimated Mass</span>
            <span class="font-bold font-mono text-emerald-700">${req.estimated_weight_kg} kg (${req.bag_count || 1} units)</span>
          </div>

          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Scheduled Date</span>
            <span class="font-semibold text-slate-900">${req.pickup_date}</span>
          </div>

          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Time Window</span>
            <span class="font-semibold text-slate-900">${req.pickup_time_slot}</span>
          </div>

          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Collection Address</span>
            <span class="font-medium text-slate-900 text-right">
              ${req.address}${req.apartment ? `, ${req.apartment}` : ''}<br>
              ${req.city}, ${req.zip_code}
            </span>
          </div>

          ${req.special_instructions ? `
            <div class="py-2 border-b border-slate-100">
              <span class="text-slate-500 block mb-1">Curbside Notes:</span>
              <span class="italic text-slate-700 bg-slate-50 p-2 rounded-lg block">${req.special_instructions}</span>
            </div>
          ` : ''}

          <div class="flex justify-between py-2">
            <span class="text-slate-500">CO₂ Avoided</span>
            <span class="font-bold font-mono text-teal-600">${co2Saved} kg CO₂</span>
          </div>
        </div>

        <!-- Citizen Cancellation Option -->
        ${(req.status === 'pending' || req.status === 'scheduled') ? `
          <div class="pt-2">
            <button onclick="handleCitizenCancel('${req.tracking_id}')"
              class="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition">
              Cancel Pickup Request
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Right: Audit Timeline Logs -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Official Activity & Audit Log</h3>
          
          <div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            ${(req.history || []).map((h, i) => `
              <div class="relative">
                <span class="absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full ${i === req.history.length - 1 ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300'}"></span>
                <div class="text-xs font-bold text-slate-800 uppercase tracking-wide">${h.status.replace('_', ' ')}</div>
                <div class="text-xs text-slate-600 mt-0.5">${h.note || 'Status updated'}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-1">${formatTimeAgo(h.created_at)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${req.photo_url ? `
          <div class="mt-6 pt-4 border-t border-slate-100">
            <div class="text-[11px] font-semibold text-slate-500 mb-2">Requester Attached Photo:</div>
            <img src="${req.photo_url}" alt="Waste item photo" class="w-full h-36 object-cover rounded-xl border border-slate-200">
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderVisualStepper(status) {
  const steps = [
    { key: 'pending', title: 'Submitted', desc: 'Queued in system' },
    { key: 'scheduled', title: 'Scheduled', desc: 'Approved for pickup' },
    { key: 'in_progress', title: 'Out for Pickup', desc: 'Courier on route' },
    { key: 'completed', title: 'Recycled', desc: 'Processed at facility' }
  ];

  if (status === 'cancelled') {
    return `
      <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center text-xs">
        <span class="font-bold text-sm">❌ This pickup request was cancelled.</span>
        <p class="mt-1 text-[11px] text-rose-600">If you still require waste disposal, please submit a new request.</p>
      </div>
    `;
  }

  const statusOrder = ['pending', 'scheduled', 'in_progress', 'completed'];
  const currentIndex = statusOrder.indexOf(status);

  return `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
      ${steps.map((s, idx) => {
        const isDone = idx <= currentIndex;
        const isCurrent = idx === currentIndex;

        return `
          <div class="flex flex-col items-center text-center">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all
              ${isDone ? (isCurrent ? 'bg-emerald-600 text-white radar-ping ring-4 ring-emerald-100' : 'bg-emerald-600 text-white') : 'bg-slate-100 text-slate-400 border border-slate-200'}">
              ${isDone ? '✓' : idx + 1}
            </div>
            <div class="text-xs font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}">${s.title}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">${s.desc}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function handleCitizenCancel(trackingId) {
  if (!confirm(`Are you sure you want to cancel pickup request ${trackingId}?`)) return;

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'cancelled',
        history_note: 'Cancelled by citizen via tracking portal'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Request ${trackingId} has been cancelled`, 'info');
      trackSpecificRequest(trackingId);
      loadStats();
    } else {
      showToast(data.error || 'Failed to cancel', 'error');
    }
  } catch (err) {
    showToast('Network error while cancelling', 'error');
  }
}

// -----------------------------------------------------------------------------
// DISPOSAL GUIDE ("Can I Recycle This?")
// -----------------------------------------------------------------------------
async function loadGuideItems(query = '') {
  try {
    const res = await fetch(`/api/guide?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.success) {
      renderGuideItems(data.items);
    }
  } catch (err) {
    console.error('Failed to load guide items:', err);
  }
}

function handleGuideSearch(val) {
  loadGuideItems(val);
}

function setGuideQuery(itemText) {
  document.getElementById('guideSearchInput').value = itemText;
  loadGuideItems(itemText);
}

function renderGuideItems(items) {
  const container = document.getElementById('guideItemsGrid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
        No specific item match found. Browse our full category guides below or contact municipal services.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">${item.category_icon}</span>
            <span class="font-bold text-sm text-slate-900">${item.name}</span>
          </div>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${item.is_recyclable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${item.is_recyclable ? '♻️ Recyclable' : '⚠️ Non-Curbside'}
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-1">${item.instructions}</p>
        ${item.safety_warning ? `
          <div class="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            ⚠️ <strong>Safety:</strong> ${item.safety_warning}
          </div>
        ` : ''}
      </div>

      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <span class="text-slate-400">Stream: <strong class="text-slate-700">${item.category_name}</strong></span>
        <button onclick="requestFromGuide('${item.category_id}')" class="text-emerald-600 hover:text-emerald-700 font-bold">
          Book Pickup →
        </button>
      </div>
    </div>
  `).join('');
}

function requestFromGuide(categoryId) {
  switchTab('request');
  selectCategory(categoryId);
  window.scrollTo({ top: 300, behavior: 'smooth' });
}

function renderEncyclopedia() {
  const container = document.getElementById('encyclopediaGrid');
  if (!container) return;

  container.innerHTML = state.categories.map(cat => `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div class="text-2xl mb-2">${cat.icon}</div>
        <h4 class="font-bold text-sm text-slate-900">${cat.name}</h4>
        <p class="text-[11px] text-slate-500 mt-1">${cat.description}</p>

        <div class="mt-3">
          <div class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Accepted:</div>
          <ul class="text-[11px] text-slate-600 space-y-0.5">
            ${(cat.accepted_items || []).slice(0, 3).map(i => `<li>• ${i}</li>`).join('')}
          </ul>
        </div>

        <div class="mt-3">
          <div class="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">Prohibited:</div>
          <ul class="text-[11px] text-slate-500 space-y-0.5">
            ${(cat.prohibited_items || []).slice(0, 2).map(i => `<li>✕ ${i}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100">
        <button onclick="requestFromGuide('${cat.id}')"
          class="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition">
          Schedule ${cat.name.split(' ')[0]}
        </button>
      </div>
    </div>
  `).join('');
}

// -----------------------------------------------------------------------------
// ADMIN / DISPATCHER DASHBOARD
// -----------------------------------------------------------------------------
async function fetchAdminData() {
  await loadStats();
  await loadDrivers();

  const url = new URL('/api/requests', window.location.origin);
  if (state.adminFilters.status !== 'all') url.searchParams.set('status', state.adminFilters.status);
  if (state.adminFilters.category !== 'all') url.searchParams.set('category', state.adminFilters.category);
  if (state.adminFilters.search.trim()) url.searchParams.set('search', state.adminFilters.search.trim());

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      state.allRequests = data.requests;
      renderAdminTable();
    }
  } catch (err) {
    console.error('Failed to load admin requests:', err);
    showToast('Failed to load dispatch requests', 'error');
  }
}

function updateAdminKpis() {
  if (!state.stats) return;
  const s = state.stats;
  document.getElementById('kpiTotal').textContent = s.totalRequests;
  document.getElementById('kpiPending').textContent = s.statusCounts.pending || 0;
  document.getElementById('kpiScheduled').textContent = s.statusCounts.scheduled || 0;
  document.getElementById('kpiTransit').textContent = s.statusCounts.in_progress || 0;
  document.getElementById('kpiCompleted').textContent = s.statusCounts.completed || 0;
  document.getElementById('kpiWeight').textContent = `${s.totalDivertedKg}`;
}

function updateAdminCategoryBars() {
  const container = document.getElementById('adminCategoryBars');
  if (!container || !state.stats) return;

  const cats = state.stats.categoryStats || [];
  const maxWeight = Math.max(...cats.map(c => c.total_weight_kg), 1);

  container.innerHTML = cats.map(c => {
    const pct = Math.round((c.total_weight_kg / maxWeight) * 100);
    return `
      <div>
        <div class="flex justify-between items-center text-xs mb-1">
          <span class="font-medium text-slate-700 flex items-center gap-1.5">
            <span>${c.icon}</span> ${c.name}
          </span>
          <span class="font-mono font-bold text-slate-900">${c.total_weight_kg} kg (${c.request_count} pickups)</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAdminFleetList() {
  const container = document.getElementById('adminFleetList');
  if (!container) return;

  container.innerHTML = state.drivers.map(d => `
    <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
      <div>
        <div class="font-bold text-slate-800">${d.name}</div>
        <div class="text-[10px] text-slate-500">${d.vehicle_type} • <span class="font-mono">${d.vehicle_plate}</span></div>
      </div>
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${d.active_status === 'on_route' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}">
        ${d.active_status === 'on_route' ? 'On Route' : 'Available'}
      </span>
    </div>
  `).join('');
}

function renderCategorySelectOptions() {
  const sel = document.getElementById('adminCategorySelect');
  if (!sel) return;
  sel.innerHTML = '<option value="all">All Categories</option>' +
    state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function setAdminStatusFilter(status) {
  state.adminFilters.status = status;

  // Highlight pill
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.className = 'status-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white';
    } else {
      btn.className = 'status-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100';
    }
  });

  fetchAdminData();
}

function applyAdminFilters() {
  state.adminFilters.category = document.getElementById('adminCategorySelect').value;
  state.adminFilters.search = document.getElementById('adminSearchInput').value;
  fetchAdminData();
}

function renderAdminTable() {
  const tbody = document.getElementById('adminTableBody');
  const empty = document.getElementById('adminTableEmpty');
  if (!tbody) return;

  if (state.allRequests.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = state.allRequests.map(r => `
    <tr class="hover:bg-slate-50/70 transition">
      <td class="py-3 px-4 font-mono font-bold text-slate-900">
        <button onclick="openAdminModal('${r.tracking_id}')" class="hover:text-emerald-600 underline underline-offset-2">
          ${r.tracking_id}
        </button>
      </td>
      <td class="py-3 px-4">
        <div class="font-semibold text-slate-800">${r.user_name}</div>
        <div class="text-[10px] text-slate-400 font-mono">${r.user_phone}</div>
      </td>
      <td class="py-3 px-4">
        <div class="font-medium text-slate-800 flex items-center gap-1">
          <span>${r.category_icon}</span> ${r.category_name}
        </div>
        <div class="text-[10px] text-slate-500 line-clamp-1 max-w-xs">${r.item_description}</div>
      </td>
      <td class="py-3 px-4 font-mono font-bold text-slate-800">
        ${r.estimated_weight_kg} kg
      </td>
      <td class="py-3 px-4">
        <div class="font-medium text-slate-800">${r.pickup_date}</div>
        <div class="text-[10px] text-slate-400">${r.pickup_time_slot.split(' ')[0]}</div>
      </td>
      <td class="py-3 px-4">
        <select onchange="handleAdminAssignDriver('${r.tracking_id}', this.value)" class="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white">
          <option value="">-- Assign Driver --</option>
          ${state.drivers.map(d => `
            <option value="${d.id}" ${r.assigned_driver_id === d.id ? 'selected' : ''}>
              ${d.name} (${d.vehicle_plate})
            </option>
          `).join('')}
        </select>
      </td>
      <td class="py-3 px-4">
        <select onchange="handleAdminChangeStatus('${r.tracking_id}', this.value)" class="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white">
          <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="scheduled" ${r.status === 'scheduled' ? 'selected' : ''}>📅 Scheduled</option>
          <option value="in_progress" ${r.status === 'in_progress' ? 'selected' : ''}>🚚 In Transit</option>
          <option value="completed" ${r.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
          <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
        </select>
      </td>
      <td class="py-3 px-4 text-right">
        <button onclick="openAdminModal('${r.tracking_id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold transition">
          Dossier ↗
        </button>
      </td>
    </tr>
  `).join('');
}

async function handleAdminAssignDriver(trackingId, driverId) {
  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigned_driver_id: driverId ? Number(driverId) : null,
        history_note: driverId ? 'Driver assigned by dispatch' : 'Driver assignment removed'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Driver assigned to ${trackingId}`);
      fetchAdminData();
    }
  } catch (err) {
    showToast('Failed to assign driver', 'error');
  }
}

async function handleAdminChangeStatus(trackingId, newStatus) {
  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        history_note: `Status updated to ${newStatus} via dispatch dashboard`
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Updated ${trackingId} to ${newStatus}`);
      fetchAdminData();
    }
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

// Admin Dossier Modal
async function openAdminModal(trackingId) {
  state.modalActiveRequestId = trackingId;
  const modal = document.getElementById('adminModal');
  modal.classList.remove('hidden');

  document.getElementById('modalTrackingId').textContent = trackingId;
  const body = document.getElementById('modalDetailsBody');
  body.innerHTML = '<div class="p-6 text-center text-slate-500">Loading dossier...</div>';

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}`);
    const data = await res.json();
    if (data.success && data.request) {
      const r = data.request;
      body.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-[10px] text-slate-400 uppercase font-semibold">Requester</div>
            <div class="font-bold text-slate-900">${r.user_name}</div>
            <div class="text-slate-600 font-mono">${r.user_phone}</div>
            <div class="text-slate-500">${r.user_email || 'No email provided'}</div>
          </div>
          <div>
            <div class="text-[10px] text-slate-400 uppercase font-semibold">Location</div>
            <div class="font-bold text-slate-900">${r.address}</div>
            <div class="text-slate-600">${r.apartment ? `Unit: ${r.apartment}, ` : ''}${r.city} ${r.zip_code}</div>
            <div class="text-[10px] text-slate-400 font-mono">Coords: ${r.latitude}, ${r.longitude}</div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div class="text-[10px] text-slate-400 uppercase font-semibold mb-1">Waste Item Details</div>
          <div class="font-semibold text-slate-800">${r.category_icon} ${r.category_name} • ${r.estimated_weight_kg} kg (${r.bag_count || 1} units)</div>
          <div class="text-slate-600 mt-1">${r.item_description}</div>
          ${r.special_instructions ? `<div class="mt-2 text-xs italic text-slate-500 bg-white p-2 rounded">Notes: ${r.special_instructions}</div>` : ''}
        </div>

        ${r.photo_url ? `
          <div>
            <div class="text-[10px] text-slate-400 uppercase font-semibold mb-1">Item Photo Preview</div>
            <img src="${r.photo_url}" class="h-32 object-cover rounded-xl border border-slate-200">
          </div>
        ` : ''}

        <div class="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label class="block text-[11px] font-semibold text-slate-700 mb-1">Update Status</label>
            <select id="modalStatusSelect" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold">
              <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>⏳ Pending Review</option>
              <option value="scheduled" ${r.status === 'scheduled' ? 'selected' : ''}>📅 Scheduled</option>
              <option value="in_progress" ${r.status === 'in_progress' ? 'selected' : ''}>🚚 In Transit / Dispatched</option>
              <option value="completed" ${r.status === 'completed' ? 'selected' : ''}>✅ Completed & Recycled</option>
              <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-700 mb-1">Assigned Driver</label>
            <select id="modalDriverSelect" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs">
              <option value="">-- No Driver Assigned --</option>
              ${state.drivers.map(d => `
                <option value="${d.id}" ${r.assigned_driver_id === d.id ? 'selected' : ''}>${d.name} (${d.vehicle_plate})</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-700 mb-1">Dispatcher Internal Notes</label>
          <textarea id="modalAdminNotes" rows="2" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs placeholder-slate-400" placeholder="Add verified facility ticket, weight receipt, or driver instructions...">${r.admin_notes || ''}</textarea>
        </div>

        <div>
          <div class="text-[10px] text-slate-400 uppercase font-semibold mb-2">History Audit Trail</div>
          <div class="space-y-1.5 text-[11px]">
            ${(r.history || []).map(h => `
              <div class="flex items-center justify-between text-slate-600 bg-slate-50 px-2 py-1 rounded">
                <span><strong>${h.status}:</strong> ${h.note || ''}</span>
                <span class="text-[10px] text-slate-400 font-mono">${formatTimeAgo(h.created_at)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  } catch (err) {
    body.innerHTML = '<div class="p-6 text-center text-rose-500">Failed to load dossier.</div>';
  }
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.add('hidden');
  state.modalActiveRequestId = null;
}

async function saveAdminModalChanges() {
  if (!state.modalActiveRequestId) return;

  const newStatus = document.getElementById('modalStatusSelect').value;
  const newDriver = document.getElementById('modalDriverSelect').value;
  const newNotes = document.getElementById('modalAdminNotes').value;

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(state.modalActiveRequestId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        assigned_driver_id: newDriver ? Number(newDriver) : null,
        admin_notes: newNotes,
        history_note: `Dispatcher modified status to ${newStatus}`
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Changes saved successfully', 'success');
      closeAdminModal();
      fetchAdminData();
    } else {
      showToast(data.error || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Network error while saving', 'error');
  }
}

// CSV Export
function exportToCsv() {
  if (!state.allRequests || state.allRequests.length === 0) {
    showToast('No requests available to export', 'error');
    return;
  }

  const headers = ['Tracking ID', 'Citizen Name', 'Phone', 'Email', 'Category', 'Weight (kg)', 'Status', 'Date', 'Time Slot', 'Address', 'Driver', 'Created At'];
  const rows = state.allRequests.map(r => [
    `"${r.tracking_id}"`,
    `"${r.user_name}"`,
    `"${r.user_phone}"`,
    `"${r.user_email || ''}"`,
    `"${r.category_name}"`,
    r.estimated_weight_kg,
    `"${r.status}"`,
    `"${r.pickup_date}"`,
    `"${r.pickup_time_slot}"`,
    `"${r.address}, ${r.city} ${r.zip_code}"`,
    `"${r.driver_name || 'Unassigned'}"`,
    `"${r.created_at}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `ecocollect_requests_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Exported collection requests to CSV');
}

// Reset Demo Data
async function handleSeedReset() {
  if (!confirm('Reset and re-seed the database with clean hackathon demo records?')) return;

  try {
    const res = await fetch('/api/seed', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Database reset and re-seeded successfully', 'success');
      await loadCategories();
      await loadDrivers();
      await loadStats();
      await fetchAdminData();
    }
  } catch (err) {
    showToast('Failed to reset database', 'error');
  }
}

// -----------------------------------------------------------------------------
// CERTIFICATE & ECO-RECEIPT MODAL
// -----------------------------------------------------------------------------
async function openCertificateModal(trackingId) {
  const modal = document.getElementById('certificateModal');
  modal.classList.remove('hidden');

  const body = document.getElementById('certificateBody');
  body.innerHTML = '<div class="p-6 text-center text-slate-500">Generating certificate...</div>';

  try {
    const res = await fetch(`/api/requests/${encodeURIComponent(trackingId)}`);
    const data = await res.json();
    if (data.success && data.request) {
      const r = data.request;
      const co2 = (r.estimated_weight_kg * (r.co2_factor_per_kg || 1.2)).toFixed(1);
      const points = Math.round(r.estimated_weight_kg * 10);

      body.innerHTML = `
        <div class="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-500">Citizen Contributor:</span>
            <span class="font-extrabold text-slate-900">${r.user_name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Tracking Reference:</span>
            <span class="font-mono font-bold text-emerald-800">${r.tracking_id}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Material Category:</span>
            <span class="font-semibold text-slate-800">${r.category_icon} ${r.category_name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Mass Diverted:</span>
            <span class="font-bold font-mono text-slate-900">${r.estimated_weight_kg} kg</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Carbon Avoided:</span>
            <span class="font-bold font-mono text-emerald-700">${co2} kg CO₂</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Green Reward Points:</span>
            <span class="font-bold font-mono text-amber-600">${points} Points Earned</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Pickup Date:</span>
            <span class="font-medium text-slate-700">${r.pickup_date}</span>
          </div>
        </div>

        <!-- Verification QR Stamp Mock -->
        <div class="p-3 rounded-2xl border-2 border-dashed border-emerald-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs rounded-lg">
              QR
            </div>
            <div>
              <div class="text-[10px] uppercase font-bold text-emerald-700">Digital Blockchain Hash</div>
              <div class="font-mono text-[9px] text-slate-500">0x7F2A...9B81cE4</div>
              <div class="text-[10px] text-slate-600">Verified by Municipal Resource Hub</div>
            </div>
          </div>
          <span class="text-emerald-600 font-extrabold text-xs">✓ VERIFIED</span>
        </div>
      `;
    }
  } catch (err) {
    body.innerHTML = '<div class="p-6 text-center text-rose-500">Failed to generate certificate.</div>';
  }
}

function closeCertificateModal() {
  document.getElementById('certificateModal').classList.add('hidden');
}

// -----------------------------------------------------------------------------
// HELPERS & TOASTS
// -----------------------------------------------------------------------------
function getStatusBadgeHtml(status, size = 'sm') {
  const pad = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';
  switch (status) {
    case 'pending':
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">⏳ Pending</span>`;
    case 'scheduled':
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-200">📅 Scheduled</span>`;
    case 'in_progress':
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200"><span class="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1 animate-pulse"></span>Out for Pickup</span>`;
    case 'completed':
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">✅ Recycled</span>`;
    case 'cancelled':
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">❌ Cancelled</span>`;
    default:
      return `<span class="inline-flex items-center ${pad} rounded-full font-bold bg-slate-100 text-slate-700">${status}</span>`;
  }
}

function formatTimeAgo(isoString) {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch (e) {
    return 'Recently';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-rose-900 border-rose-700 text-rose-100' :
                  type === 'success' ? 'bg-emerald-900 border-emerald-700 text-emerald-100' :
                  'bg-slate-900 border-slate-700 text-white';

  toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold ${bgClass} transition-all duration-300 transform translate-y-2 opacity-0`;
  toast.innerHTML = `
    <span>${type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  // Animate out and remove
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
