(function () {
  'use strict';

  // GANTI URL INI DENGAN URL DEPLOYMENT /exec DARI GOOGLE APPS SCRIPT LO
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwFVLnoKqIG0YxhtBQXKdqT9zHgl9myRtBXvvYpJMRYu9cEStFQwhMxWQAoYCt5ki1gRQ/exec';

  const urlParams = new URLSearchParams(window.location.search);
  const SERVER_MODE = urlParams.get('mode') || 'client';
  const SERVER_TOKEN = urlParams.get('token') || '';

  const SESSION_KEY = 'wvh_client_session';
  const POPUP_DISMISSED_KEY = 'wvh_service_popup_dismissed';
  let portalSettings = { whatsapp: '', bannerUrl: '', popupUrl: '' };
  let selectedVenueId = '';
  let activeInquiryType = 'HUBUNGI_ADMIN';
  let userSavedVenueIds = [];

  const firebaseConfig = {
    apiKey: "AIzaSyDjLj3yamNIA1EAFRNochuPprh7qfyvc0A",
    authDomain: "wedding-venue-hub-web.firebaseapp.com",
    projectId: "wedding-venue-hub-web",
    storageBucket: "wedding-venue-hub-web.firebasestorage.app",
    messagingSenderId: "152408110785",
    appId: "1:152408110785:web:554d11f671918172f60640",
    measurementId: "G-VYS2PV8SNE"
  };

  const $ = id => document.getElementById(id);
  const THEME_KEY = 'wvh_client_theme';

  let auth = null, busy = false, clientVenues = [], venueRequestId = 0;
  let currentClientPage = 'home';
  let returnClientPage = 'results';
  let nearestVenueMode = false;
  let currentLightboxMedia = [], currentLightboxIndex = 0;

  // --- API BRIDGE (Fetch ke Google Apps Script REST API) ---
  async function api(action, payload) {
    if (!GAS_API_URL || GAS_API_URL.includes('GANTI_DENGAN_ID_DEPLOY_LO')) {
      console.warn('GAS_API_URL belum dikonfigurasi! Menggunakan mode simulasi/offline.');
      return { status: 'GAGAL', message: 'Backend API URL belum dikonfigurasi di app.js.' };
    }

    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    });

    if (!response.ok) {
      throw new Error('Gagal menghubungi server backend (HTTP ' + response.status + ')');
    }
    return await response.json();
  }

  // --- THEME ---
  function applyTheme(theme) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    const icon = $('themeToggleIcon');
    const label = $('themeToggleLabel');
    const toggle = $('themeToggle');
    if (icon) icon.textContent = nextTheme === 'dark' ? '☀' : '☾';
    if (label) label.textContent = nextTheme === 'dark' ? 'Mode terang' : 'Mode gelap';
    if (toggle) {
      const description = nextTheme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap';
      toggle.setAttribute('aria-label', description);
      toggle.setAttribute('title', description);
    }
  }

  function initTheme() {
    let savedTheme = 'dark';
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') savedTheme = stored;
    } catch (_) {}
    applyTheme(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try { localStorage.setItem(THEME_KEY, nextTheme); } catch (_) {}
  }

  // --- NOTICES & UI STATE ---
  function notice(message, type, target) {
    const el = $(target || 'notice');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'notice' + (message ? ' show ' + (type || 'info') : '');
  }
  function hideNotice(target) { notice('', '', target || 'notice'); }

  function setBusy(value, message) {
    busy = value;
    ['loginBtn','createBtn','activateBtn','resetBtn','logoutBtn','refreshVenueBtn','retryVenueBtn'].forEach(id => {
      if ($(id)) $(id).disabled = value;
    });
    if (message) notice(message, 'info');
  }

  function friendlyError(error) {
    const code = error && error.code || '';
    const map = {
      'auth/invalid-email':'Format email tidak valid.',
      'auth/user-not-found':'Akun Firebase tidak ditemukan.',
      'auth/wrong-password':'Email atau password salah.',
      'auth/invalid-credential':'Email atau password salah.',
      'auth/email-already-in-use':'Email sudah terdaftar. Gunakan login dengan akun yang ada.',
      'auth/weak-password':'Password terlalu lemah. Gunakan minimal 6 karakter.',
      'auth/too-many-requests':'Terlalu banyak percobaan. Coba lagi nanti.',
      'auth/network-request-failed':'Koneksi internet bermasalah.'
    };
    return map[code] || (error && error.message) || 'Permintaan gagal. Silakan coba kembali.';
  }

  function showLogin() {
    $('authView')?.classList.remove('hidden');
    $('dashboardView')?.classList.add('hidden');
    $('portalBanner')?.classList.add('hidden');
    $('servicePopup')?.classList.add('hidden');
    $('loginForm')?.classList.remove('hidden');
    $('activationActions')?.classList.add('hidden');
    $('resetBtn')?.classList.remove('hidden');
  }

  function showActivation() {
    showLogin();
    $('activationActions')?.classList.remove('hidden');
    $('resetBtn')?.classList.add('hidden');
    if ($('formTitle')) $('formTitle').textContent = 'Aktivasi akun klien';
    if ($('formDesc')) $('formDesc').textContent = 'Buat dan verifikasi akun menggunakan email undangan.';
    if ($('loginBtn')) $('loginBtn').textContent = 'Masuk dengan Akun yang Ada';
  }

  function showDashboard(user) {
    $('authView')?.classList.add('hidden');
    $('dashboardView')?.classList.remove('hidden');
    if ($('welcomeTitle')) $('welcomeTitle').textContent = 'Halo, ' + (user && user.name || 'Klien') + '!';
    if ($('profileName')) $('profileName').textContent = user && user.name || '—';
    if ($('profileEmail')) $('profileEmail').textContent = user && user.email || '—';
    if ($('profileStatus')) $('profileStatus').textContent = user && user.status || 'Aktif';
  }

  function cleanUrl(value) {
    const s = String(value || '').trim();
    try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : ''; } catch (_) { return ''; }
  }

  function field(obj, keys, fallback) {
    for (const key of keys) if (obj && obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
    return fallback || '';
  }

  function showVenueState(state) {
    ['venueLoading','venueEmpty','venueError','venueList','venueContent'].forEach(id => $(id)?.classList.add('hidden'));
    $(state)?.classList.remove('hidden');
  }

  function parsePriceInfo(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return { amount: null, guests: null, note: '' };
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const amount = obj.amount === '' || obj.amount == null ? null : Number(obj.amount);
        const guests = obj.guests === '' || obj.guests == null ? null : Number(obj.guests);
        return {
          amount: Number.isSafeInteger(amount) && amount >= 0 ? amount : null,
          guests: Number.isInteger(guests) && guests > 0 ? guests : null,
          note: String(obj.note || '')
        };
      }
    } catch (_) {}
    const digits = raw.replace(/\D/g, '');
    const amount = digits ? Number(digits) : null;
    return { amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null, guests: null, note: raw };
  }

  function formatRupiah(amount) {
    if (amount == null || !Number.isFinite(Number(amount))) return '';
    return 'Rp' + Math.round(Number(amount)).toLocaleString('id-ID');
  }

  function getPriceDisplayParts(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return { amount: 'Harga belum tersedia', guests: '', note: '' };
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (_) {}
    if (!parsed || typeof parsed !== 'object') return { amount: raw, guests: '', note: '' };
    const p = parsePriceInfo(raw);
    return {
      amount: p.amount == null ? (p.note || 'Harga belum tersedia') : formatRupiah(p.amount),
      guests: p.guests == null ? '' : 'Paket untuk ' + p.guests.toLocaleString('id-ID') + ' tamu / pax',
      note: p.note || ''
    };
  }

  function getVenuePriceAmount(v) {
    return parsePriceInfo(field(v, ['priceInfo','HARGA_INFO','hargaInfo'], '')).amount;
  }

  function imageDisplayUrl(media) {
    const raw = cleanUrl(media && (media.url || media.URL_TAMPIL));
    if (!raw) return '';
    try {
      const u = new URL(raw);
      if (u.hostname === 'drive.google.com') {
        let parsedId = u.searchParams.get('id') || '';
        if (!parsedId) {
          const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/i);
          if (pathMatch) parsedId = pathMatch[1];
        }
        const fileId = String((media && (media.fileId || media.FILE_ID)) || parsedId || '').trim();
        if (fileId) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1600';
      }
    } catch (_) {}
    return raw;
  }

  // --- VENUE RENDERING ---
  function renderVenueList(venues, targetId) {
    const host = $(targetId || 'venueList');
    if (!host) return;
    host.replaceChildren();

    (Array.isArray(venues) ? venues : []).forEach(v => {
      const id = String(field(v, ['venueId','id','ID_VENUE'], '')).trim();
      if (!id) return;

      const card = document.createElement('article');
      card.className = 'venue-card';
      const cover = v.cover || v.coverMedia || null;

      if (cover && (cover.url || cover.URL_TAMPIL || cover.fileId || cover.FILE_ID)) {
        const img = document.createElement('img');
        img.className = 'venue-card-cover';
        img.src = imageDisplayUrl(cover);
        img.alt = cover.altText || cover.name || 'Foto venue';
        img.loading = 'lazy';
        img.onerror = () => {
          const placeholder = document.createElement('div');
          placeholder.className = 'venue-card-cover-placeholder';
          placeholder.textContent = 'Foto venue belum dapat dimuat';
          img.replaceWith(placeholder);
        };
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'venue-card-cover-placeholder';
        placeholder.textContent = 'Foto venue belum tersedia';
        card.appendChild(placeholder);
      }

      const body = document.createElement('div');
      body.className = 'venue-card-body';

      const title = document.createElement('h3');
      title.textContent = field(v, ['name','NAMA_VENUE','nama'], 'Venue');

      const city = document.createElement('p');
      city.textContent = field(v, ['city','KOTA'], 'Lokasi belum tersedia');

      const priceParts = getPriceDisplayParts(field(v, ['priceInfo','HARGA_INFO','hargaInfo'], ''));
      const price = document.createElement('p');
      price.className = 'venue-card-price';
      price.textContent = priceParts.amount;

      const address = document.createElement('div');
      address.className = 'address';
      address.textContent = field(v, ['address','ALAMAT'], 'Alamat belum tersedia');

      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.type = 'button';
      btn.textContent = 'Lihat detail';
      btn.addEventListener('click', () => {
        returnClientPage = currentClientPage === 'home' ? 'home' : 'results';
        loadVenueDetail(sessionStorage.getItem(SESSION_KEY), id);
      });

      body.append(title, city, price, address, btn);
      card.appendChild(body);
      host.appendChild(card);
    });
  }

  function showClientPage(page) {
    currentClientPage = page;
    $('clientHomeView')?.classList.toggle('hidden', page !== 'home');
    $('clientResultsToolbar')?.classList.toggle('hidden', page !== 'results');
    $('venueFilters')?.classList.add('hidden');
    if (page !== 'detail') $('venueContent')?.classList.add('hidden');
    if (page === 'home') {
      $('venueList')?.classList.add('hidden');
      if ($('venueFilterEmpty')) $('venueFilterEmpty').hidden = true;
    }
    if (page === 'results') $('venueList')?.classList.remove('hidden');
  }

  function renderHomeRecommendations() {
    const host = $('homeRecommendationList');
    const empty = $('homeRecommendationEmpty');
    if (!host) return;
    const recommendations = clientVenues.filter(item =>
      item.isHomeRecommended === true ||
      ['TRUE', '1', 'YA', 'YES'].includes(String(item.isHomeRecommended ?? item.REKOMENDASI_HOME ?? '').trim().toUpperCase())
    ).slice(0, 8);
    renderVenueList(recommendations, 'homeRecommendationList');
    if (empty) empty.classList.toggle('hidden', recommendations.length > 0);
  }

  function normalizeClientValue(v) {
    return String(v || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id');
  }

  function filterClientVenues(options) {
    const settings = options || {};
    const keyword = normalizeClientValue($('homeKeyword')?.value);
    const city = normalizeClientValue($('homeCity')?.value);
    const sortMode = $('resultsPriceSort')?.value || '';

    let results = clientVenues.filter(item => {
      const name = field(item, ['NAMA_VENUE','name','nama'], '');
      const address = field(item, ['ALAMAT','address','alamat'], '');
      const itemCity = field(item, ['KOTA','city','kota'], '');
      const searchText = normalizeClientValue(`${name} ${address} ${itemCity}`);
      if (keyword && !searchText.includes(keyword)) return false;
      if (city && normalizeClientValue(itemCity) !== city) return false;
      return true;
    });

    if (sortMode) {
      results.sort((a, b) => {
        const pa = getVenuePriceAmount(a);
        const pb = getVenuePriceAmount(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return sortMode === 'asc' ? pa - pb : pb - pa;
      });
    }

    renderVenueList(results);
    if ($('resultsCount')) $('resultsCount').textContent = `${results.length} dari ${clientVenues.length} venue`;
    if ($('resultsDescription')) $('resultsDescription').textContent = settings.description || 'Hasil pencarian.';
    if ($('venueFilterEmpty')) $('venueFilterEmpty').hidden = results.length > 0;
    showVenueState('venueList');
    showClientPage('results');
  }

  async function loadVenues(token) {
    const request = ++venueRequestId;
    if (!token) {
      notice('Sesi tidak ditemukan. Silakan login kembali.', 'error', 'venueNotice');
      showVenueState('venueError');
      return;
    }
    showVenueState('venueLoading');
    hideNotice('venueNotice');

    try {
      const res = await api('listVenues', { sessionToken: token });
      if (request !== venueRequestId) return;
      if (!res || res.status !== 'BERHASIL') throw new Error(res && res.message || 'Daftar venue gagal dimuat.');

      clientVenues = Array.isArray(res.venues) ? res.venues : [];
      renderHomeRecommendations();

      if (clientVenues.length) {
        showVenueState('venueList');
        showClientPage('home');
      } else {
        showVenueState('venueEmpty');
        showClientPage('home');
      }
    } catch (err) {
      if (request !== venueRequestId) return;
      showVenueState('venueError');
      notice(err.message || 'Daftar venue gagal dimuat.', 'error', 'venueNotice');
    }
  }

  async function loadVenueDetail(token, id) {
    selectedVenueId = String(id || '');
    showClientPage('detail');
    showVenueState('venueLoading');
    try {
      const [vr, mr] = await Promise.all([
        api('getVenue', { sessionToken: token, venueId: id }),
        api('listMedia', { sessionToken: token, venueId: id })
      ]);
      if (!vr || vr.status !== 'BERHASIL' || !vr.venue) throw new Error(vr?.message || 'Detail gagal dimuat.');
      const v = vr.venue;
      if ($('venueName')) $('venueName').textContent = field(v, ['NAMA_VENUE','name'], 'Venue');
      if ($('venueAddress')) $('venueAddress').textContent = field(v, ['ALAMAT','address'], '—');
      if ($('venueDescription')) $('venueDescription').textContent = field(v, ['DESKRIPSI','description'], '—');
      if ($('venueCity')) $('venueCity').textContent = field(v, ['KOTA','city'], '—');
      if ($('venueCapacity')) $('venueCapacity').textContent = field(v, ['KAPASITAS','capacity'], '—');
      const detailPrice = getPriceDisplayParts(field(v, ['HARGA_INFO','priceInfo'], ''));
      if ($('venuePrice')) $('venuePrice').textContent = detailPrice.amount;
      if ($('venueContact')) $('venueContact').textContent = field(v, ['KONTAK','contact'], '—');
      if ($('venueFacilities')) $('venueFacilities').textContent = field(v, ['FASILITAS','facilities'], '—');
      showVenueState('venueContent');
    } catch (err) {
      showVenueState('venueError');
      notice(err.message, 'error', 'venueNotice');
    }
  }

  // --- AUTHENTICATION ---
  async function handleLogin(event) {
    event.preventDefault();
    if (busy) return;
    const email = $('email').value.trim().toLowerCase();
    const password = $('password').value;
    if (!email || !password) { notice('Email dan password wajib diisi.', 'error'); return; }
    setBusy(true, 'Memverifikasi akun...');
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      const cred = await auth.signInWithEmailAndPassword(email, password);
      await cred.user.reload();
      if (!cred.user.emailVerified) { notice('Email belum diverifikasi.', 'error'); return; }
      const idToken = await cred.user.getIdToken(true);
      const res = await api('login', { idToken });
      if (!res || res.status !== 'BERHASIL' || !res.sessionToken) throw new Error(res?.message || 'Login ditolak.');
      sessionStorage.setItem(SESSION_KEY, res.sessionToken);
      showDashboard(res.user);
      await loadVenues(res.sessionToken);
    } catch (err) {
      notice(friendlyError(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function restoreSession() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) { showLogin(); return; }
    try {
      const res = await api('validateSession', { sessionToken: token });
      if (res && res.status === 'BERHASIL' && res.user) {
        showDashboard(res.user);
        await loadVenues(token);
        return;
      }
    } catch (_) {}
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  }

  async function logout() {
    if (busy) return;
    const token = sessionStorage.getItem(SESSION_KEY);
    setBusy(true, 'Mengakhiri sesi...');
    try { if (token) await api('logout', { sessionToken: token }); } catch (_) {}
    try { if (auth && auth.currentUser) await auth.signOut(); } catch (_) {}
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
    notice('Anda sudah keluar dari portal.', 'success');
    setBusy(false);
  }

  function init() {
    initTheme();
    if (window.firebase && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
    }

    $('themeToggle')?.addEventListener('click', toggleTheme);
    $('loginForm')?.addEventListener('submit', handleLogin);
    $('logoutBtn')?.addEventListener('click', logout);
    $('homeSearchBtn')?.addEventListener('click', () => filterClientVenues());
    $('homeSeeAllBtn')?.addEventListener('click', () => {
      if ($('homeKeyword')) $('homeKeyword').value = '';
      filterClientVenues({ description: 'Semua venue yang tersedia.' });
    });
    $('resultsBackHomeBtn')?.addEventListener('click', () => {
      showVenueState('venueList');
      showClientPage('home');
    });
    $('backVenueListBtn')?.addEventListener('click', () => {
      if (returnClientPage === 'home') { showVenueState('venueList'); showClientPage('home'); }
      else filterClientVenues();
    });

    if (SERVER_MODE === 'activate') showActivation();
    else restoreSession();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
