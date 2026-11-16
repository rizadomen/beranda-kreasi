(function () {
  'use strict';

  // GANTI DENGAN URL DEPLOYMENT /exec DARI GOOGLE APPS SCRIPT LO
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec';

  const $ = id => document.getElementById(id);
  const THEME_KEY = 'wvh_client_theme';
  let allVenues = [];
  let currentFilter = { search: '', city: '', jenis: '' };

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
    if (amount == null || !Number.isFinite(Number(amount)) || amount === 0) return 'Hubungi Admin';
    return 'Rp' + Math.round(Number(amount)).toLocaleString('id-ID');
  }

  // --- RENDER KATALOG & REKOMENDASI ---
  function renderVenues(venues) {
    const host = $('venueList');
    if (!host) return;
    host.replaceChildren();

    if (!venues || venues.length === 0) {
      host.innerHTML = '<p class="no-data">Tidak ada venue yang ditemukan sesuai filter.</p>';
      return;
    }

    venues.forEach(v => {
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
      city.className = 'venue-city';
      city.textContent = `📍 ${v.city || 'Lokasi'} (${v.jenisVenue || 'Indoor'})`;

      const price = document.createElement('p');
      price.className = 'venue-card-price';
      price.textContent = formatRupiah(v.price);

      const capacity = document.createElement('p');
      capacity.className = 'venue-capacity';
      capacity.textContent = `👥 Kapasitas: ${v.capacity ? v.capacity + ' Orang' : '—'}`;

      const btnDetail = document.createElement('button');
      btnDetail.className = 'btn-detail';
      btnDetail.textContent = 'Lihat Detail & Tanya Venue';
      btnDetail.onclick = () => openVenueDetail(v);

      body.append(title, city, capacity, price, btnDetail);
      card.append(img, body);
      host.appendChild(card);
    });
  }

  // --- FILTER & PENCARIAN AKTIF ---
  function filterAndRender() {
    let filtered = allVenues.filter(v => {
      const matchSearch = !currentFilter.search || 
        v.name.toLowerCase().includes(currentFilter.search.toLowerCase()) || 
        v.city.toLowerCase().includes(currentFilter.search.toLowerCase()) ||
        v.address.toLowerCase().includes(currentFilter.search.toLowerCase());
      
      const matchCity = !currentFilter.city || v.city.toLowerCase() === currentFilter.city.toLowerCase();
      const matchJenis = !currentFilter.jenis || v.jenisVenue.toLowerCase() === currentFilter.jenis.toLowerCase();

      return matchSearch && matchCity && matchJenis;
    });

    renderVenues(filtered);
  }

  function setupFilters() {
    const searchInput = $('searchQuery');
    const citySelect = $('filterCity');
    const jenisSelect = $('filterJenis');

    if (searchInput) {
      searchInput.oninput = e => {
        currentFilter.search = e.target.value.trim();
        filterAndRender();
      };
    }

    if (citySelect) {
      // Populate unique cities
      const cities = [...new Set(allVenues.map(v => v.city).filter(Boolean))];
      cities.sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        citySelect.appendChild(opt);
      });

      citySelect.onchange = e => {
        currentFilter.city = e.target.value;
        filterAndRender();
      };
    }

    if (jenisSelect) {
      jenisSelect.onchange = e => {
        currentFilter.jenis = e.target.value;
        filterAndRender();
      };
    }
  }

  // --- MODAL DETAIL VENUE & LEADS FORM ---
  function openVenueDetail(v) {
    let modal = $('venueDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'venueDetailModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" id="closeModalBtn">&times;</button>
        <img src="${v.coverUrl}" alt="${v.name}" class="modal-img">
        <h2>${v.name}</h2>
        <p><strong>Kota:</strong> ${v.city}</p>
        <p><strong>Alamat:</strong> ${v.address || '—'}</p>
        <p><strong>Jenis Venue:</strong> ${v.jenisVenue}</p>
        <p><strong>Kapasitas:</strong> ${v.capacity ? v.capacity + ' Tamu' : '—'}</p>
        <p><strong>Perkiraan Harga:</strong> <span class="price-tag">${formatRupiah(v.price)}</span></p>
        <div class="modal-actions">
          <a href="${v.mapsUrl}" target="_blank" class="btn-maps">Buka Google Maps</a>
        </div>
        <hr style="margin: 20px 0; border:0; border-top:1px solid var(--border-color);">
        <h3>Formulir Tanya Venue / Jadwal Survei</h3>
        <form id="leadForm" class="lead-form">
          <input type="hidden" id="leadVenueId" value="${v.venueId}">
          <div class="form-group">
            <label>Nama Lengkap</label>
            <input type="text" id="leadName" required placeholder="Nama Anda">
          </div>
          <div class="form-group">
            <label>Nomor WhatsApp</label>
            <input type="text" id="leadWa" required placeholder="08xxxxxxxxxx">
          </div>
          <div class="form-group">
            <label>Perkiraan Tanggal Acara</label>
            <input type="date" id="leadDate" required>
          </div>
          <div class="form-group">
            <label>Jumlah Tamu</label>
            <input type="number" id="leadGuests" placeholder="Contoh: 300">
          </div>
          <div class="form-group">
            <label>Pesan / Catatan</label>
            <textarea id="leadMessage" placeholder="Pertanyaan seputar ketersediaan tanggal, dll."></textarea>
          </div>
          <button type="submit" class="btn-submit-lead">Kirim Permintaan ke Admin</button>
        </form>
      </div>
    `;

    modal.style.display = 'flex';

    $('closeModalBtn').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

    // Handle Submit Lead
    $('leadForm').onsubmit = async e => {
      e.preventDefault();
      const payload = {
        venueId: v.venueId,
        jenisPermintaan: 'TANYA_VENUE',
        nama: $('leadName').value,
        whatsapp: $('leadWa').value,
        tanggalAcara: $('leadDate').value,
        jumlahTamu: $('leadGuests').value,
        pesan: $('leadMessage').value
      };

      const btn = e.target.querySelector('button[type="submit"]');
      btn.textContent = 'Mengirim...';
      btn.disabled = true;

      try {
        const res = await api('submitLead', payload);
        if (res && res.status === 'BERHASIL') {
          alert('Berhasil! Permintaan Anda telah dikirim ke admin.');
          modal.style.display = 'none';
        } else {
          alert('Gagal mengirim: ' + (res?.message || 'Kesalahan server'));
        }
      } catch (err) {
        alert('Terjadi kesalahan jaringan.');
      } finally {
        btn.textContent = 'Kirim Permintaan ke Admin';
        btn.disabled = false;
      }
    };
  }

  // --- LOAD DATA UTAMA ---
  async function loadData() {
    $('venueLoading')?.classList.remove('hidden');
    $('venueList')?.classList.add('hidden');
    try {
      const res = await api('getPublicData', {});
      if (!res || res.status !== 'BERHASIL') throw new Error(res?.message || 'Gagal memuat venue.');
      
      allVenues = Array.isArray(res.venues) ? res.venues : [];
      
      // Render Rekomendasi Home jika ada section-nya, atau render semua venue
      const recVenues = allVenues.filter(v => v.isHomeRecommendation === 1);
      renderVenues(recVenues.length > 0 ? recVenues : allVenues);
      
      setupFilters();

      $('venueLoading')?.classList.add('hidden');
      $('venueList')?.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      $('venueLoading')?.classList.add('hidden');
      $('venueError')?.classList.remove('hidden');
    }
  }

  function init() {
    initTheme();
    $('themeToggle')?.addEventListener('click', toggleTheme);
    loadData();
  }

  // --- MODAL AUTH (LOGIN / SIGNUP) ---
  function setupAuthModal() {
    const btnLogin = $('btnLoginModal');
    const modal = $('authModal');
    const closeBtn = $('closeAuthModal');
    const toggleLink = $('authToggleLink');
    const authTitle = $('authModalTitle');
    const nameGroup = $('nameGroup');
    const submitBtn = $('authSubmitBtn');
    const toggleText = $('authToggleText');
    const authForm = $('authForm');

    let isRegisterMode = false;

    if (btnLogin && modal) {
      btnLogin.onclick = () => { modal.style.display = 'flex'; };
    }
    if (closeBtn && modal) {
      closeBtn.onclick = () => { modal.style.display = 'none'; };
    }
    if (modal) {
      modal.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };
    }

    if (toggleLink) {
      toggleLink.onclick = e => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
          authTitle.textContent = 'Daftar Akun Baru';
          nameGroup.style.display = 'block';
          submitBtn.textContent = 'Daftar';
          toggleText.textContent = 'Sudah punya akun?';
          toggleLink.textContent = 'Masuk di sini';
        } else {
          authTitle.textContent = 'Masuk ke Akun';
          nameGroup.style.display = 'none';
          submitBtn.textContent = 'Masuk';
          toggleText.textContent = 'Belum punya akun?';
          toggleLink.textContent = 'Daftar di sini';
        }
      };
    }

    if (authForm) {
      authForm.onsubmit = async e => {
        e.preventDefault();
        const email = $('authEmail').value;
        const password = $('authPassword').value;
        const nama = $('authName')?.value || '';

        const action = isRegisterMode ? 'registerClient' : 'loginClient';
        const payload = isRegisterMode ? { email, passwordHash: password, nama } : { email, password };

        submitBtn.textContent = 'Memproses...';
        submitBtn.disabled = true;

        try {
          const res = await api(action, payload);
          if (res && res.status === 'BERHASIL') {
            alert(res.message || 'Berhasil!');
            modal.style.display = 'none';
            if (!isRegisterMode && res.client) {
              btnLogin.textContent = 'Halo, ' + res.client.nama;
            }
          } else {
            alert('Gagal: ' + (res?.message || 'Terjadi kesalahan'));
          }
        } catch (err) {
          alert('Koneksi server gagal.');
        } finally {
          submitBtn.textContent = isRegisterMode ? 'Daftar' : 'Masuk';
          submitBtn.disabled = false;
        }
      };
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
