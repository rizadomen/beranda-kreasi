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
})();
