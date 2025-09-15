// ===============================
// app.js — Liste "magazine" simple + partage
// ===============================

// Utilitaires dates
const today = new Date();
function toDate(d) { return d ? new Date(d) : null; }
function daysBetween(a, b) { return Math.ceil((a - b) / (1000*60*60*24)); }

// État global
let ALL_DATA = [];
const cfg = window.APP_CONFIG || {};

// Sélecteurs DOM
const searchInput       = document.getElementById('searchInput');
const searchInputMobile = document.getElementById('searchInputMobile');
const typeFilter        = document.getElementById('typeFilter');
const countryFilter     = document.getElementById('countryFilter');
const tagsFilter        = document.getElementById('tagsFilter');
const sortSelect        = document.getElementById('sortSelect');
const addBtn            = document.getElementById('addBtn');
const yearEl            = document.getElementById('year');
const listFeed          = document.getElementById('listFeed');

// ============ INIT ============
(function init() {
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Bouton "Ajouter"
  if (cfg.googleFormUrl && cfg.googleFormUrl !== '#') {
    if (addBtn) addBtn.href = cfg.googleFormUrl;
  } else if (addBtn) {
    addBtn.classList.add('disabled');
  }

  bindEvents();
  loadData().then(render).catch(err => {
    console.error('Erreur loadData:', err);
    if (listFeed) listFeed.innerHTML = `<div class="text-center text-danger py-5">Erreur de chargement des données.</div>`;
  });
})();

function bindEvents() {
  const debounced = debounce(render, 300);

  if (searchInput)       searchInput.addEventListener('input', debounced);
  if (searchInputMobile) searchInputMobile.addEventListener('input', e => {
    if (searchInput) searchInput.value = e.target.value;
    debounced();
  });

  if (typeFilter)    typeFilter.addEventListener('change', render);
  if (countryFilter) countryFilter.addEventListener('input', debounced);
  if (tagsFilter)    tagsFilter.addEventListener('input', debounced);
  if (sortSelect)    sortSelect.addEventListener('change', render);
}

// ============ DATA ============
async function loadData() {
  // Ordre : sheetJsonUrl -> sheetCsvUrl -> data/sample.json
  if (cfg.sheetJsonUrl) {
    ALL_DATA = await fetch(cfg.sheetJsonUrl).then(r => r.json());
  } else if (cfg.sheetCsvUrl) {
    const csv = await fetch(cfg.sheetCsvUrl).then(r => r.text());
    ALL_DATA = csvToJson(csv);
  } else {
    // Local JSON par défaut
    ALL_DATA = await fetch('data/sample.json').then(r => r.json());
  }

  // Normalisation minimale
  ALL_DATA = (ALL_DATA || [])
    .filter(row => row.title && row.apply_url && (row.deadline || row.deadline === "")) // certaines offres n'ont pas de deadline
    .map(row => ({
      ...row,
      id: row.id || slugify(`${row.title}-${row.deadline || 'no-deadline'}`),
      deadlineDate: toDate(row.deadline || null),
      createdDate: toDate(row.created_at || row.posted_at || row.updated_at || row.deadline || null)
    }));
}

// ============ RENDU ============
function render() {
  if (!listFeed) return;

  const q       = (searchInput?.value || '').trim().toLowerCase();
  const type    = (typeFilter?.value || '').toLowerCase();
  const country = (countryFilter?.value || '').toLowerCase();
  const tags    = (tagsFilter?.value || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

  let data = [...ALL_DATA];

  // Recherche texte
  if (q) {
    data = data.filter(d =>
      [d.title, d.type, d.country, d.organization, (d.tags || []).join(' '), d.description_short]
        .filter(Boolean)
        .some(v => v.toLowerCase().includes(q))
    );
  }

  // Filtres
  if (type)    data = data.filter(d => (d.type || '').toLowerCase() === type);
  if (country) data = data.filter(d => (d.country || '').toLowerCase().includes(country));
  if (tags.length) {
    data = data.filter(d => tags.every(t => (d.tags || []).map(x => String(x).toLowerCase()).includes(t)));
  }

  // Tri
  const sort = sortSelect?.value || 'created_desc';
  data.sort((a, b) => {
    if (sort === 'deadline_asc') return (a.deadlineDate || Infinity) - (b.deadlineDate || Infinity);
    if (sort === 'created_desc') return (b.createdDate || 0) - (a.createdDate || 0);
    if (sort === 'created_asc')  return (a.createdDate || 0) - (b.createdDate || 0);
    if (sort === 'title_asc')    return a.title.localeCompare(b.title, 'fr');
    return 0;
  });

  renderList(data);
}

function renderList(items) {
  listFeed.innerHTML = '';
  if (!items.length) {
    listFeed.innerHTML = `<div class="text-center text-muted py-5">Aucun résultat.</div>`;
    return;
  }

  const deadlineProcheDays = cfg.deadlineProcheDays ?? 14;
  const newThresholdDays   = cfg.newThresholdDays ?? 7;

  for (const it of items) {
    // Badges
    const badges = [];
    if (it.deadlineDate && it.deadlineDate < today) {
      badges.push('<span class="badge text-bg-secondary ms-2">Expirée</span>');
    } else if (it.deadlineDate) {
      const delta = daysBetween(it.deadlineDate, today);
      if (delta >= 0 && delta <= deadlineProcheDays) {
        badges.push('<span class="badge text-bg-danger ms-2"><i class="bi bi-alarm me-1"></i>Deadline proche</span>');
      }
      if (it.createdDate) {
        const age = daysBetween(today, it.createdDate);
        if (age <= newThresholdDays) {
          badges.push('<span class="badge text-bg-success ms-2"><i class="bi bi-sparkles me-1"></i>Nouveau</span>');
        }
      }
    }

    // Ligne
    const row = document.createElement('div');
    row.className = 'list-item p-3 p-md-4';
    row.innerHTML = `
      <div class="row g-3 align-items-center">
        <div class="col-3 col-md-2">
          <img class="list-thumb w-100" src="${escapeHtml(it.image || `https://picsum.photos/seed/${encodeURIComponent(it.id)}/300/200`)}" alt="${escapeHtml(it.title)}" />
        </div>
        <div class="col-md-7 col-9 list-body">
          <div class="list-title mb-1">${escapeHtml(it.title)}</div>
          <div class="small list-meta mb-2"><i class="bi bi-geo-alt-fill me-1"></i><em>${escapeHtml(it.country || '')}</em> · ${escapeHtml(it.organization || '')}</div>
          <div class="small text-muted">
            ${it.deadlineDate ? `Date limite : <strong>${formatDate(it.deadlineDate)}</strong>` : `<em>Sans date limite</em>`}
            ${badges.join('')}
          </div>
        </div>
        <div class="col-md-3 d-flex align-items-center justify-content-md-end mt-2 mt-md-0">
          <div class="text-end w-100 w-md-auto">
            <span class="badge-type d-inline-block mb-2">${escapeHtml(it.type || 'Autre')}</span>
            <div class="d-grid gap-2">
              <button class="btn btn-outline-secondary btn-sm rounded-pill" data-id="${it.id}" data-action="details"><i class="bi bi-eye me-1"></i> Détails</button>
              <a class="btn btn-primary btn-sm rounded-pill" href="${it.apply_url}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right me-1"></i> Postuler</a>
            </div>
          </div>
        </div>
      </div>
    `;

    row.querySelector('[data-action="details"]').addEventListener('click', () => openDetails(it));
    listFeed.appendChild(row);
  }
}

// ============ MODAL ============
function openDetails(it) {
  document.getElementById('modalTitle').textContent = it.title;
  document.getElementById('modalContent').innerHTML = `
    <div class="mb-2"><strong>Type :</strong> ${escapeHtml(it.type || '')}</div>
    <div class="mb-2"><strong>Organisation :</strong> ${escapeHtml(it.organization || '')}</div>
    <div class="mb-2"><strong>Pays / Région :</strong> ${escapeHtml(it.country || '')}</div>
    <div class="mb-2"><strong>Date limite :</strong> ${it.deadlineDate ? formatDate(it.deadlineDate) : '—'}</div>
    ${it.funding_amount ? `<div class="mb-2"><strong>Montant / Bourse :</strong> ${escapeHtml(it.funding_amount)}</div>` : ''}
    <div class="mb-3"><strong>Description :</strong><br>${escapeHtml(it.description_long || it.description_short || '')}</div>
    ${Array.isArray(it.tags) && it.tags.length ? `<div class="mb-2"><strong>Tags :</strong> ${it.tags.map(escapeHtml).join(', ')}</div>` : ''}
  `;

  // Lien Candidater
  const link = document.getElementById('applyLink');
  if (link) link.href = it.apply_url;

  // Partage natif (Web Share API)
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.onclick = () => {
      const shareData = {
        title: it.title,
        text: `Découvrez cette opportunité : ${it.title}${it.description_short ? '\n\n' + it.description_short : ''}`,
        url: it.apply_url
      };
      if (navigator.share) {
        navigator.share(shareData).catch(console.error);
      } else {
        navigator.clipboard.writeText(it.apply_url).then(() => {
          alert("Lien copié dans le presse-papiers !");
        }).catch(console.error);
      }
    };
  }

  // Liens sociaux
  const ln = document.getElementById('shareLinkedin');
  const wa = document.getElementById('shareWhatsapp');
  const tw = document.getElementById('shareTwitter');
  const em = document.getElementById('shareEmail');

  const url = it.apply_url || location.href;
  const title = it.title || 'Opportunité';
  const txt = it.description_short || '';

  if (ln) ln.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(`Découvrez cette opportunité : ${title} ${url}`)}`;
  if (tw) tw.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  if (em) em.href = `mailto:?subject=${encodeURIComponent("Opportunité : " + title)}&body=${encodeURIComponent((txt ? txt + "\n\n" : "") + "Candidater ici : " + url)}`;

  // Afficher la modale
  new bootstrap.Modal(document.getElementById('detailsModal')).show();
}

// ============ OUTILS ============
function debounce(fn, wait = 300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}
function slugify(s='') {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function pad(n){ return String(n).padStart(2,'0'); }
function formatDate(d){ if(!d) return ''; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function csvToJson(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = (lines.shift() || '').split(',').map(h => h.trim());
  return lines.map(line => {
    const cells = line.match(/(?:\"([^\"]*)\")|([^,]+)/g)?.map(v => v.replace(/^\"|\"$/g,'')) || [];
    const obj = {}; headers.forEach((h,i)=> obj[h] = (cells[i]||'').trim());
    return {
      id: obj.id || slugify(`${obj.title}-${obj.deadline}`),
      title: obj.title || '',
      type: obj.type || 'Autre',
      organization: obj.organization || '',
      country: obj.country || '',
      deadline: obj.deadline || '',
      apply_url: obj.apply_url || '',
      description_short: obj.description_short || '',
      description_long: obj.description_long || '',
      tags: (obj.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      created_at: obj.created_at || obj.posted_at || ''
    };
  });
}
