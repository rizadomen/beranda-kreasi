<script>
  // PASTIKAN URL INI ADALAH URL DEPLOYMENT /exec TERBARU DARI GOOGLE APPS SCRIPT LO
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec';

  const $ = id => document.getElementById(id);
  let venuesData = [];
  let leadsData = [];

  function toast(msg, isErr = false) {
    const t = $('toast');
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
    if (!res.ok) throw new Error('Koneksi HTTP gagal');
    return await res.json();
  }

  function switchTab(tab, btn) {
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    $('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    $('pageTitle').textContent = btn ? btn.textContent.replace(/^[^\w]+/, '') : tab;

    if (tab === 'venues') loadVenues();
    if (tab === 'media') { loadVenues(); }
    if (tab === 'leads') loadLeads();
    if (tab === 'clients') loadClients();
    if (tab === 'settings') loadSettings();
    if (tab === 'activity') loadActivity();
  }

  async function checkHealth() {
    try {
      $('healthOutput').textContent = 'Menghubungi backend...';
      const res = await api('health');
      $('healthOutput').textContent = JSON.stringify(res, null, 2);
      toast('Backend terhubung!');
    } catch (e) {
      $('healthOutput').textContent = 'ERROR: ' + e.message;
      toast('Gagal terhubung ke backend', true);
    }
  }

  // --- VENUE ---
  async function loadVenues() {
    try {
      const res = await api('listVenues');
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      venuesData = res.venues || [];
      $('statVenues').textContent = venuesData.length;
      renderVenues();

      const opts = '<option value="">-- Pilih Venue --</option>' +
        venuesData.map(v => `<option value="${v.ID_VENUE}">${v.NAMA_VENUE} (${v.KOTA})</option>`).join('');
      $('mediaVenueSelect').innerHTML = opts;
      $('lVenue').innerHTML = opts;
    } catch (e) {
      toast(e.message, true);
    }
  }

  function renderVenues() {
    const q = ($('venueSearch').value || '').toLowerCase();
    const list = venuesData.filter(v =>
      String(v.NAMA_VENUE + v.KOTA + v.ID_VENUE).toLowerCase().includes(q)
    );
    const box = $('venuesContainer');
    if (!list.length) {
      box.className = 'empty';
      box.textContent = 'Tidak ada data venue.';
      return;
    }
    box.className = 'venue-grid';
    box.innerHTML = list.map(v => `
      <div class="venue-item">
        ${v.cover && v.cover.url
          ? `<img class="venue-cover" src="${formatDriveUrl(v.cover.url)}" alt="">`
          : `<div class="venue-cover-empty">Belum ada foto cover</div>`}
        <div class="venue-body">
          <div class="venue-title">${v.NAMA_VENUE}</div>
          <div class="venue-meta">📍 ${v.KOTA || '-'} • ${v.JENIS_VENUE || 'Venue'}</div>
          <div class="venue-meta">Status: <strong style="color:${v.STATUS==='AKTIF'?'var(--success)':'var(--danger)'}">${v.STATUS}</strong></div>
          <div class="venue-actions">
            <button class="btn primary sm" onclick="editVenue('${v.ID_VENUE}')">Edit</button>
            <button class="btn sm" onclick="jumpToMedia('${v.ID_VENUE}')">Foto</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function jumpToMedia(id) {
    switchTab('media', document.querySelectorAll('#nav button')[2]);
    setTimeout(() => { $('mediaVenueSelect').value = id; loadMedia(); }, 300);
  }

  function openVenueModal() {
    $('vModalTitle').textContent = 'Tambah Venue Baru';
    $('vId').value = '';
    ['vName','vCity','vAddress','vCap','vPrice','vPriceGuests','vPriceNote','vContact','vMaps','vFacilities','vDesc'].forEach(i => $(i).value = '');
    $('vStatus').value = 'AKTIF';
    $('vRec').checked = false;
    $('vDeleteBtn').classList.add('hidden');
    $('venueModal').classList.remove('hidden');
  }

  function closeVenueModal() { $('venueModal').classList.add('hidden'); }

  function editVenue(id) {
    const v = venuesData.find(x => x.ID_VENUE === id);
    if (!v) return;
    $('vModalTitle').textContent = 'Edit Venue';
    $('vId').value = v.ID_VENUE;
    $('vName').value = v.NAMA_VENUE || '';
    $('vCity').value = v.KOTA || '';
    $('vAddress').value = v.ALAMAT || '';
    $('vType').value = v.JENIS_VENUE || 'Wedding Hall';
    $('vFeature').value = v.FITUR_VENUE || 'Indoor';
    $('vStatus').value = v.STATUS || 'AKTIF';
    $('vCap').value = v.KAPASITAS || '';
    $('vContact').value = v.KONTAK || '';
    $('vMaps').value = v.GOOGLE_MAPS_URL || '';
    $('vFacilities').value = v.FASILITAS || '';
    $('vDesc').value = v.DESKRIPSI || '';
    $('vRec').checked = Number(v.REKOMENDASI_HOME) === 1;

    try {
      const p = JSON.parse(v.HARGA_INFO || '{}');
      $('vPrice').value = p.amount || '';
      $('vPriceGuests').value = p.guests || '';
      $('vPriceNote').value = p.note || '';
    } catch (_) {
      $('vPrice').value = ''; $('vPriceGuests').value = ''; $('vPriceNote').value = '';
    }

    $('vDeleteBtn').classList.remove('hidden');
    $('venueModal').classList.remove('hidden');
  }

  async function saveVenue() {
    const venue = {
      id: $('vId').value,
      name: $('vName').value.trim(),
      city: $('vCity').value.trim(),
      address: $('vAddress').value.trim(),
      venueType: $('vType').value,
      venueFeature: $('vFeature').value,
      status: $('vStatus').value,
      capacity: $('vCap').value,
      priceInfo: JSON.stringify({
        amount: $('vPrice').value ? Number($('vPrice').value) : '',
        guests: $('vPriceGuests').value ? Number($('vPriceGuests').value) : '',
        note: $('vPriceNote').value.trim()
      }),
      contact: $('vContact').value.trim(),
      googleMapsUrl: $('vMaps').value.trim(),
      facilities: $('vFacilities').value.trim(),
      description: $('vDesc').value.trim(),
      isHomeRecommended: $('vRec').checked
    };
    if (!venue.name || !venue.city) return toast('Nama & Kota wajib diisi!', true);
    try {
      const res = await api('saveVenue', { venue });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      closeVenueModal();
      loadVenues();
    } catch (e) { toast(e.message, true); }
  }

  async function deleteVenue() {
    const id = $('vId').value;
    if (!id || !confirm('Hapus permanen venue ini?')) return;
    try {
      const res = await api('deleteVenue', { venueId: id });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      closeVenueModal();
      loadVenues();
    } catch (e) { toast(e.message, true); }
  }

  // --- MEDIA ---
  function formatDriveUrl(url) {
    const s = String(url || '').trim();
    const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : s;
  }

  async function loadMedia() {
    const venueId = $('mediaVenueSelect').value;
    const box = $('mediaContainer');
    if (!venueId) { box.className = 'empty'; box.textContent = 'Pilih venue di atas.'; return; }
    try {
      const res = await api('listMedia', { venueId });
      const list = res.media || [];
      if (!list.length) { box.className = 'empty'; box.textContent = 'Belum ada foto untuk venue ini.'; return; }
      box.className = 'media-grid';
      box.innerHTML = list.map(m => `
        <div class="media-item">
          <img src="${formatDriveUrl(m.URL_TAMPIL)}" alt="">
          <div class="media-item-body">
            <strong style="display:block;font-size:13px;">${m.NAMA_FILE || 'Foto'}</strong>
            ${String(m.IS_COVER).toUpperCase()==='TRUE' ? '<span style="color:var(--cyan);font-size:11px;font-weight:700;">★ COVER UTAMA</span>' : ''}
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button class="btn sm" onclick="setCover('${m.ID_MEDIA}')">Cover</button>
              <button class="btn danger sm" onclick="archiveMedia('${m.ID_MEDIA}')">Hapus</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) { toast(e.message, true); }
  }

  async function saveMediaUrl() {
    const venueId = $('mediaVenueSelect').value;
    const url = $('mediaUrl').value.trim();
    const name = $('mediaName').value.trim() || 'Foto Venue';
    const isCover = $('mediaIsCover').checked;
    if (!venueId || !url) return toast('Pilih venue dan isi URL foto!', true);
    try {
      const res = await api('addMediaUrl', { venueId, url, name, isCover });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      $('mediaUrl').value = ''; $('mediaName').value = ''; $('mediaIsCover').checked = false;
      loadMedia();
    } catch (e) { toast(e.message, true); }
  }

  async function setCover(mediaId) {
    try {
      await api('setMediaCover', { mediaId });
      toast('Cover diperbarui!');
      loadMedia();
    } catch (e) { toast(e.message, true); }
  }

  async function archiveMedia(mediaId) {
    if (!confirm('Hapus foto ini dari galeri?')) return;
    try {
      await api('archiveMedia', { mediaId });
      toast('Foto dihapus.');
      loadMedia();
    } catch (e) { toast(e.message, true); }
  }

  // --- LEADS ---
  async function loadLeads() {
    try {
      const res = await api('listLeads');
      leadsData = res.leads || [];
      $('statLeads').textContent = leadsData.length;
      const box = $('leadsContainer');
      if (!leadsData.length) { box.className = 'empty'; box.textContent = 'Belum ada leads.'; return; }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>Nama</th><th>WhatsApp</th><th>Venue</th><th>Status</th><th>Survei</th><th>Aksi</th></tr></thead><tbody>` +
        leadsData.map(l => {
          const wa = String(l.WHATSAPP || '').replace(/\D/g, '').replace(/^0/, '62');
          return `<tr>
            <td><strong>${l.NAMA}</strong></td>
            <td>${l.WHATSAPP}</td>
            <td>${l.NAMA_VENUE || '-'}</td>
            <td>${l.STATUS}</td>
            <td>${l.TANGGAL_SURVEI || '-'} ${l.WAKTU_SURVEI || ''}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn sm" onclick="editLead('${l.ID_LEAD}')">Edit</button>
              ${wa ? `<a class="btn wa" href="https://wa.me/${wa}" target="_blank">WA ↗</a>` : ''}
            </td>
          </tr>`;
        }).join('') + `</tbody></table>`;
    } catch (e) { toast(e.message, true); }
  }

  function openLeadModal() {
    $('lModalTitle').textContent = 'Tambah Lead Manual';
    $('lId').value = ''; $('lName').value = ''; $('lWa').value = ''; $('lNotes').value = '';
    $('leadModal').classList.remove('hidden');
  }
  function closeLeadModal() { $('leadModal').classList.add('hidden'); }

  function editLead(id) {
    const l = leadsData.find(x => x.ID_LEAD === id);
    if (!l) return;
    $('lModalTitle').textContent = 'Update Lead';
    $('lId').value = l.ID_LEAD;
    $('lName').value = l.NAMA || '';
    $('lWa').value = l.WHATSAPP || '';
    $('lVenue').value = l.ID_VENUE || '';
    $('lStatus').value = l.STATUS || 'BARU';
    $('lSurveyDate').value = l.TANGGAL_SURVEI || '';
    $('lSurveyTime').value = l.WAKTU_SURVEI || '';
    $('lSurveyStatus').value = l.STATUS_SURVEI || 'BELUM_DIJADWALKAN';
    $('lNotes').value = l.CATATAN_ADMIN || '';
    $('leadModal').classList.remove('hidden');
  }

  async function saveLead() {
    const id = $('lId').value;
    try {
      if (id) {
        await api('updateLead', {
          lead: {
            leadId: id, status: $('lStatus').value, notes: $('lNotes').value,
            surveyDate: $('lSurveyDate').value, surveyTime: $('lSurveyTime').value, surveyStatus: $('lSurveyStatus').value
          }
        });
      } else {
        await api('createLead', {
          name: $('lName').value, whatsapp: $('lWa').value, venueId: $('lVenue').value, message: $('lNotes').value
        });
      }
      toast('Lead disimpan!');
      closeLeadModal();
      loadLeads();
    } catch (e) { toast(e.message, true); }
  }

  // --- CLIENTS ---
  async function loadClients() {
    try {
      const res = await api('listClients');
      const list = res.clients || [];
      $('statClients').textContent = list.length;
      const box = $('clientsContainer');
      if (!list.length) { box.className = 'empty'; box.textContent = 'Belum ada klien.'; return; }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Status</th></tr></thead><tbody>` +
        list.map(c => `<tr><td>${c.ID_KLIEN}</td><td><strong>${c.NAMA}</strong></td><td>${c.EMAIL}</td><td>${c.STATUS}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { toast(e.message, true); }
  }

  async function addClient() {
    const name = $('newClientName').value.trim();
    const email = $('newClientEmail').value.trim();
    if (!name || !email) return toast('Nama & email wajib diisi!', true);
    try {
      await api('createClient', { name, email });
      toast('Akun klien dibuat!');
      $('newClientName').value = ''; $('newClientEmail').value = '';
      loadClients();
    } catch (e) { toast(e.message, true); }
  }

  // --- SETTINGS & ACTIVITY ---
  async function loadSettings() {
    try {
      const res = await api('getSettings');
      const map = Object.fromEntries((res.settings || []).map(s => [s.key, s.value]));
      $('setWa').value = map.ADMIN_WHATSAPP || '';
      $('setBanner').value = map.PORTAL_BANNER_URL || '';
      $('setPopup').value = map.PORTAL_POPUP_URL || '';
    } catch (e) { toast(e.message, true); }
  }

  async function saveSettings() {
    try {
      await api('setSetting', { key: 'ADMIN_WHATSAPP', value: $('setWa').value.trim() });
      await api('setSetting', { key: 'PORTAL_BANNER_URL', value: $('setBanner').value.trim() });
      await api('setSetting', { key: 'PORTAL_POPUP_URL', value: $('setPopup').value.trim() });
      toast('Pengaturan portal disimpan!');
    } catch (e) { toast(e.message, true); }
  }

  async function loadActivity() {
    try {
      const res = await api('listActivity');
      const list = res.activity || [];
      const box = $('activityContainer');
      if (!list.length) { box.className = 'empty'; box.textContent = 'Belum ada log.'; return; }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>Waktu</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>` +
        list.map(a => `<tr><td>${a.WAKTU}</td><td><strong>${a.AKSI}</strong></td><td>${a.OBJEK}</td><td>${a.KETERANGAN}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) { toast(e.message, true); }
  }

  // Load awal saat buka web
  window.addEventListener('DOMContentLoaded', () => {
    loadVenues();
    loadClients();
    loadLeads();
  });
</script>
