(() => {
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec';

  const $ = (id) => document.getElementById(id);
  let venuesData = [];
  let leadsData = [];

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

  function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach((s) => s.classList.add('hidden'));
    const target = $('tab-' + tab);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach((b) => {
      const isMatch = b.dataset.tab === tab;
      b.classList.toggle('active', isMatch);
      if (isMatch && $('pageTitle')) {
        $('pageTitle').textContent = b.textContent.replace(/^[^\w]+/, '').trim();
      }
    });

    if (tab === 'venues') loadVenues();
    if (tab === 'media') loadVenues();
    if (tab === 'leads') loadLeads();
    if (tab === 'clients') loadClients();
    if (tab === 'settings') loadSettings();
    if (tab === 'activity') loadActivity();
  }

  async function checkHealth() {
    const out = $('healthOutput');
    const badge = $('apiBadge');
    try {
      if (out) out.textContent = 'Menghubungi Google Apps Script...';
      const res = await api('health');
      if (out) out.textContent = JSON.stringify(res, null, 2);
      if (badge) {
        badge.textContent = '● TERHUBUNG KE SHEETS';
        badge.className = 'status-pill online';
      }
      toast('Backend terhubung!');
    } catch (e) {
      if (out) out.textContent = 'ERROR KONEKSI:\n' + e.message;
      if (badge) {
        badge.textContent = '● TERPUTUS';
        badge.className = 'status-pill offline';
      }
      toast('Gagal terhubung ke backend', true);
    }
  }

  function formatDriveUrl(url) {
    const s = String(url || '').trim();
    const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000` : s;
  }

  // --- VENUES ---
  async function loadVenues() {
    try {
      const res = await api('listVenues');
      if (res.status !== 'BERHASIL') throw new Error(res.message || 'Gagal memuat venue');
      venuesData = res.venues || [];
      if ($('statVenues')) $('statVenues').textContent = venuesData.length;
      renderVenues();

      const opts = '<option value="">-- Pilih Venue --</option>' +
        venuesData.map((v) => `<option value="${v.ID_VENUE}">${v.NAMA_VENUE} (${v.KOTA})</option>`).join('');
      if ($('mediaVenueSelect')) $('mediaVenueSelect').innerHTML = opts;
      if ($('lVenue')) $('lVenue').innerHTML = opts;
    } catch (e) {
      toast(e.message, true);
    }
  }

  function renderVenues() {
    const searchEl = $('venueSearch');
    const q = searchEl ? searchEl.value.toLowerCase() : '';
    const list = venuesData.filter((v) =>
      String(v.NAMA_VENUE + v.KOTA + v.ID_VENUE).toLowerCase().includes(q)
    );
    const box = $('venuesContainer');
    if (!box) return;
    if (!list.length) {
      box.className = 'empty';
      box.textContent = 'Tidak ada data venue.';
      return;
    }
    box.className = 'venue-grid';
    box.innerHTML = list.map((v) => `
      <div class="venue-item">
        ${v.cover && v.cover.url
          ? `<img class="venue-cover" src="${formatDriveUrl(v.cover.url)}" alt="">`
          : `<div class="venue-cover-empty">Belum ada foto cover</div>`}
        <div class="venue-body">
          <div class="venue-title">${v.NAMA_VENUE}</div>
          <div class="venue-meta">📍 ${v.KOTA || '-'} • ${v.JENIS_VENUE || 'Venue'}</div>
          <div class="venue-meta">Status: <strong style="color:${v.STATUS === 'AKTIF' ? 'var(--success)' : 'var(--danger)'}">${v.STATUS}</strong></div>
          <div class="venue-actions">
            <button type="button" class="btn primary sm" data-edit-venue="${v.ID_VENUE}">Edit</button>
            <button type="button" class="btn sm" data-media-venue="${v.ID_VENUE}">Foto</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function openVenueModal(v = null) {
    if ($('vModalTitle')) $('vModalTitle').textContent = v ? 'Edit Venue' : 'Tambah Venue Baru';
    if ($('vId')) $('vId').value = v ? v.ID_VENUE : '';
    if ($('vName')) $('vName').value = v ? (v.NAMA_VENUE || '') : '';
    if ($('vCity')) $('vCity').value = v ? (v.KOTA || '') : '';
    if ($('vAddress')) $('vAddress').value = v ? (v.ALAMAT || '') : '';
    if ($('vType')) $('vType').value = v ? (v.JENIS_VENUE || 'Wedding Hall') : 'Wedding Hall';
    if ($('vFeature')) $('vFeature').value = v ? (v.FITUR_VENUE || 'Indoor') : 'Indoor';
    if ($('vStatus')) $('vStatus').value = v ? (v.STATUS || 'AKTIF') : 'AKTIF';
    if ($('vCap')) $('vCap').value = v ? (v.KAPASITAS || '') : '';
    if ($('vContact')) $('vContact').value = v ? (v.KONTAK || '') : '';
    if ($('vMaps')) $('vMaps').value = v ? (v.GOOGLE_MAPS_URL || '') : '';
    if ($('vFacilities')) $('vFacilities').value = v ? (v.FASILITAS || '') : '';
    if ($('vDesc')) $('vDesc').value = v ? (v.DESKRIPSI || '') : '';
    if ($('vRec')) $('vRec').checked = v ? Number(v.REKOMENDASI_HOME) === 1 : false;

    try {
      const p = v ? JSON.parse(v.HARGA_INFO || '{}') : {};
      if ($('vPrice')) $('vPrice').value = p.amount || '';
      if ($('vPriceGuests')) $('vPriceGuests').value = p.guests || '';
      if ($('vPriceNote')) $('vPriceNote').value = p.note || '';
    } catch (_) {
      if ($('vPrice')) $('vPrice').value = '';
      if ($('vPriceGuests')) $('vPriceGuests').value = '';
      if ($('vPriceNote')) $('vPriceNote').value = '';
    }

    if ($('vDeleteBtn')) $('vDeleteBtn').classList.toggle('hidden', !v);
    if ($('venueModal')) $('venueModal').classList.remove('hidden');
  }

  async function saveVenue() {
    const venue = {
      id: $('vId') ? $('vId').value : '',
      name: $('vName') ? $('vName').value.trim() : '',
      city: $('vCity') ? $('vCity').value.trim() : '',
      address: $('vAddress') ? $('vAddress').value.trim() : '',
      venueType: $('vType') ? $('vType').value : '',
      venueFeature: $('vFeature') ? $('vFeature').value : '',
      status: $('vStatus') ? $('vStatus').value : 'AKTIF',
      capacity: $('vCap') ? $('vCap').value : '',
      priceInfo: JSON.stringify({
        amount: $('vPrice') && $('vPrice').value ? Number($('vPrice').value) : '',
        guests: $('vPriceGuests') && $('vPriceGuests').value ? Number($('vPriceGuests').value) : '',
        note: $('vPriceNote') ? $('vPriceNote').value.trim() : ''
      }),
      contact: $('vContact') ? $('vContact').value.trim() : '',
      googleMapsUrl: $('vMaps') ? $('vMaps').value.trim() : '',
      facilities: $('vFacilities') ? $('vFacilities').value.trim() : '',
      description: $('vDesc') ? $('vDesc').value.trim() : '',
      isHomeRecommended: $('vRec') ? $('vRec').checked : false
    };
    if (!venue.name || !venue.city) return toast('Nama & Kota wajib diisi!', true);
    try {
      const res = await api('saveVenue', { venue });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      if ($('venueModal')) $('venueModal').classList.add('hidden');
      loadVenues();
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function deleteVenue() {
    const id = $('vId') ? $('vId').value : '';
    if (!id || !confirm('Hapus permanen venue ini?')) return;
    try {
      const res = await api('deleteVenue', { venueId: id });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      if ($('venueModal')) $('venueModal').classList.add('hidden');
      loadVenues();
    } catch (e) {
      toast(e.message, true);
    }
  }

  // --- MEDIA ---
  async function loadMedia() {
    const selectEl = $('mediaVenueSelect');
    const venueId = selectEl ? selectEl.value : '';
    const box = $('mediaContainer');
    if (!box) return;
    if (!venueId) {
      box.className = 'empty';
      box.textContent = 'Pilih venue di atas.';
      return;
    }
    try {
      const res = await api('listMedia', { venueId });
      const list = res.media || [];
      if (!list.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada foto untuk venue ini.';
        return;
      }
      box.className = 'media-grid';
      box.innerHTML = list.map((m) => `
        <div class="media-item">
          <img src="${formatDriveUrl(m.URL_TAMPIL)}" alt="">
          <div class="media-item-body">
            <strong style="display:block;font-size:13px;">${m.NAMA_FILE || 'Foto'}</strong>
            ${String(m.IS_COVER).toUpperCase() === 'TRUE' ? '<span style="color:var(--cyan);font-size:11px;font-weight:700;">★ COVER UTAMA</span>' : ''}
            <div class="btn-group mt-14">
              <button type="button" class="btn sm" data-set-cover="${m.ID_MEDIA}">Cover</button>
              <button type="button" class="btn danger sm" data-del-media="${m.ID_MEDIA}">Hapus</button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function saveMediaUrl() {
    const venueId = $('mediaVenueSelect') ? $('mediaVenueSelect').value : '';
    const url = $('mediaUrl') ? $('mediaUrl').value.trim() : '';
    const name = $('mediaName') && $('mediaName').value.trim() ? $('mediaName').value.trim() : 'Foto Venue';
    const isCover = $('mediaIsCover') ? $('mediaIsCover').checked : false;
    if (!venueId || !url) return toast('Pilih venue dan isi URL foto!', true);
    try {
      const res = await api('addMediaUrl', { venueId, url, name, isCover });
      if (res.status !== 'BERHASIL') throw new Error(res.message);
      toast(res.message);
      if ($('mediaUrl')) $('mediaUrl').value = '';
      if ($('mediaName')) $('mediaName').value = '';
      if ($('mediaIsCover')) $('mediaIsCover').checked = false;
      loadMedia();
    } catch (e) {
      toast(e.message, true);
    }
  }

  // --- LEADS ---
  async function loadLeads() {
    try {
      const res = await api('listLeads');
      leadsData = res.leads || [];
      if ($('statLeads')) $('statLeads').textContent = leadsData.length;
      const box = $('leadsContainer');
      if (!box) return;
      if (!leadsData.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada leads.';
        return;
      }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>Nama</th><th>WhatsApp</th><th>Venue</th><th>Status</th><th>Survei</th><th>Aksi</th></tr></thead><tbody>` +
        leadsData.map((l) => {
          const wa = String(l.WHATSAPP || '').replace(/\D/g, '').replace(/^0/, '62');
          return `<tr>
            <td><strong>${l.NAMA}</strong></td>
            <td>${l.WHATSAPP}</td>
            <td>${l.NAMA_VENUE || '-'}</td>
            <td>${l.STATUS}</td>
            <td>${l.TANGGAL_SURVEI || '-'} ${l.WAKTU_SURVEI || ''}</td>
            <td class="btn-group">
              <button type="button" class="btn sm" data-edit-lead="${l.ID_LEAD}">Edit</button>
              ${wa ? `<a class="btn wa" href="https://wa.me/${wa}" target="_blank" rel="noopener">WA ↗</a>` : ''}
            </td>
          </tr>`;
        }).join('') + `</tbody></table>`;
    } catch (e) {
      toast(e.message, true);
    }
  }

  function openLeadModal(l = null) {
    if ($('lModalTitle')) $('lModalTitle').textContent = l ? 'Update Lead' : 'Tambah Lead Manual';
    if ($('lId')) $('lId').value = l ? l.ID_LEAD : '';
    if ($('lName')) $('lName').value = l ? (l.NAMA || '') : '';
    if ($('lWa')) $('lWa').value = l ? (l.WHATSAPP || '') : '';
    if ($('lVenue')) $('lVenue').value = l ? (l.ID_VENUE || '') : '';
    if ($('lStatus')) $('lStatus').value = l ? (l.STATUS || 'BARU') : 'BARU';
    if ($('lSurveyDate')) $('lSurveyDate').value = l ? (l.TANGGAL_SURVEI || '') : '';
    if ($('lSurveyTime')) $('lSurveyTime').value = l ? (l.WAKTU_SURVEI || '') : '';
    if ($('lSurveyStatus')) $('lSurveyStatus').value = l ? (l.STATUS_SURVEI || 'BELUM_DIJADWALKAN') : 'BELUM_DIJADWALKAN';
    if ($('lNotes')) $('lNotes').value = l ? (l.CATATAN_ADMIN || '') : '';
    if ($('leadModal')) $('leadModal').classList.remove('hidden');
  }

  async function saveLead() {
    const id = $('lId') ? $('lId').value : '';
    try {
      if (id) {
        await api('updateLead', {
          lead: {
            leadId: id,
            status: $('lStatus') ? $('lStatus').value : 'BARU',
            notes: $('lNotes') ? $('lNotes').value : '',
            surveyDate: $('lSurveyDate') ? $('lSurveyDate').value : '',
            surveyTime: $('lSurveyTime') ? $('lSurveyTime').value : '',
            surveyStatus: $('lSurveyStatus') ? $('lSurveyStatus').value : ''
          }
        });
      } else {
        await api('createLead', {
          name: $('lName') ? $('lName').value : '',
          whatsapp: $('lWa') ? $('lWa').value : '',
          venueId: $('lVenue') ? $('lVenue').value : '',
          message: $('lNotes') ? $('lNotes').value : ''
        });
      }
      toast('Lead disimpan!');
      if ($('leadModal')) $('leadModal').classList.add('hidden');
      loadLeads();
    } catch (e) {
      toast(e.message, true);
    }
  }

  // --- CLIENTS, SETTINGS, ACTIVITY ---
  async function loadClients() {
    try {
      const res = await api('listClients');
      const list = res.clients || [];
      if ($('statClients')) $('statClients').textContent = list.length;
      const box = $('clientsContainer');
      if (!box) return;
      if (!list.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada klien.';
        return;
      }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>ID</th><th>Nama</th><th>Email</th><th>Status</th></tr></thead><tbody>` +
        list.map((c) => `<tr><td>${c.ID_KLIEN}</td><td><strong>${c.NAMA}</strong></td><td>${c.EMAIL}</td><td>${c.STATUS}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function addClient() {
    const name = $('newClientName') ? $('newClientName').value.trim() : '';
    const email = $('newClientEmail') ? $('newClientEmail').value.trim() : '';
    if (!name || !email) return toast('Nama & email wajib diisi!', true);
    try {
      await api('createClient', { name, email });
      toast('Akun klien dibuat!');
      if ($('newClientName')) $('newClientName').value = '';
      if ($('newClientEmail')) $('newClientEmail').value = '';
      loadClients();
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function loadSettings() {
    try {
      const res = await api('getSettings');
      const map = Object.fromEntries((res.settings || []).map((s) => [s.key, s.value]));
      if ($('setWa')) $('setWa').value = map.ADMIN_WHATSAPP || '';
      if ($('setBanner')) $('setBanner').value = map.PORTAL_BANNER_URL || '';
      if ($('setPopup')) $('setPopup').value = map.PORTAL_POPUP_URL || '';
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function saveSettings() {
    try {
      if ($('setWa')) await api('setSetting', { key: 'ADMIN_WHATSAPP', value: $('setWa').value.trim() });
      if ($('setBanner')) await api('setSetting', { key: 'PORTAL_BANNER_URL', value: $('setBanner').value.trim() });
      if ($('setPopup')) await api('setSetting', { key: 'PORTAL_POPUP_URL', value: $('setPopup').value.trim() });
      toast('Pengaturan portal disimpan!');
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function loadActivity() {
    try {
      const res = await api('listActivity');
      const list = res.activity || [];
      const box = $('activityContainer');
      if (!box) return;
      if (!list.length) {
        box.className = 'empty';
        box.textContent = 'Belum ada log.';
        return;
      }
      box.className = 'table-wrap';
      box.innerHTML = `<table><thead><tr><th>Waktu</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>` +
        list.map((a) => `<tr><td>${a.WAKTU}</td><td><strong>${a.AKSI}</strong></td><td>${a.OBJEK}</td><td>${a.KETERANGAN}</td></tr>`).join('') + `</tbody></table>`;
    } catch (e) {
      toast(e.message, true);
    }
  }

  // --- EVENT BINDINGS (AMAN) ---
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const bindClick = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener('click', fn);
    };

    bindClick('btnCheckHealth', checkHealth);
    bindClick('btnReloadVenues', loadVenues);
    bindClick('btnNewVenue', () => openVenueModal(null));
    if ($('venueSearch')) $('venueSearch').addEventListener('input', renderVenues);
    bindClick('btnSaveVenue', saveVenue);
    bindClick('vDeleteBtn', deleteVenue);

    if ($('mediaVenueSelect')) $('mediaVenueSelect').addEventListener('change', loadMedia);
    bindClick('btnSaveMedia', saveMediaUrl);
    bindClick('btnReloadMedia', loadMedia);

    bindClick('btnReloadLeads', loadLeads);
    bindClick('btnNewLead', () => openLeadModal(null));
    bindClick('btnSaveLead', saveLead);

    bindClick('btnAddClient', addClient);
    bindClick('btnReloadClients', loadClients);
    bindClick('btnSaveSettings', saveSettings);
    bindClick('btnReloadActivity', loadActivity);

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = $(btn.dataset.closeModal);
        if (modal) modal.classList.add('hidden');
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    document.body.addEventListener('click', async (e) => {
      const editVenueId = e.target.dataset.editVenue;
      if (editVenueId) {
        const v = venuesData.find((x) => x.ID_VENUE === editVenueId);
        if (v) openVenueModal(v);
      }

      const mediaVenueId = e.target.dataset.mediaVenue;
      if (mediaVenueId) {
        switchTab('media');
        setTimeout(() => {
          if ($('mediaVenueSelect')) $('mediaVenueSelect').value = mediaVenueId;
          loadMedia();
        }, 250);
      }

      const coverId = e.target.dataset.setCover;
      if (coverId) {
        try {
          await api('setMediaCover', { mediaId: coverId });
          toast('Cover diperbarui!');
          loadMedia();
        } catch (err) { toast(err.message, true); }
      }

      const delMediaId = e.target.dataset.delMedia;
      if (delMediaId && confirm('Hapus foto ini dari galeri?')) {
        try {
          await api('archiveMedia', { mediaId: delMediaId });
          toast('Foto dihapus.');
          loadMedia();
        } catch (err) { toast(err.message, true); }
      }

      const editLeadId = e.target.dataset.editLead;
      if (editLeadId) {
        const l = leadsData.find((x) => x.ID_LEAD === editLeadId);
        if (l) openLeadModal(l);
      }
    });

    // Inisialisasi awal
    checkHealth();
    loadVenues();
    loadClients();
    loadLeads();
  });
})();
