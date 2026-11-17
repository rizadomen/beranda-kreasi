(() => {
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec';
  const $ = (id) => document.getElementById(id);

  function toast(msg, isErr = false) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (isErr ? ' err' : '');
    setTimeout(() => t.classList.add('hidden'), 3500);
  }

  async function api(action, payload = {}) {
    const res = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    if (!res.ok) throw new Error('HTTP Error: ' + res.status);
    return await res.json();
  }

  function formatDriveUrl(url) {
    const s = String(url || '').trim();
    const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : s;
  }

  async function initPublicPortal() {
    try {
      // 1. Ambil pengaturan banner & popup dengan aman (mendukung format object/array)
      const setRes = await api('getSettings').catch(() => ({}));
      let settingsMap = {};
      const rawSettings = setRes.settings || setRes.data || {};
      
      if (Array.isArray(rawSettings)) {
        settingsMap = Object.fromEntries(rawSettings.map(s => [s.key || s.KEY, s.value || s.VALUE]));
      } else {
        settingsMap = rawSettings;
      }
      
      if (settingsMap.PORTAL_BANNER_URL && $('heroBanner')) {
        $('heroBanner').style.backgroundImage = `linear-gradient(to bottom, rgba(9,13,22,0.8), rgba(9,13,22,0.98)), url('${settingsMap.PORTAL_BANNER_URL}')`;
        $('heroBanner').style.backgroundSize = 'cover';
        $('heroBanner').style.backgroundPosition = 'center';
      }

      // Tampilkan popup 4:5 jika diatur dan belum pernah muncul di sesi ini
      if (settingsMap.PORTAL_POPUP_URL && $('popupImage') && !sessionStorage.getItem('popupShown')) {
        $('popupImage').src = settingsMap.PORTAL_POPUP_URL;
        $('promoPopup').classList.remove('hidden');
        sessionStorage.setItem('popupShown', 'true');
      }

      // 2. Ambil daftar venue aktif
      const res = await api('listVenues');
      if (res.status !== 'BERHASIL') throw new Error('Gagal memuat venue');
      
      const allVenues = res.venues || res.data || [];
      const venues = allVenues.filter(v => {
        const status = String(v.STATUS || v.status || '').toUpperCase();
        return status === 'AKTIF';
      });
      
      const box = $('publicVenuesContainer');
      if (!box) return;
      if (!venues.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada venue tersedia.';
        return;
      }

      box.className = 'venue-grid';
      box.innerHTML = venues.map(v => {
        const isRecommended = Number(v.REKOMENDASI_HOME || v.rekomendasi_home || 0) === 1;
        
        return `
          <div class="venue-item" style="position: relative;">
            ${isRecommended ? '<span style="position: absolute; top: 12px; left: 12px; background: #8b5cf6; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; z-index: 10;">✨ Rekomendasi</span>' : ''}
            ${v.cover && v.cover.url
              ? `<img class="venue-cover" src="${formatDriveUrl(v.cover.url)}" alt="">`
              : `<div class="venue-cover-empty">Venue Eksklusif</div>`}
            <div class="venue-body">
              <div class="venue-title">${v.NAMA_VENUE || v.nama_venue}</div>
              <div class="venue-meta">📍 ${v.KOTA || v.kota || '-'} • ${v.JENIS_VENUE || v.jenis_venue || 'Venue'}</div>
              <div class="venue-meta">Kapasitas: <strong>${v.KAPASITAS || v.kapasitas || '500'} Tamu</strong></div>
              <div class="venue-actions mt-14">
                <button type="button" class="btn primary sm w-full trigger-gate">Lihat Detail & Harga</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error('Error initPublicPortal:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPublicPortal();

    const authModal = $('authModal');
    const gateModal = $('gateModal');
    const promoPopup = $('promoPopup');

    if ($('btnOpenLogin')) {
      $('btnOpenLogin').addEventListener('click', () => {
        $('authModalTitle').textContent = 'Masuk ke Portal Klien';
        $('registerFormView').classList.add('hidden');
        $('loginFormView').classList.remove('hidden');
        authModal.classList.remove('hidden');
      });
    }

    if ($('btnOpenRegister')) {
      $('btnOpenRegister').addEventListener('click', () => {
        $('authModalTitle').textContent = 'Daftar Akun Baru';
        $('loginFormView').classList.add('hidden');
        $('registerFormView').classList.remove('hidden');
        authModal.classList.remove('hidden');
      });
    }

    if ($('switchToLogin')) {
      $('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        $('authModalTitle').textContent = 'Masuk ke Portal Klien';
        $('registerFormView').classList.add('hidden');
        $('loginFormView').classList.remove('hidden');
      });
    }

    if ($('switchToRegister')) {
      $('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        $('authModalTitle').textContent = 'Daftar Akun Baru';
        $('loginFormView').classList.add('hidden');
        $('registerFormView').classList.remove('hidden');
      });
    }

    // Gate: jika pengunjung klik detail venue, munculkan pop-up suruh daftar/login
    document.body.addEventListener('click', (e) => {
      if (e.target.classList.contains('trigger-gate')) {
        gateModal.classList.remove('hidden');
      }
    });

    if ($('btnTriggerAuthFromGate')) {
      $('btnTriggerAuthFromGate').addEventListener('click', () => {
        gateModal.classList.add('hidden');
        $('authModalTitle').textContent = 'Daftar Akun Baru';
        $('loginFormView').classList.add('hidden');
        $('registerFormView').classList.remove('hidden');
        authModal.classList.remove('hidden');
      });
    }

    // Tombol close modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = $(btn.dataset.closeModal);
        if (modal) modal.classList.add('hidden');
      });
    });

    if ($('closePopup')) {
      $('closePopup').addEventListener('click', () => promoPopup.classList.add('hidden'));
    }

    // Submit Pendaftaran Klien Baru
    if ($('btnSubmitRegister')) {
      $('btnSubmitRegister').addEventListener('click', async () => {
        const name = $('regName').value.trim();
        const email = $('regEmail').value.trim();
        if (!name || !email) return toast('Nama dan Email wajib diisi!', true);
        try {
          const res = await api('createClient', { name, email });
          if (res.status !== 'BERHASIL') throw new Error(res.message);
          toast('Akun berhasil dibuat! Silakan masuk.');
          $('registerFormView').classList.add('hidden');
          $('loginFormView').classList.remove('hidden');
          $('authModalTitle').textContent = 'Masuk ke Portal Klien';
        } catch (err) {
          toast(err.message, true);
        }
      });
    }

    // Submit Login Klien
    if ($('btnSubmitLogin')) {
      $('btnSubmitLogin').addEventListener('click', async () => {
        const email = $('loginEmail').value.trim();
        if (!email) return toast('Masukkan email terdaftar Anda!', true);
        try {
          const res = await api('clientLogin', { email });
          if (res.status !== 'BERHASIL') throw new Error(res.message || 'Email tidak ditemukan.');
          
          localStorage.setItem('wvh_client', JSON.stringify(res.client));
          toast('Login berhasil! Membuka portal...');
          setTimeout(() => {
            window.location.href = './client.html';
          }, 1000);
        } catch (err) {
          toast(err.message, true);
        }
      });
    }
  });
})();
