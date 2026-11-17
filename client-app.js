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

  // Render daftar venue khusus klien dengan kuota unik per akun
  async function loadClientVenues() {
    try {
      const res = await api('listVenues');
      if (res.status !== 'BERHASIL') throw new Error('Gagal memuat venue');
      
      const allVenues = res.venues || res.data || [];
      const venues = allVenues.filter(v => String(v.STATUS || v.status || '').toUpperCase() === 'AKTIF');
      
      const box = $('clientVenuesContainer');
      if (!box) return;
      
      if (!venues.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada venue tersedia.';
        return;
      }

      box.className = 'venue-grid';
      const clientData = JSON.parse(localStorage.getItem('wvh_client') || '{}');
      const isSubscribed = clientData.STATUS_LANGGANAN === 'SUBSCRIBE';
      
      // Gunakan storageKey unik berdasarkan ID klien agar kuota tidak bentrok antar akun
      const clientId = clientData.ID_KLIEN || 'guest';
      const storageKey = 'wvh_viewed_' + clientId;
      let viewedVenues = JSON.parse(localStorage.getItem(storageKey) || '[]');

      box.innerHTML = venues.map(v => {
        const venueId = v.ID_VENUE || v.id_venue;
        const isOpened = viewedVenues.includes(venueId);
        const isLocked = !isSubscribed && !isOpened && viewedVenues.length >= 3;

        const lockBadge = isLocked 
          ? `<span style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.8); color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; z-index: 10;">🔒 Terkunci</span>` 
          : '';

        return `
          <div class="venue-item" style="position: relative;">
            ${lockBadge}
            ${v.cover && v.cover.url ? `<img class="venue-cover" src="${formatDriveUrl(v.cover.url)}" alt="">` : `<div class="venue-cover-empty">Venue Eksklusif</div>`}
            <div class="venue-body">
              <div class="venue-title">${v.NAMA_VENUE || v.nama_venue}</div>
              <div class="venue-meta">📍 ${v.KOTA || v.kota || '-'}</div>
              <div class="venue-actions mt-14">
                <button type="button" class="btn primary sm w-full" onclick="handleClientViewDetail('${venueId}')">Lihat Detail & Harga</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error('Error loading client venues:', err);
    }
  }

  // Fungsi global yang dipanggil saat klien klik tombol detail venue
  window.handleClientViewDetail = function(venueId) {
    const clientData = JSON.parse(localStorage.getItem('wvh_client') || '{}');
    const isSubscribed = clientData.STATUS_LANGGANAN === 'SUBSCRIBE';

    if (isSubscribed) {
      alert('Membuka detail venue (Sudah Subscribe)...');
      return;
    }

    const clientId = clientData.ID_KLIEN || 'guest';
    const storageKey = 'wvh_viewed_' + clientId;
    let viewedVenues = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const alreadyOpened = viewedVenues.includes(venueId);

    if (!alreadyOpened) {
      if (viewedVenues.length >= 3) {
        // Tampilkan Modal Paywall / Gembok
        const modal = $('paywallModal');
        if (modal) modal.classList.remove('hidden');
        return;
      }
      viewedVenues.push(venueId);
      localStorage.setItem(storageKey, JSON.stringify(viewedVenues));
    }

    // Refresh tampilan card venue agar badge terkunci terupdate jika kuota pas habis
    loadClientVenues();
    alert('Membuka detail venue...');
  };

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil data klien dari localStorage hasil login
    const rawClient = localStorage.getItem('wvh_client');
    if (!rawClient) {
      toast('Sesi habis, silakan login kembali.', true);
      setTimeout(() => { window.location.href = './index.html'; }, 1200);
      return;
    }

    const client = JSON.parse(rawClient);
    if ($('clientName')) $('clientName').textContent = client.NAMA || 'Klien Eksklusif';
    if ($('clientEmail')) $('clientEmail').textContent = client.EMAIL || '-';
    if ($('clientId')) $('clientId').textContent = client.ID_KLIEN || '-';
    if ($('clientStatus')) $('clientStatus').textContent = client.STATUS || 'AKTIF';

    // Pastikan modal paywall tertutup secara default saat halaman dimuat
    const paywallModal = $('paywallModal');
    if (paywallModal) paywallModal.classList.add('hidden');

    // 2. Muat daftar venue klien
    loadClientVenues();

    // 3. Tombol Logout
    if ($('btnLogout')) {
      $('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('wvh_client');
        toast('Keluar dari portal...');
        setTimeout(() => { window.location.href = './index.html'; }, 800);
      });
    }

    // 4. Tombol WhatsApp di dalam Modal Paywall
    const btnWa = $('btnConfirmSubscribeWhatsApp');
    if (btnWa) {
      btnWa.addEventListener('click', (e) => {
        e.preventDefault();
        const adminPhone = "6281234567890"; // Ganti dengan nomor WhatsApp Admin lu
        const clientData = JSON.parse(localStorage.getItem('wvh_client') || '{}');
        const msg = `Halo Admin WVH, kuota 3 venue gratis saya sudah habis. Saya ingin konfirmasi pembayaran untuk upgrade akun ke SUBSCRIBE.\n\nNama: ${clientData.NAMA || '-'}\nEmail: ${clientData.EMAIL || '-'}`;
        window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }

    // 5. Tombol Tutup Paywall
    const btnClose = $('btnClosePaywall');
    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = $('paywallModal');
        if (modal) modal.classList.add('hidden');
      });
    }
  });
})();
