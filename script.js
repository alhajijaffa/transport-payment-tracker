const storageKey = 'bikeTransportPayments';
const authKey = 'bikeTransportAuth';
const countryKey = 'bikeTransportCountry';

const form = document.getElementById('payment-form');
const rideList = document.getElementById('ride-list');
const totalRides = document.getElementById('total-rides');
const totalPaid = document.getElementById('total-paid');
const totalPending = document.getElementById('total-pending');
const totalRevenue = document.getElementById('total-revenue');
const clearAllButton = document.getElementById('clear-all');
const cancelEditButton = document.getElementById('cancel-edit');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const exportCsvButton = document.getElementById('export-csv');
const logoutButton = document.getElementById('logout-button');
const countrySelect = document.getElementById('country-select');
const brandCountry = document.getElementById('brand-country');
const heroHeading = document.getElementById('hero-heading');
const heroCopy = document.getElementById('hero-copy');
const rideChartCanvas = document.getElementById('analytics-chart');
const avgFareElement = document.getElementById('avg-fare');
const topRouteElement = document.getElementById('top-route');
const paidShareElement = document.getElementById('paid-share');
const refreshChartButton = document.getElementById('refresh-chart');
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authToggle = document.getElementById('auth-toggle');
const authNote = document.getElementById('auth-note');
const authSubmit = document.getElementById('auth-submit');
const mainContent = document.getElementById('main-content');

const rideName = document.getElementById('ride-name');
const rideDate = document.getElementById('ride-date');
const rideRoute = document.getElementById('ride-route');
const rideDistance = document.getElementById('ride-distance');
const rideFare = document.getElementById('ride-fare');
const rideStatus = document.getElementById('ride-status');
const rideNotes = document.getElementById('ride-notes');

const countryOptions = {
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigeria' },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghana' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenya' },
};

let rides = [];
let editingId = null;
let currentCountry = 'NGN';
let authMode = 'login';
let signedInUser = null;

function loadRides() {
  const raw = localStorage.getItem(storageKey);
  rides = raw ? JSON.parse(raw) : [];
}

function saveRides() {
  localStorage.setItem(storageKey, JSON.stringify(rides));
}

function loadAuth() {
  const raw = localStorage.getItem(authKey);
  signedInUser = raw ? JSON.parse(raw) : null;
  if (!signedInUser) {
    authMode = 'register';
  }
}

function saveAuth(user) {
  localStorage.setItem(authKey, JSON.stringify(user));
  signedInUser = user;
}

function clearAuth() {
  signedInUser = null;
  authMode = 'login';
}

function loadCountry() {
  const savedCountry = localStorage.getItem(countryKey);
  currentCountry = savedCountry && countryOptions[savedCountry] ? savedCountry : 'NGN';
  countrySelect.value = currentCountry;
  updateCountryBranding();
}

function saveCountry() {
  localStorage.setItem(countryKey, currentCountry);
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: countryOptions[currentCountry].code,
    maximumFractionDigits: 2,
  }).format(value);
}

function updateCurrencyPrefix() {
  document.querySelectorAll('.input-prefix').forEach((prefix) => {
    prefix.textContent = countryOptions[currentCountry].symbol;
  });
}

function updateCountryBranding() {
  const country = countryOptions[currentCountry];
  brandCountry.textContent = country.name;
  heroCopy.textContent = `Manage bike transport fares, record payments, monitor pending balances, and generate daily reports for ${country.name}.`;
  updateCurrencyPrefix();
  renderSummary();
  renderRideList();
  renderAnalytics();
}

function getBadge(status) {
  return `<span class="status-badge ${status === 'pending' ? 'pending' : ''}">${status}</span>`;
}

function renderSummary() {
  totalRides.textContent = rides.length;
  const paidSum = rides.filter((ride) => ride.status === 'paid').reduce((sum, ride) => sum + ride.fare, 0);
  const pendingSum = rides.filter((ride) => ride.status === 'pending').reduce((sum, ride) => sum + ride.fare, 0);
  const revenueSum = paidSum;

  totalPaid.textContent = formatCurrency(paidSum);
  totalPending.textContent = formatCurrency(pendingSum);
  totalRevenue.textContent = formatCurrency(revenueSum);
}

function getFilteredRides() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;

  return rides.filter((ride) => {
    const matchesStatus = status === 'all' || ride.status === status;
    const searchable = `${ride.route} ${ride.notes} ${ride.status}`.toLowerCase();
    const matchesQuery = searchable.includes(query);
    return matchesStatus && matchesQuery;
  });
}

function renderRideList() {
  const filtered = getFilteredRides();

  if (!filtered.length) {
    rideList.innerHTML = '<tr class="placeholder-row"><td colspan="6">No rides match the current filter. Add more rides or update the search criteria.</td></tr>';
    return;
  }

  rideList.innerHTML = filtered
    .map((ride) => {
      return `
        <tr>
          <td>${ride.name}</td>
          <td>${ride.date}</td>
          <td>${ride.route}</td>
          <td>${ride.distance.toFixed(1)} km</td>
          <td>${formatCurrency(ride.fare)}</td>
          <td>${getBadge(ride.status)}</td>
          <td>
            <div class="action-buttons">
              <button type="button" class="button button--secondary" data-action="edit" data-id="${ride.id}">Edit</button>
              <button type="button" class="button button--ghost" data-action="delete" data-id="${ride.id}">Delete</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function resetForm() {
  editingId = null;
  form.reset();
  cancelEditButton.classList.add('hidden');
  document.querySelector('#payment-form button[type="submit"]').textContent = 'Save Ride';
}

function setFormValues(ride) {
  rideName.value = ride.name;
  rideDate.value = ride.date;
  rideRoute.value = ride.route;
  rideDistance.value = ride.distance;
  rideFare.value = ride.fare;
  rideStatus.value = ride.status;
  rideNotes.value = ride.notes;
 
}

function updateAnalytics() {
  const paidSum = rides.filter((ride) => ride.status === 'paid').reduce((sum, ride) => sum + ride.fare, 0);
  const pendingSum = rides.filter((ride) => ride.status === 'pending').reduce((sum, ride) => sum + ride.fare, 0);
  const averageFare = rides.length ? rides.reduce((sum, ride) => sum + ride.fare, 0) / rides.length : 0;
  const routeCounts = rides.reduce((counts, ride) => {
    counts[ride.route] = (counts[ride.route] || 0) + 1;
    return counts;
  }, {});
  const topRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0];

  avgFareElement.textContent = formatCurrency(averageFare);
  topRouteElement.textContent = topRoute ? `${topRoute[0]} (${topRoute[1]} rides)` : '—';
  paidShareElement.textContent = rides.length ? `${Math.round((paidSum / (paidSum + pendingSum || 1)) * 100)}%` : '0%';

  drawRideChart(paidSum, pendingSum);
}

function drawRideChart(paidSum, pendingSum) {
  const canvas = rideChartCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.height * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = height;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.height;
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const maxValue = Math.max(paidSum, pendingSum, 1);
  const barWidth = 100;
  const gap = 40;
  const startX = 40;
  const chartBottom = displayHeight - 40;
  const scale = (displayHeight - 100) / maxValue;

  const bars = [
    { label: 'Paid', value: paidSum, color: '#5de0b3' },
    { label: 'Pending', value: pendingSum, color: '#f97373' },
  ];

  ctx.font = '14px Inter, system-ui';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('Revenue breakdown', 20, 24);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;

  for (let y = 0; y <= 4; y += 1) {
    const yPos = 40 + y * ((displayHeight - 80) / 4);
    ctx.beginPath();
    ctx.moveTo(30, yPos);
    ctx.lineTo(displayWidth - 20, yPos);
    ctx.stroke();
  }

  bars.forEach((bar, index) => {
    const x = startX + index * (barWidth + gap);
    const barHeight = Math.max(bar.value * scale, 12);
    const y = chartBottom - barHeight;

    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#eef2ff';
    ctx.fillText(bar.label, x, chartBottom + 20);
    ctx.fillText(formatCurrency(bar.value), x, y - 10);
  });
}

function handleFormSubmit(event) {
  event.preventDefault();

  const ride = {
    id: editingId || Date.now().toString(),
    name: rideName.value.trim() || `Ride on ${rideDate.value}`,
    date: rideDate.value,
    route: rideRoute.value.trim(),
    distance: parseFloat(rideDistance.value) || 0,
    fare: parseFloat(rideFare.value) || 0,
    status: rideStatus.value,
    notes: rideNotes.value.trim(),
  };

  if (!ride.date || !ride.route || ride.fare < 0) {
    alert('Please complete the ride date, route, and fare fields.');
    return;
  }

  if (editingId) {
    rides = rides.map((item) => (item.id === editingId ? ride : item));
  } else {
    rides.unshift(ride);
  }

  saveRides();
  renderSummary();
  renderRideList();
  renderAnalytics();
  resetForm();
}

function handleTableClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  if (!action || !id) return;

  if (action === 'edit') {
    const ride = rides.find((item) => item.id === id);
    if (!ride) return;
    editingId = id;
    setFormValues(ride);
    cancelEditButton.classList.remove('hidden');
    document.querySelector('#payment-form button[type="submit"]').textContent = 'Update Ride';
  }

  if (action === 'delete') {
    if (!confirm('Delete this ride record?')) return;
    rides = rides.filter((item) => item.id !== id);
    saveRides();
    renderSummary();
    renderRideList();
    renderAnalytics();
    if (editingId === id) resetForm();
  }
}

function handleClearAll() {
  if (!rides.length) return;
  if (!confirm('Remove all saved rides? This cannot be undone.')) return;
  rides = [];
  saveRides();
  renderSummary();
  renderRideList();
  renderAnalytics();
  resetForm();
}

function handleExportCsv() {
  if (!rides.length) {
    alert('No ride records available to export.');
    return;
  }

  const headers = ['Date', 'Route', 'Distance (km)', 'Fare', 'Status', 'Notes'];
  const rows = rides.map((ride) => [
    ride.name,
    ride.date,
    ride.route,
    ride.distance,
    ride.fare,
    ride.status,
    ride.notes.replace(/\n/g, ' '),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `bike-transport-rides-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleCountryChange(event) {
  currentCountry = event.target.value;
  saveCountry();
  updateCountryBranding();
}

function openAuthOverlay() {
  authOverlay.classList.remove('hidden');
  mainContent.classList.add('blurred');
  if (authMode === 'register') {
    authTitle.textContent = 'Create your Bike Transport account';
    authSubtitle.textContent = 'Protect your ride and payment data with a local sign-in.';
    authSubmit.textContent = 'Register';
    authToggle.textContent = 'Already have an account? Sign in';
  } else {
    authTitle.textContent = 'Sign in to Bike Transport Tracker';
    authSubtitle.textContent = 'Securely manage rides, payments, and earnings.';
    authSubmit.textContent = 'Sign In';
    authToggle.textContent = 'Create Account';
  }
  authNote.textContent = '';
  authUsername.value = '';
  authPassword.value = '';
  authUsername.focus();
}

function closeAuthOverlay() {
  authOverlay.classList.add('hidden');
  mainContent.classList.remove('blurred');
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();

  if (!username || !password) {
    authNote.textContent = 'Please enter both username and password.';
    return;
  }

  const stored = localStorage.getItem(authKey);
  const existingUser = stored ? JSON.parse(stored) : null;

  if (authMode === 'register') {
    if (existingUser && existingUser.username === username) {
      authNote.textContent = 'This username already exists. Please sign in or choose another name.';
      return;
    }
    saveAuth({ username, password });
    authNote.textContent = 'Account created. You are signed in now.';
    closeAuthOverlay();
    logoutButton.classList.remove('hidden');
    return;
  }

  if (!existingUser || existingUser.username !== username || existingUser.password !== password) {
    authNote.textContent = 'Login failed. Check your username and password.';
    return;
  }

  signedInUser = existingUser;
  closeAuthOverlay();
  logoutButton.classList.remove('hidden');
}

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  openAuthOverlay();
}

function handleLogout() {
  clearAuth();
  logoutButton.classList.add('hidden');
  openAuthOverlay();
}

form.addEventListener('submit', handleFormSubmit);
rideList.addEventListener('click', handleTableClick);
clearAllButton.addEventListener('click', handleClearAll);
cancelEditButton.addEventListener('click', resetForm);
searchInput.addEventListener('input', renderRideList);
statusFilter.addEventListener('change', renderRideList);
exportCsvButton.addEventListener('click', handleExportCsv);
countrySelect.addEventListener('change', handleCountryChange);
refreshChartButton.addEventListener('click', renderAnalytics);
authForm.addEventListener('submit', handleAuthSubmit);
authToggle.addEventListener('click', toggleAuthMode);
logoutButton.addEventListener('click', handleLogout);

document.addEventListener('DOMContentLoaded', () => {
  loadAuth();
  loadCountry();
  loadRides();
  renderSummary();
  renderRideList();
  renderAnalytics();
  if (!signedInUser) {
    openAuthOverlay();
  } else {
    logoutButton.classList.remove('hidden');
  }
});
