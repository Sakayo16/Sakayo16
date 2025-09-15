// Utilitaires dates
}
}


function openDetails(it) {
document.getElementById('modalTitle').textContent = it.title;
document.getElementById('modalContent').innerHTML = `
<div class="mb-2"><strong>Type :</strong> ${escapeHtml(it.type||'')}</div>
<div class="mb-2"><strong>Organisation :</strong> ${escapeHtml(it.organization||'')}</div>
<div class="mb-2"><strong>Pays / Région :</strong> ${escapeHtml(it.country||'')}</div>
<div class="mb-2"><strong>Date limite :</strong> ${formatDate(it.deadlineDate)}</div>
${it.funding_amount ? `<div class="mb-2"><strong>Montant / Bourse :</strong> ${escapeHtml(it.funding_amount)}</div>` : ''}
<div class="mb-3"><strong>Description :</strong><br>${escapeHtml(it.description_long||it.description_short||'')}</div>
${Array.isArray(it.tags) ? `<div class="mb-2"><strong>Tags :</strong> ${it.tags.map(escapeHtml).join(', ')}</div>`:''}
`;
const link = document.getElementById('applyLink');
link.href = it.apply_url;
const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
modal.show();
}


// Outils
function debounce(fn, wait=300) {
let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}
function slugify(s='') { return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function escapeHtml(s='') { return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }
function pad(n){ return String(n).padStart(2,'0'); }
function formatDate(d){ if(!d) return ''; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }


function csvToJson(csv) {
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = lines.shift().split(',').map(h=>h.trim());
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
tags: (obj.tags||'').split(',').map(s=>s.trim()).filter(Boolean),
created_at: obj.created_at || obj.posted_at || ''
};
});
}


// Cookie consent minimal
function setupCookieBanner(){
const banner = document.getElementById('cookieBanner');
if (!banner) return;
const key = 'cookie_consent';
if (!localStorage.getItem(key)) banner.classList.remove('d-none');
document.getElementById('cookieAccept').onclick = ()=>{ localStorage.setItem(key,'yes'); banner.classList.add('d-none'); };
document.getElementById('cookieReject').onclick = ()=>{ localStorage.setItem(key,'no'); banner.classList.add('d-none'); };
}
