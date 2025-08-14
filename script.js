/* FarmLink GH - Main Application Script */
// Now using local database instead of Firebase

const el = (selector, parent = document) => parent.querySelector(selector);
const els = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

let currentUser = null;
let userProfile = null;

// Initialize the application
async function initApp() {
  try {
    // Wait for local database and auth to be initialized
    if (window.localDB && window.localAuth) {
      console.log('Local database and auth initialized in main app');
      setupAuthStateListener();
    } else {
      // Wait for local systems to initialize
      document.addEventListener('DOMContentLoaded', () => {
        if (window.localDB && window.localAuth) {
          setupAuthStateListener();
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Set up authentication state listener
function setupAuthStateListener() {
  if (!window.localAuth) return;
  
  // Listen for auth state changes
  document.addEventListener('authStateChanged', async (event) => {
    const user = event.detail.user;
    currentUser = user;
    
    if (user) {
      console.log('User authenticated:', user.email);
      await loadUserProfile(user.uid);
      setupProtectedFeatures();
    } else {
      console.log('User signed out');
      userProfile = null;
      hideProtectedFeatures();
    }
  });
}

// Load user profile from database
async function loadUserProfile(uid) {
  try {
    if (window.localDB) {
      userProfile = await window.localDB.getUser(uid);
      console.log('User profile loaded:', userProfile);
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

// Set up features that require authentication
function setupProtectedFeatures() {
  // Update navigation to show user info
  updateNavigationForUser();
  
  // Set up marketplace if on marketplace page
  if (window.location.pathname.includes('marketplace.html')) {
    setupMarketplace();
  }
  
  // Set up dashboard features if on dashboard page
  if (window.location.pathname.includes('dashboard.html')) {
    setupDashboard();
  }
}

// Hide features when user is not authenticated
function hideProtectedFeatures() {
  // Update navigation to show login/signup
  updateNavigationForGuest();
  
  // Hide protected content
  const protectedElements = document.querySelectorAll('[data-protected]');
  protectedElements.forEach(el => {
    el.style.display = 'none';
  });
}

// Set up dashboard functionality
function setupDashboard() {
  // Set up database management buttons
  const exportBtn = document.getElementById('export-data');
  const importBtn = document.getElementById('import-data');
  const importFile = document.getElementById('import-file');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        await window.localDB.exportData();
        showMessage('Data exported successfully!', 'success');
      } catch (error) {
        showMessage('Failed to export data. Please try again.', 'error');
      }
    });
  }
  
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
  }
  
  if (importFile) {
    importFile.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        try {
          const text = await file.text();
          await window.localDB.importData(text);
          showMessage('Data imported successfully!', 'success');
          // Reload the page to show imported data
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          showMessage('Failed to import data. Please check the file format.', 'error');
        }
      }
    });
  }
  
  // Set up logout button
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      if (window.localAuth) {
        window.localAuth.handleLogout(e);
      }
    });
  }
  
  // Set up quick action buttons
  const addProductBtn = document.getElementById('add-product');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      // TODO: Implement add product functionality
      showMessage('Add product feature coming soon!', 'info');
    });
  }
  
  // Load user's actual products from database
  loadUserProducts();
  
  // Update user info in header
  updateDashboardUserInfo();
  
  // Setup product form
  setupProductForm();
}

// Load user's products from local database
async function loadUserProducts() {
  try {
    if (window.localDB && currentUser) {
      const products = await window.localDB.getUserProducts(currentUser.uid);
      displayUserProducts(products);
    }
  } catch (error) {
    console.error('Error loading user products:', error);
  }
}

// Display user's products in the dashboard
function displayUserProducts(products) {
  const productsTable = document.getElementById('products-table');
  if (!productsTable) return;
  
  const tbody = productsTable.querySelector('tbody');
  if (!tbody) return;
  
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-500); padding: 2rem;">No products yet. Add your first product!</td></tr>';
    return;
  }
  
  tbody.innerHTML = products.map(product => {
    // Determine stock badge class
    let stockBadgeClass = 'high';
    if (product.stock <= 10) stockBadgeClass = 'low';
    else if (product.stock <= 25) stockBadgeClass = 'medium';
    
    return `
      <tr>
        <td>
          <div class="product-cell">
            <img src="image.jpg" alt="${product.name}" class="product-image">
            <div>
              <strong>${product.name}</strong>
              <span class="product-category">${product.category || 'General'}</span>
            </div>
          </div>
        </td>
        <td>₵${product.price}/${product.unit || 'unit'}</td>
        <td><span class="stock-badge ${stockBadgeClass}">${product.stock}</span></td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="Edit" onclick="editProduct(${product.id})">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-icon" title="Delete" onclick="deleteProduct(${product.id})">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Show message to user
function showMessage(message, type = 'info') {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message');
  existingMessages.forEach(el => el.remove());

  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `message alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
  messageDiv.textContent = message;

  // Insert message at top of dashboard
  const dashboard = document.querySelector('.dashboard-container');
  if (dashboard) {
    dashboard.insertBefore(messageDiv, dashboard.firstChild);
  }

  // Auto-remove message after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}

// Update dashboard user info
function updateDashboardUserInfo() {
  if (currentUser) {
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    
    if (userNameElement) {
      userNameElement.textContent = currentUser.fullName || currentUser.email;
    }
    
    if (userRoleElement) {
      userRoleElement.textContent = userProfile?.role || 'Farmer';
    }
  }
}

// Product management functions
function editProduct(productId) {
  // TODO: Implement edit product functionality
  showMessage('Edit product feature coming soon!', 'info');
}

function deleteProduct(productId) {
  if (confirm('Are you sure you want to delete this product?')) {
    // TODO: Implement delete product functionality
    showMessage('Delete product feature coming soon!', 'info');
  }
}

// Setup product form
function setupProductForm() {
  const form = document.getElementById('add-product-form');
  if (form) {
    form.addEventListener('submit', handleAddProduct);
  }
}

// Handle adding new product
async function handleAddProduct(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const productData = {
    name: formData.get('name'),
    category: formData.get('category'),
    price: parseFloat(formData.get('price')),
    unit: formData.get('unit'),
    stock: parseInt(formData.get('stock')),
    description: formData.get('description'),
    userId: currentUser.uid,
    createdAt: new Date().toISOString()
  };
  
  try {
    await window.localDB.addProduct(productData);
    showMessage('Product added successfully!', 'success');
    event.target.reset();
    loadUserProducts(); // Refresh the products table
  } catch (error) {
    console.error('Error adding product:', error);
    showMessage('Failed to add product. Please try again.', 'error');
  }
}

// Update navigation for authenticated user
function updateNavigationForUser() {
  const navCta = document.querySelector('.nav-cta');
  if (navCta && currentUser) {
    navCta.innerHTML = `
      <div class="user-menu">
        <span class="user-name">${currentUser.displayName || currentUser.email}</span>
        <button class="btn btn-outline" id="logout-btn">Logout</button>
      </div>
    `;
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.farmLinkAuth) {
          window.farmLinkAuth.signOut();
        }
      });
    }
  }
}

// Update navigation for guest user
function updateNavigationForGuest() {
  const navCta = document.querySelector('.nav-cta');
  if (navCta) {
    navCta.innerHTML = `
      <a class="btn btn-outline" href="login.html">Login</a>
      <a class="btn btn-secondary" href="signup.html">Sign Up</a>
    `;
  }
}

/* Firebase bootstrap (Auth + Firestore) */
let fb = null;
async function initFirebase() {
  if (fb) return fb;
  // Load Firebase v10 modules from CDN and initialize
  const [{ initializeApp }, { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut }, { getFirestore, collection, addDoc, getDocs, setDoc, doc, getDoc, updateDoc, query, orderBy } ] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
  ]);
  const app = initializeApp(window.FIREBASE_CONFIG || {});
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();
  fb = { app, auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, googleProvider, signOut, collection, addDoc, getDocs, setDoc, doc, getDoc, updateDoc, query, orderBy };
  return fb;
}

/* UI helpers: modal + toast + mobile menu */
function showToast(message, type = 'success', timeoutMs = 3000) {
  let container = el('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  container.appendChild(t);
  setTimeout(() => t.remove(), timeoutMs);
}

function openModal(contentHtml, { title = 'Notice', actions = [] } = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal';
  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <strong>${title}</strong>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="modal-body">${contentHtml}</div>
      <div class="modal-actions"></div>
    </div>`;
  document.body.appendChild(overlay);
  const closeBtn = el('.modal-close', overlay);
  const actionsRow = el('.modal-actions', overlay);
  (actions || []).forEach((a) => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.variant || 'btn-primary'}`;
    btn.textContent = a.label || 'OK';
    btn.addEventListener('click', () => (a.onClick ? a.onClick(closeModal) : closeModal()));
    actionsRow.appendChild(btn);
  });
  const esc = (e) => e.key === 'Escape' && closeModal();
  overlay.addEventListener('click', (e) => e.target === overlay && closeModal());
  closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', esc, { once: true });
}

function closeModal() {
  const m = el('.modal');
  if (m) m.remove();
}

function setupMobileMenu() {
  const btn = el('#menu-btn');
  const links = el('.nav-links');
  const closeBtn = el('#mobile-close');
  if (!btn || !links) return;
  
  // Toggle menu on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    links.classList.toggle('show');
    
    // Change icon based on state
    const icon = btn.querySelector('i');
    if (icon) {
      if (links.classList.contains('show')) {
        icon.className = 'ri-close-line';
      } else {
        icon.className = 'ri-menu-line';
      }
    }
  });
  
  // Close menu when clicking the close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      links.classList.remove('show');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'ri-menu-line';
      }
    });
  }
  
  // Close menu when clicking on a link
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      links.classList.remove('show');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'ri-menu-line';
      }
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!links.contains(e.target) && !btn.contains(e.target)) {
      links.classList.remove('show');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'ri-menu-line';
      }
    }
  });
  
  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('show')) {
      links.classList.remove('show');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'ri-menu-line';
      }
    }
  });
}

/* Weather API (Open-Meteo) */
async function geocodeLocation(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data?.results?.length) throw new Error('Location not found');
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}` };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current_weather: 'true',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
    hourly: 'relative_humidity_2m',
    timezone: 'auto',
    forecast_days: '3',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = await res.json();
  const current = data.current_weather || {};
  const humidity = Array.isArray(data.hourly?.relative_humidity_2m) ? data.hourly.relative_humidity_2m[0] : undefined;
  return {
    temp: Math.round(current.temperature ?? 0),
    wind: Math.round(current.windspeed ?? 0),
    humidity: humidity ?? 60,
    sunrise: formatTime(data.daily?.sunrise?.[0]),
    sunset: formatTime(data.daily?.sunset?.[0]),
    daily: (data.daily?.time || []).map((t, i) => ({
      date: t,
      max: Math.round(data.daily.temperature_2m_max?.[i] ?? 0),
      min: Math.round(data.daily.temperature_2m_min?.[i] ?? 0),
    })),
    desc: inferDescription(current.weathercode),
  };
}

function inferDescription(code) {
  // Basic mapping for common WMO weather codes
  const m = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Snow', 80: 'Rain showers', 95: 'Thunderstorm'
  };
  return m[code] || 'Weather';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function renderWeather(locationName = 'Accra') {
  const container = el('#weather-card');
  if (!container) return;
  try {
    const geo = await geocodeLocation(locationName);
    const w = await fetchWeather(geo.lat, geo.lon);
    el('[data-w-location]', container).textContent = geo.name;
    el('[data-w-temp]', container).textContent = `${w.temp}°C`;
    el('[data-w-desc]', container).textContent = `${w.desc} · Humidity ${w.humidity}%`;
    const tip = el('[data-w-tip]', container);
    if (tip) {
      let message = 'Great day for farm work.';
      if ((w.desc || '').toLowerCase().includes('rain')) message = 'Rain expected — cover harvested crops.';
      if (w.temp >= 33) message = 'High heat — irrigate early morning or evening.';
      tip.textContent = message;
    }
    renderForecastGrids(w.daily);
  } catch (err) {
    showToast('Could not load live weather. Showing defaults.', 'warn');
  }
}

function renderForecastGrids(daily = []) {
  const grids = els('.forecast-grid');
  if (!grids.length) return;
  const dayName = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short' });
  const html = daily.slice(0, 3).map(d => `<div class="forecast-item">${dayName(d.date)} • ${d.max}°C</div>`).join('');
  grids.forEach(g => g.innerHTML = html);
}

function setupWeatherSearch() {
  const form = el('#weather-search-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = el('input[name="location"]', form).value.trim();
    if (query) renderWeather(query);
  });
}

/* Marketplace mock + filters */
const products = [
  { id: 1, name: 'Maize', price: 120, unit: 'sack', location: 'Tamale', category: 'Seeds', img: 'hero-1.jpg' },
  { id: 2, name: 'Fresh Tomatoes', price: 50, unit: 'basket', location: 'Kumasi', category: 'Vegetables', img: 'hero-1.jpg' },
  { id: 3, name: 'Plantains', price: 80, unit: 'bundle', location: 'Cape Coast', category: 'Fruits', img: 'hero-1.jpg' },
  { id: 4, name: 'Cassava', price: 60, unit: 'bundle', location: 'Ho', category: 'Crops', img: 'hero-1.jpg' },
  { id: 5, name: 'Goat', price: 350, unit: 'each', location: 'Wa', category: 'Livestock', img: 'hero-1.jpg' },
  { id: 6, name: 'Machete', price: 45, unit: 'each', location: 'Accra', category: 'Tools', img: 'hero-1.jpg' },
  { id: 7, name: 'Cocoa Pods', price: 200, unit: 'basket', location: 'Tarkwa', category: 'Crops', img: 'hero-1.jpg' },
  { id: 8, name: 'Yam', price: 18, unit: 'tuber', location: 'Techiman', category: 'Crops', img: 'hero-1.jpg' },
];

let marketplacePage = 1;
const PAGE_SIZE = 8;

function renderProducts() {
  const grid = el('#product-grid');
  if (!grid) return;

  const search = (el('#search-name')?.value || '').toLowerCase();
  const category = el('#filter-category')?.value || 'all';
  const location = (el('#filter-location')?.value || '').toLowerCase();

  const filtered = products.filter((p) => {
    const matchName = p.name.toLowerCase().includes(search);
    const matchCategory = category === 'all' || p.category === category;
    const matchLocation = !location || p.location.toLowerCase().includes(location);
    return matchName && matchCategory && matchLocation;
  });

  const visible = filtered.slice(0, marketplacePage * PAGE_SIZE);
  grid.innerHTML = visible.map((p) => productCardHTML(p)).join('');

  const loadMore = el('#load-more');
  if (loadMore) {
    loadMore.style.display = visible.length < filtered.length ? 'inline-flex' : 'none';
  }
}

function productCardHTML(p) {
  return `
  <div class="card product-card">
    <img src="../image.jpg" alt="${p.name}" />
    <div class="card-body">
      <h3 style="margin:0 0 6px; font-size:18px;">${p.name}</h3>
      <div class="meta">₵${p.price}/${p.unit} • ${p.location}</div>
      <div class="actions">
        <a class="btn btn-secondary" href="tel:+233000000000">Call</a>
        <a class="btn btn-outline" href="https://wa.me/233000000000" target="_blank" rel="noopener">Contact</a>
      </div>
    </div>
  </div>`;
}

function setupMarketplace() {
  const grid = el('#product-grid');
  if (!grid) return;
  ['#search-name', '#filter-category', '#filter-location'].forEach((s) => {
    const node = el(s);
    if (node) node.addEventListener('input', () => { marketplacePage = 1; renderProducts(); });
  });
  const loadMore = el('#load-more');
  if (loadMore) loadMore.addEventListener('click', () => { marketplacePage += 1; renderProducts(); });
  renderProducts();

  // Contact farmer popup
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.actions .btn');
    if (!btn) return;
    e.preventDefault();
    const card = e.target.closest('.product-card');
    const name = card?.querySelector('h3')?.textContent || 'Farmer';
    openModal(`<p>Contact <strong>${name}</strong> via:</p>
      <div class="flex">
        <a class="btn btn-secondary" href="tel:+233000000000"><i class="ri-phone-fill"></i> Phone</a>
        <a class="btn btn-outline" href="https://wa.me/233000000000" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp</a>
      </div>`, {
      title: 'Contact Farmer',
      actions: [{ label: 'Close', variant: 'btn-outline' }],
    });
  });



  // Add activity tracking for category browsing
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const category = btn.dataset.category;
      await trackMarketplaceBrowse(category);
    });
  });
}

/* Contact form */
function setupContact() {
  const form = el('#contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    openModal('<p>Thanks for contacting FarmLink GH. We will reach out soon.</p>', {
      title: 'Message sent',
      actions: [{ label: 'OK', variant: 'btn-primary', onClick: (close) => { close(); } }],
    });
    showToast('Message sent successfully');
    form.reset();
  });
}

/* Auth */
function setupAuth() {
  const login = el('#login-form');
  if (login) {
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const email = login.querySelector('input[type="email"]').value;
        const password = login.querySelector('input[type="password"]').value;
        const { auth, signInWithEmailAndPassword } = await initFirebase();
        await signInWithEmailAndPassword(auth, email, password);
        await ensureUserDoc();
        showToast('Welcome back!', 'success');
        window.location.href = 'index.html';
      } catch (err) {
        showToast(err.message || 'Login failed', 'error');
      }
    });
    const googleBtn = el('#btn-google-login');
    googleBtn?.addEventListener('click', async () => {
      try {
        const { auth, signInWithPopup, googleProvider } = await initFirebase();
        await signInWithPopup(auth, googleProvider);
        await ensureUserDoc();
        showToast('Logged in with Google', 'success');
        window.location.href = 'index.html';
      } catch (err) {
        showToast(err.message || 'Google sign-in failed', 'error');
      }
    });
  }
  const signup = el('#signup-form');
  if (signup) {
    signup.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const inputs = signup.querySelectorAll('input');
        const email = inputs[1].value;
        const password = inputs[2].value;
        const { auth, createUserWithEmailAndPassword } = await initFirebase();
        await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserDoc();
        showToast('Account created', 'success');
        window.location.href = 'index.html';
      } catch (err) {
        showToast(err.message || 'Signup failed', 'error');
      }
    });
    const googleBtn = el('#btn-google-signup');
    googleBtn?.addEventListener('click', async () => {
      try {
        const { auth, signInWithPopup, googleProvider } = await initFirebase();
        await signInWithPopup(auth, googleProvider);
        await ensureUserDoc();
        showToast('Account created with Google', 'success');
        window.location.href = 'index.html';
      } catch (err) {
        showToast(err.message || 'Google sign-up failed', 'error');
      }
    });
  }

  // Track login attempts
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      // Track login attempt
      await updateUserActivity('login_attempt', {
        timestamp: Date.now(),
        method: 'email'
      });
    });
  }
  
  // Track signup attempts
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      // Track signup attempt
      await updateUserActivity('signup_attempt', {
        timestamp: Date.now(),
        method: 'email'
      });
    });
  }
}

// Create user profile document if missing
async function ensureUserDoc() {
  const { auth, db, doc, getDoc, setDoc } = await initFirebase();
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = {
      uid: user.uid,
      email: user.email || null,
      role: 'Farmer',
      fullName: user.displayName || null,
      phone: null,
      location: null,
      farmSize: null,
      farmType: null,
      experience: null,
      bio: null,
      profileImage: null,
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    await setDoc(ref, profile);
  } else {
    // Update last active timestamp for existing users
    await updateDoc(ref, { lastActive: Date.now() });
  }
}

// Function to update user activity and accumulate data
async function updateUserActivity(activityType, data = {}) {
  if (!currentUser || !userProfile) {
    console.log('No user logged in, skipping activity update');
    return;
  }
  
  try {
    if (window.farmLinkAuth && window.farmLinkAuth.db) {
      // Dynamically import Firebase functions
      const { doc, updateDoc, arrayUnion, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const userRef = doc(window.farmLinkAuth.db, 'users', currentUser.uid);
      
      // Create detailed activity entry with rich information
      const activityEntry = {
        type: activityType,
        data: data,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        displayText: generateActivityDisplayText(activityType, data),
        icon: getActivityIcon(activityType)
      };
      
      // Update user profile with comprehensive changes
      const updates = {
        lastActive: Date.now(),
        [`dashboard.recentActivity`]: arrayUnion(activityEntry)
      };
      
      // Update specific stats based on activity type
      switch (activityType) {
        case 'product_added':
          updates['stats.totalListings'] = increment(1);
          updates['dashboard.inventory.totalProducts'] = increment(1);
          // Add to inventory
          if (data.productName) {
            updates['dashboard.inventory.products'] = arrayUnion({
              name: data.productName,
              price: data.price || 0,
              stock: data.stock || 0,
              addedAt: Date.now()
            });
          }
          break;
          
        case 'product_updated':
          // Update inventory product
          if (data.oldName && data.newName) {
            updates['dashboard.inventory.products'] = arrayUnion({
              name: data.newName,
              price: data.newPrice || 0,
              stock: data.newStock || 0,
              updatedAt: Date.now(),
              previousName: data.oldName
            });
          }
          break;
          
        case 'product_deleted':
          updates['stats.totalListings'] = increment(-1);
          updates['dashboard.inventory.totalProducts'] = increment(-1);
          break;
          
        case 'order_received':
          updates['stats.pendingOrders'] = increment(1);
          updates['stats.totalOrders'] = increment(1);
          // Add to orders
          updates['dashboard.orders.pending'] = arrayUnion({
            id: data.orderId || Date.now(),
            productName: data.productName || 'Product',
            buyerName: data.buyerName || 'Buyer',
            location: data.location || 'Unknown',
            amount: data.amount || 0,
            receivedAt: Date.now()
          });
          break;
          
        case 'order_completed':
          updates['stats.pendingOrders'] = increment(-1);
          updates['stats.completedOrders'] = increment(1);
          updates['stats.totalRevenue'] = increment(data.amount || 0);
          updates['stats.totalSales'] = increment(1);
          // Move from pending to completed
          if (data.orderId) {
            updates['dashboard.orders.completed'] = arrayUnion({
              id: data.orderId,
              productName: data.productName || 'Product',
              buyerName: data.buyerName || 'Buyer',
              amount: data.amount || 0,
              completedAt: Date.now()
            });
          }
          break;
          
        case 'product_viewed':
          // Track product views for popularity
          updates['stats.totalViews'] = increment(1);
          if (data.productName) {
            updates['dashboard.inventory.productViews'] = arrayUnion({
              productName: data.productName,
              viewedAt: Date.now(),
              viewerLocation: data.viewerLocation || 'Unknown'
            });
          }
          break;
          
        case 'buyer_contacted':
          updates['stats.totalBuyers'] = increment(1);
          updates['stats.totalInteractions'] = increment(1);
          break;
          
        case 'profile_updated':
          // Update profile fields
          if (data.fullName) updates.fullName = data.fullName;
          if (data.phone) updates.phone = data.phone;
          if (data.location) updates.location = data.location;
          if (data.farmSize) updates.farmSize = data.farmSize;
          if (data.farmType) updates.farmType = data.farmType;
          if (data.experience) updates.experience = data.experience;
          if (data.bio) updates.bio = data.bio;
          break;
          
        case 'achievement_unlocked':
          updates.achievements = arrayUnion(data.achievement);
          updates['stats.totalAchievements'] = increment(1);
          break;
          
        case 'weather_check':
          updates['stats.weatherChecks'] = increment(1);
          break;
          
        case 'marketplace_browse':
          updates['stats.marketplaceVisits'] = increment(1);
          break;
          
        case 'resource_viewed':
          updates['stats.resourcesViewed'] = increment(1);
          break;
          
        case 'login_attempt':
          updates['stats.loginAttempts'] = increment(1);
          break;
          
        case 'signup_attempt':
          updates['stats.signupAttempts'] = increment(1);
          break;
          
        case 'contact_submitted':
          updates['stats.contactSubmissions'] = increment(1);
          break;
      }
      
      // Apply updates to database
      await updateDoc(userRef, updates);
      
      // Update local profile
      userProfile = { ...userProfile, ...updates };
      if (updates['dashboard.recentActivity']) {
        userProfile.dashboard.recentActivity = updates['dashboard.recentActivity'];
      }
      
      // Update dashboard display immediately
      await updateDashboardDisplay();
      
      console.log(`Activity updated: ${activityType}`, data);
    }
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

// Generate human-readable activity text for display
function generateActivityDisplayText(activityType, data) {
  switch (activityType) {
    case 'product_added':
      return `Added new listing: ${data.productName} at ₵${data.price}`;
      
    case 'product_updated':
      return `Updated listing: ${data.newName} (was ${data.oldName})`;
      
    case 'product_deleted':
      return `Removed listing: ${data.productName}`;
      
    case 'order_received':
      return `New order for ${data.productName} from ${data.buyerName || 'Buyer'} in ${data.location || 'Unknown'}`;
      
    case 'order_completed':
      return `Completed order for ${data.productName} - ₵${data.amount} earned`;
      
    case 'product_viewed':
      return `${data.productName} listing was viewed ${data.viewCount || 1} time${data.viewCount > 1 ? 's' : ''} today`;
      
    case 'buyer_contacted':
      return `New buyer contact: ${data.buyerName || 'Buyer'} from ${data.location || 'Unknown'}`;
      
    case 'profile_updated':
      return `Profile updated successfully`;
      
    case 'achievement_unlocked':
      return `Achievement unlocked: ${data.achievement}`;
      
    case 'weather_check':
      return `Checked weather for ${data.location}`;
      
    case 'marketplace_browse':
      return `Browsed ${data.category} category in marketplace`;
      
    case 'resource_viewed':
      return `Viewed resource: ${data.resourceName}`;
      
    case 'login_attempt':
      return `Login attempt via ${data.method}`;
      
    case 'signup_attempt':
      return `Signup attempt via ${data.method}`;
      
    case 'contact_submitted':
      return `Contact form submitted`;
      
    default:
      return `Activity: ${activityType}`;
  }
}

// Update dashboard display with latest data
async function updateDashboardDisplay() {
  if (!userProfile) return;
  
  try {
    // Update stat cards
    updateStatCards();
    
    // Update recent activity
    updateRecentActivity();
    
    // Update financial summary
    updateFinancialSummary();
    
    // Update inventory summary
    updateInventorySummary();
    
  } catch (error) {
    console.error('Error updating dashboard display:', error);
  }
}

// Update stat cards with real-time data
function updateStatCards() {
  if (!userProfile || !userProfile.stats) return;
  
  const stats = userProfile.stats;
  
  // Update Total Listings
  const listingsEl = document.querySelector('.stats .card:nth-child(1) h3');
  if (listingsEl) listingsEl.textContent = stats.totalListings || 0;
  
  // Update Pending Orders
  const ordersEl = document.querySelector('.stats .card:nth-child(2) h3');
  if (ordersEl) ordersEl.textContent = stats.pendingOrders || 0;
  
  // Update Rating (calculate from reviews)
  const ratingEl = document.querySelector('.stats .card:nth-child(3) h3');
  if (ratingEl) {
    const rating = calculateRating(stats.customerReviews || []);
    ratingEl.textContent = rating.toFixed(1);
  }
  
  // Update Total Buyers
  const buyersEl = document.querySelector('.stats .card:nth-child(4) h3');
  if (buyersEl) buyersEl.textContent = stats.totalBuyers || 0;
}

// Calculate rating from customer reviews
function calculateRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  
  const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
  return totalRating / reviews.length;
}

// Update recent activity feed
function updateRecentActivity() {
  if (!userProfile || !userProfile.dashboard || !userProfile.dashboard.recentActivity) return;
  
  const activityContainer = document.querySelector('[data-activity]');
  if (!activityContainer) return;
  
  const activities = userProfile.dashboard.recentActivity;
  if (activities.length === 0) {
    activityContainer.innerHTML = '<p class="text-muted">No recent activity</p>';
    return;
  }
  
  // Show last 5 activities in reverse chronological order
  const recentActivities = activities.slice(-5).reverse();
  
  activityContainer.innerHTML = recentActivities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="ri-${activity.icon}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-text">${activity.displayText}</div>
        <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

// Update financial summary
function updateFinancialSummary() {
  if (!userProfile || !userProfile.dashboard || !userProfile.dashboard.financialSummary) return;
  
  const financialContainer = document.querySelector('[data-financial]');
  if (!financialContainer) return;
  
  const financial = userProfile.dashboard.financialSummary;
  
  financialContainer.innerHTML = `
    <div class="financial-grid">
      <div class="financial-item">
        <div class="financial-label">Monthly Revenue</div>
        <div class="financial-value">₵${financial.monthlyRevenue || 0}</div>
      </div>
      <div class="financial-item">
        <div class="financial-label">Monthly Expenses</div>
        <div class="financial-value">₵${financial.monthlyExpenses || 0}</div>
      </div>
      <div class="financial-item">
        <div class="financial-label">Profit Margin</div>
        <div class="financial-value">${financial.profitMargin || 0}%</div>
      </div>
    </div>
  `;
}

// Update inventory summary
function updateInventorySummary() {
  if (!userProfile || !userProfile.dashboard || !userProfile.dashboard.inventory) return;
  
  const inventoryContainer = document.querySelector('[data-inventory]');
  if (!inventoryContainer) return;
  
  const inventory = userProfile.dashboard.inventory;
  
  inventoryContainer.innerHTML = `
    <div class="inventory-summary">
      <div class="inventory-item">
        <div class="inventory-label">Total Products</div>
        <div class="inventory-value">${inventory.totalProducts || 0}</div>
      </div>
      <div class="inventory-item">
        <div class="inventory-label">Low Stock Items</div>
        <div class="inventory-value">${inventory.lowStockItems?.length || 0}</div>
      </div>
      <div class="inventory-item">
        <div class="inventory-label">Out of Stock</div>
        <div class="inventory-value">${inventory.outOfStockItems?.length || 0}</div>
      </div>
    </div>
  `;
}

// Function to load complete user profile with all dashboard data
async function loadCompleteUserProfile() {
  const { db, auth, doc, getDoc } = await initFirebase();
  const user = auth.currentUser;
  if (!user) return null;
  
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}





// Helper function to format activity types for display
function formatActivityType(type) {
  const typeMap = {
    'product_added': 'Added new product',
    'product_updated': 'Updated product',
    'product_deleted': 'Deleted product',
    'order_received': 'New order received',
    'order_completed': 'Order completed',
    'profile_updated': 'Profile updated',
    'achievement_unlocked': 'Achievement unlocked'
  };
  return typeMap[type] || type;
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}





/* Helpers */
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

// Add activity tracking for weather checks
async function trackWeatherCheck(location) {
  await updateUserActivity('weather_check', { location });
}

// Add activity tracking for marketplace browsing
async function trackMarketplaceBrowse(category) {
  await updateUserActivity('marketplace_browse', { category });
}

// Add activity tracking for resource views
async function trackResourceView(resourceType, resourceName) {
  await updateUserActivity('resource_viewed', { resourceType, resourceName });
}

// Add activity tracking for profile updates
async function trackProfileUpdate(updates) {
  await updateUserActivity('profile_updated', updates);
}

// Add activity tracking for achievements
async function trackAchievement(achievement) {
  await updateUserActivity('achievement_unlocked', { achievement });
}

// Add activity tracking for orders
async function trackOrderReceived(orderData) {
  await updateUserActivity('order_received', orderData);
}

async function trackOrderCompleted(orderData) {
  await updateUserActivity('order_completed', orderData);
}

// Track product view activity
async function trackProductView(productName, viewerLocation = 'Unknown') {
  await updateUserActivity('product_viewed', { 
    productName, 
    viewerLocation,
    viewCount: 1,
    timestamp: Date.now()
  });
}

// Track buyer contact activity
async function trackBuyerContact(buyerName, location, productName = null) {
  await updateUserActivity('buyer_contacted', { 
    buyerName, 
    location, 
    productName,
    timestamp: Date.now()
  });
}

// Track order activity with detailed information
async function trackOrderReceived(orderData) {
  await updateUserActivity('order_received', {
    orderId: orderData.id || Date.now(),
    productName: orderData.productName,
    buyerName: orderData.buyerName,
    location: orderData.location,
    amount: orderData.amount,
    quantity: orderData.quantity,
    timestamp: Date.now()
  });
}

// Track order completion with revenue
async function trackOrderCompleted(orderData) {
  await updateUserActivity('order_completed', {
    orderId: orderData.id,
    productName: orderData.productName,
    buyerName: orderData.buyerName,
    amount: orderData.amount,
    timestamp: Date.now()
  });
}

// Enhanced marketplace function with comprehensive tracking
function setupMarketplace() {
  const grid = el('#product-grid');
  if (!grid) return;
  
  ['#search-name', '#filter-category', '#filter-location'].forEach((s) => {
    const node = el(s);
    if (node) node.addEventListener('input', () => { 
      marketplacePage = 1; 
      renderProducts(); 
      // Track search activity
      trackMarketplaceBrowse('search');
    });
  });
  
  const loadMore = el('#load-more');
  if (loadMore) loadMore.addEventListener('click', () => { 
    marketplacePage += 1; 
    renderProducts(); 
    // Track pagination
    trackMarketplaceBrowse('pagination');
  });
  
  renderProducts();

  // Contact farmer popup with tracking
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.actions .btn');
    if (!btn) return;
    e.preventDefault();
    const card = e.target.closest('.product-card');
    const name = card?.querySelector('h3')?.textContent || 'Farmer';
    const location = card?.querySelector('.location')?.textContent || 'Unknown';
    
    // Track buyer contact
    trackBuyerContact(name, location);
    
    openModal(`<p>Contact <strong>${name}</strong> via:</p>
      <div class="flex">
        <a class="btn btn-secondary" href="tel:+233000000000"><i class="ri-phone-fill"></i> Phone</a>
        <a class="btn btn-outline" href="https://wa.me/233000000000" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp</a>
      </div>`, {
      title: 'Contact Farmer',
      actions: [{ label: 'Close', variant: 'btn-outline' }],
    });
  });



  // Add activity tracking for category browsing
  const categoryButtons = document.querySelectorAll('.category-btn');
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const category = btn.dataset.category;
      await trackMarketplaceBrowse(category);
    });
  });
  
  // Track product views when products are rendered
  const originalRenderProducts = window.renderProducts;
  if (originalRenderProducts) {
    window.renderProducts = function(...args) {
      const result = originalRenderProducts.apply(this, args);
      
      // Track product view for each displayed product
      const productCards = grid.querySelectorAll('.product-card');
      productCards.forEach(card => {
        const productName = card.querySelector('h3')?.textContent;
        if (productName) {
          trackProductView(productName, 'Marketplace');
        }
      });
      
      return result;
    };
  }
}

// Enhanced contact function with activity tracking
function setupContact() {
  const form = el('#contact-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Track contact form submission
    await updateUserActivity('contact_submitted', {
      timestamp: Date.now(),
      formType: 'contact',
      subject: form.querySelector('[name="subject"]')?.value || 'General Inquiry'
    });
    
    openModal('<p>Thanks for contacting FarmLink GH. We will reach out soon.</p>', {
      title: 'Message sent',
      actions: [{ label: 'OK', variant: 'btn-primary', onClick: (close) => { close(); } }],
    });
    showToast('Message sent successfully');
    form.reset();
  });
}

// Enhanced weather function with activity tracking
async function renderWeather(locationName = 'Accra') {
  const container = el('#weather-card');
  if (!container) return;
  
  try {
    // Track weather check activity
    await trackWeatherCheck(locationName);
    
    const coords = await geocodeLocation(locationName);
    const weather = await fetchWeather(coords.lat, coords.lon);
    
    el('[data-w-location]', container).textContent = coords.name;
    el('[data-w-temp]', container).textContent = `${weather.temp}°C`;
    el('[data-w-desc]', container).textContent = `${weather.desc} · Humidity ${weather.humidity}%`;
    const tip = el('[data-w-tip]', container);
    if (tip) {
      let message = 'Great day for farm work.';
      if ((weather.desc || '').toLowerCase().includes('rain')) message = 'Rain expected — cover harvested crops.';
      if (weather.temp >= 33) message = 'High heat — irrigate early morning or evening.';
      tip.textContent = message;
    }
    renderForecastGrids(weather.daily);
  } catch (error) {
    console.error('Weather error:', error);
    container.innerHTML = `<p class="error">Failed to load weather for ${locationName}</p>`;
  }
}

// Refresh dashboard stats with real-time data
async function refreshDashboardStats() {
  try {
    if (!currentUser) return;
    
    // Count actual products
    const actualProductCount = await countUserProducts();
    
    // Update database stats if they differ
    if (userProfile && actualProductCount !== (userProfile.stats?.totalListings || 0)) {
      await updateUserStats({
        totalListings: actualProductCount,
        totalProducts: actualProductCount
      });
      
      // Update local profile
      userProfile.stats = userProfile.stats || {};
      userProfile.stats.totalListings = actualProductCount;
      userProfile.dashboard = userProfile.dashboard || {};
      userProfile.dashboard.inventory = userProfile.dashboard.inventory || {};
      userProfile.dashboard.inventory.totalProducts = actualProductCount;
    }
    
    // Update dashboard display
    await updateDashboardDisplay();
    
    console.log('Dashboard stats refreshed:', {
      totalListings: actualProductCount,
      userProfileStats: userProfile?.stats?.totalListings
    });
    
  } catch (error) {
    console.error('Error refreshing dashboard stats:', error);
  }
}

// Enhanced updateUserActivity to refresh dashboard after updates
async function updateUserActivity(activityType, data = {}) {
  if (!currentUser || !userProfile) {
    console.log('No user logged in, skipping activity update');
    return;
  }
  
  try {
    if (window.farmLinkAuth && window.farmLinkAuth.db) {
      // Dynamically import Firebase functions
      const { doc, updateDoc, arrayUnion, increment } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const userRef = doc(window.farmLinkAuth.db, 'users', currentUser.uid);
      
      // Create detailed activity entry with rich information
      const activityEntry = {
        type: activityType,
        data: data,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        displayText: generateActivityDisplayText(activityType, data),
        icon: getActivityIcon(activityType)
      };
      
      // Update user profile with comprehensive changes
      const updates = {
        lastActive: Date.now(),
        [`dashboard.recentActivity`]: arrayUnion(activityEntry)
      };
      
      // Update specific stats based on activity type
      switch (activityType) {
        case 'product_added':
          updates['stats.totalListings'] = increment(1);
          updates['dashboard.inventory.totalProducts'] = increment(1);
          break;
          
        case 'product_updated':
          // No count change, just activity log
          break;
          
        case 'product_deleted':
          updates['stats.totalListings'] = increment(-1);
          updates['dashboard.inventory.totalProducts'] = increment(-1);
          break;
          
        case 'order_received':
          updates['stats.pendingOrders'] = increment(1);
          updates['stats.totalOrders'] = increment(1);
          break;
          
        case 'order_completed':
          updates['stats.pendingOrders'] = increment(-1);
          updates['stats.completedOrders'] = increment(1);
          updates['stats.totalRevenue'] = increment(data.amount || 0);
          updates['stats.totalSales'] = increment(1);
          break;
          
        case 'product_viewed':
          updates['stats.totalViews'] = increment(1);
          break;
          
        case 'buyer_contacted':
          updates['stats.totalBuyers'] = increment(1);
          updates['stats.totalInteractions'] = increment(1);
          break;
          
        case 'profile_updated':
          // Update profile fields
          if (data.fullName) updates.fullName = data.fullName;
          if (data.phone) updates.phone = data.phone;
          if (data.location) updates.location = data.location;
          if (data.farmSize) updates.farmSize = data.farmSize;
          if (data.farmType) updates.farmType = data.farmType;
          if (data.experience) updates.experience = data.experience;
          if (data.bio) updates.bio = data.bio;
          break;
          
        case 'achievement_unlocked':
          updates.achievements = arrayUnion(data.achievement);
          updates['stats.totalAchievements'] = increment(1);
          break;
          
        case 'weather_check':
          updates['stats.weatherChecks'] = increment(1);
          break;
          
        case 'marketplace_browse':
          updates['stats.marketplaceVisits'] = increment(1);
          break;
          
        case 'resource_viewed':
          updates['stats.resourcesViewed'] = increment(1);
          break;
      }
      
      // Apply updates to database
      await updateDoc(userRef, updates);
      
      // Update local profile
      userProfile = { ...userProfile, ...updates };
      if (updates['dashboard.recentActivity']) {
        userProfile.dashboard.recentActivity = updates['dashboard.recentActivity'];
      }
      
      // Refresh dashboard stats to ensure accuracy
      await refreshDashboardStats();
      
      console.log(`Activity updated: ${activityType}`, data);
    }
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

// Load complete user profile from database
async function loadCompleteUserProfile() {
  if (!currentUser) return null;
  
  try {
    if (window.farmLinkAuth) {
      return await window.farmLinkAuth.getUserProfile(currentUser.uid);
    }
  } catch (error) {
    console.error('Error loading complete user profile:', error);
  }
  return null;
}

// Load user profile into dashboard


// Count actual products from user's products collection
async function countUserProducts() {
  try {
    if (window.farmLinkAuth && window.farmLinkAuth.db) {
      const { collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const productsRef = collection(window.farmLinkAuth.db, 'users', currentUser.uid, 'products');
      const snapshot = await getDocs(productsRef);
      
      return snapshot.size; // This gives us the actual count
    }
    return 0;
  } catch (error) {
    console.error('Error counting user products:', error);
    return 0;
  }
}

// Update user stats in database
async function updateUserStats(statsUpdate) {
  try {
    if (window.farmLinkAuth && window.farmLinkAuth.db) {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      
      const userRef = doc(window.farmLinkAuth.db, 'users', currentUser.uid);
      
      const updates = {};
      Object.keys(statsUpdate).forEach(key => {
        updates[`stats.${key}`] = statsUpdate[key];
      });
      
      await updateDoc(userRef, updates);
      console.log('User stats updated:', statsUpdate);
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// Load dashboard sections with user data
async function loadDashboardSections(profile) {
  if (!profile || !profile.dashboard) return;
  
  try {
    // Load recent activity
    const activityContainer = document.querySelector('[data-activity]');
    if (activityContainer && profile.dashboard.recentActivity) {
      loadRecentActivity(activityContainer, profile.dashboard.recentActivity);
    }
    
    // Load financial summary
    const financialContainer = document.querySelector('[data-financial]');
    if (financialContainer && profile.dashboard.financialSummary) {
      loadFinancialSummary(financialContainer, profile.dashboard.financialSummary);
    }
    
    // Load inventory
    const inventoryContainer = document.querySelector('[data-inventory]');
    if (inventoryContainer && profile.dashboard.inventory) {
      loadInventory(inventoryContainer, profile.dashboard.inventory);
    }
    
  } catch (error) {
    console.error('Error loading dashboard sections:', error);
  }
}

// Load recent activity
function loadRecentActivity(container, activities) {
  if (!activities || activities.length === 0) {
    container.innerHTML = '<p class="text-muted">No recent activity</p>';
    return;
  }
  
  const recentActivities = activities.slice(-5).reverse(); // Show last 5 activities
  container.innerHTML = recentActivities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon">
        <i class="ri-${getActivityIcon(activity.type)}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-text">${formatActivityType(activity.type)}</div>
        <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

// Load financial summary
function loadFinancialSummary(container, financial) {
  container.innerHTML = `
    <div class="financial-grid">
      <div class="financial-item">
        <div class="financial-label">Monthly Revenue</div>
        <div class="financial-value">₵${financial.monthlyRevenue || 0}</div>
      </div>
      <div class="financial-item">
        <div class="financial-label">Monthly Expenses</div>
        <div class="financial-value">₵${financial.monthlyExpenses || 0}</div>
      </div>
      <div class="financial-item">
        <div class="financial-label">Profit Margin</div>
        <div class="financial-value">${financial.profitMargin || 0}%</div>
      </div>
    </div>
  `;
}

// Load inventory
function loadInventory(container, inventory) {
  container.innerHTML = `
    <div class="inventory-summary">
      <div class="inventory-item">
        <div class="inventory-label">Total Products</div>
        <div class="inventory-value">${inventory.totalProducts || 0}</div>
      </div>
      <div class="inventory-item">
        <div class="inventory-label">Low Stock Items</div>
        <div class="inventory-value">${inventory.lowStockItems?.length || 0}</div>
      </div>
      <div class="inventory-item">
        <div class="inventory-label">Out of Stock</div>
        <div class="inventory-value">${inventory.outOfStockItems?.length || 0}</div>
      </div>
    </div>
  `;
}

// Get activity icon based on type
function getActivityIcon(activityType) {
  const iconMap = {
    'product_added': 'add-line',
    'product_updated': 'edit-line',
    'product_deleted': 'delete-bin-line',
    'order_received': 'shopping-cart-line',
    'order_completed': 'check-line',
    'profile_updated': 'user-settings-line',
    'achievement_unlocked': 'medal-line',
    'weather_check': 'sun-line',
    'marketplace_browse': 'store-line',
    'resource_viewed': 'book-open-line',
    'login_attempt': 'login-box-line',
    'signup_attempt': 'user-add-line',
    'contact_submitted': 'mail-send-line'
  };
  return iconMap[activityType] || 'information-line';
}

// Format activity type for display
function formatActivityType(activityType) {
  const typeMap = {
    'product_added': 'Product Added',
    'product_updated': 'Product Updated',
    'product_deleted': 'Product Deleted',
    'order_received': 'Order Received',
    'order_completed': 'Order Completed',
    'profile_updated': 'Profile Updated',
    'achievement_unlocked': 'Achievement Unlocked',
    'weather_check': 'Weather Checked',
    'marketplace_browse': 'Marketplace Browsed',
    'resource_viewed': 'Resource Viewed',
    'login_attempt': 'Login Attempt',
    'signup_attempt': 'Signup Attempt',
    'contact_submitted': 'Contact Form Submitted'
  };
  return typeMap[activityType] || 'Activity Performed';
}

// Format time ago
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Refresh dashboard stats with real-time data
async function refreshDashboardStats() {
  try {
    if (!currentUser) return;
    
    // Count actual products
    const actualProductCount = await countUserProducts();
    
    // Update database stats if they differ
    if (userProfile && actualProductCount !== (userProfile.stats?.totalListings || 0)) {
      await updateUserStats({
        totalListings: actualProductCount,
        totalProducts: actualProductCount
      });
      
      // Update local profile
      userProfile.stats = userProfile.stats || {};
      userProfile.stats.totalListings = actualProductCount;
      userProfile.dashboard = userProfile.dashboard || {};
      userProfile.dashboard.inventory = userProfile.dashboard.inventory || {};
      userProfile.dashboard.inventory.totalProducts = actualProductCount;
    }
    
    // Update dashboard display
    await updateDashboardDisplay();
    
    console.log('Dashboard stats refreshed:', {
      totalListings: actualProductCount,
      userProfileStats: userProfile?.stats?.totalListings
    });
    
  } catch (error) {
    console.error('Error refreshing dashboard stats:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderWeather('Accra');
  setupWeatherSearch();
  setupMarketplace();
  setupContact();
  setupAuth();
  setupMobileMenu();
  initApp(); // Initialize the main application script
});

