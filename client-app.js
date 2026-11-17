(() => {
  const $ = (id) => document.getElementById(id);

  function toast(msg, isErr = false) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (isErr ? ' err' : '');
    setTimeout(() => t.classList.add('hidden'), 3500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Ambil data klien dari localStorage hasil login
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

    // Tombol Logout
    if ($('btnLogout')) {
      $('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('wvh_client');
        toast('Keluar dari portal...');
        setTimeout(() => { window.location.href = './index.html'; }, 800);
      });
    }
  });
}
 // Fungsi yang dipanggil saat klien klik tombol detail venue di client.html
function handleClientViewDetail(venueId) {
  const clientData = JSON.parse(localStorage.getItem('wvh_client') || '{}');
  const isSubscribed = clientData.STATUS_LANGGANAN === 'SUBSCRIBE';

  // Jika sudah subscribe, langsung buka detail tanpa batas
  if (isSubscribed) {
    openDetailModal(venueId);
    return;
  }

  // Ambil riwayat venue yang pernah dibuka oleh klien ini
  let viewedVenues = JSON.parse(localStorage.getItem('wvh_client_viewed') || '[]');
  
  const alreadyOpened = viewedVenues.includes(venueId);

  if (!alreadyOpened) {
    // Jika venue ini belum pernah dibuka dan kuota sudah mencapai 3
    if (viewedVenues.length >= 3) {
      // Tampilkan Modal Paywall / Gembok
      document.getElementById('paywallModal').classList.remove('hidden');
      return;
    }

    // Masukkan ke daftar venue yang sudah dilihat
    viewedVenues.push(venueId);
    localStorage.setItem('wvh_client_viewed', JSON.stringify(viewedVenues));
  }

  // Buka detail venue
  openDetailModal(venueId);
}

// Tombol WhatsApp di dalam Modal Paywall
document.addEventListener('DOMContentLoaded', () => {
  const btnWa = document.getElementById('btnConfirmSubscribeWhatsApp');
  if (btnWa) {
    btnWa.addEventListener('click', () => {
      const adminPhone = "6281234567890"; // Ganti dengan nomor WhatsApp Admin lu
      const clientData = JSON.parse(localStorage.getItem('wvh_client') || '{}');
      const msg = `Halo Admin WVH, kuota 3 venue gratis saya sudah habis. Saya ingin konfirmasi pembayaran untuk upgrade akun ke SUBSCRIBE.\n\nNama: ${clientData.NAMA || '-'}\nEmail: ${clientData.EMAIL || '-'}`;
      window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    });
  }

  const btnClose = document.getElementById('btnClosePaywall');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      document.getElementById('paywallModal').classList.add('hidden');
    });
  }
});
