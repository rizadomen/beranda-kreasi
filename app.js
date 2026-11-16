(function () {
  'use strict';

  // GANTI DENGAN URL DEPLOYMENT /exec DARI GOOGLE APPS SCRIPT LO
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec';

  const $ = id => document.getElementById(id);
  const THEME_KEY = 'wvh_client_theme';
  let clientVenues = [];

  async function api(action, payload) {
    if (!GAS_API_URL || GAS_API_URL.includes('GANTI_DENGAN_ID_DEPLOY_LO')) {
      console.warn('GAS_API_URL belum dikonfigurasi!');
      return { status: 'GAGAL', message: 'Backend API URL belum dikonfigurasi.' };
    }
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload || {} })
    });
    if (!response.ok) throw new Error('Gagal menghubungi server backend.');
    return await response.json();
  }

  function applyTheme(theme) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    const icon = $('themeToggleIcon');
    if (icon) icon.textContent = nextTheme === 'dark' ? '☀' : '☾';
  }

  function initTheme() {
    let savedTheme = 'dark';
    try { const stored = localStorage.getItem(THEME_KEY); if (stored) savedTheme = stored; } catch (_) {}
    applyTheme(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try { localStorage.setItem(THEME_KEY, nextTheme); } catch (_) {}
  }

  function formatRupiah(amount) {
    if (amount == null || !Number.isFinite(Number(amount))) return 'Hubungi Admin';
    return 'Rp' + Math.round(Number(amount)).toLocaleString('id-ID');
  }

  function renderVenueList(venues) {
    const host = $('venueList');
    if (!host) return;
    host.replaceChildren();

    (Array.isArray(venues) ? venues : []).forEach(v => {
      const card = document.createElement('article');
      card.className = 'venue-card';

      const img = document.createElement('img');
      img.className = 'venue-card-cover';
      img.src = v.coverUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80';
      img.alt = v.name || 'Venue';

      const body = document.createElement('div');
      body.className = 'venue-card-body';

      const title = document.createElement('h3');
      title.textContent = v.name || 'Venue Pernikahan';

      const city = document.createElement('p');
      city.textContent = v.city || 'Lokasi';

      const price = document.createElement('p');
      price.className = 'venue-card-price';
      price.textContent = formatRupiah(v.price);

      const address = document.createElement('div');
      address.className = 'address';
      address.textContent = v.address || '';

      body.append(title, city, price, address);
      card.append(img, body);
      host.appendChild(card);
    });
  }

  async function loadVenues() {
    $('venueLoading')?.classList.remove('hidden');
    $('venueList')?.classList.add('hidden');
    try {
      const res = await api('listVenues', {});
      if (!res || res.status !== 'BERHASIL') throw new Error(res?.message || 'Gagal memuat venue.');
      clientVenues = Array.isArray(res.venues) ? res.venues : [];
      renderVenueList(clientVenues);
      $('venueLoading')?.classList.add('hidden');
      $('venueList')?.classList.remove('hidden');
    } catch (err) {
      $('venueLoading')?.classList.add('hidden');
      $('venueError')?.classList.remove('hidden');
    }
  }

  function init() {
    initTheme();
    $('themeToggle')?.addEventListener('click', toggleTheme);
    loadVenues();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
