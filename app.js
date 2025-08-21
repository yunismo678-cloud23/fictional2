
// Simple localStorage backend with optional Firebase hooks (commented)
const DB_KEY = 'freeads.ads.v1';

function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}

function getAds(){
  try{ return JSON.parse(localStorage.getItem(DB_KEY)) || [] }catch(e){ return [] }
}
function saveAds(list){ localStorage.setItem(DB_KEY, JSON.stringify(list)) }

function addAd(ad){
  const list = getAds();
  list.unshift(ad);
  saveAds(list);
  return ad.id;
}
function getAd(id){ return getAds().find(a=>a.id===id) }

// i18n
const I18N = {
  ar: {
    brand:"سوق مجاني", subtitle:"منصة إعلانات مبوبة مجانية — صورة واحدة لكل إعلان.",
    post:"أضف إعلان", search:"ابحث عن...", category:"الفئة", all:"الكل",
    price:"السعر", location:"الموقع", condition:"الحالة", details:"التفاصيل",
    singleImageNote:"يسمح بصورة واحدة للإعلان (مثل OLX).",
    createAd:"إنشاء إعلان", title:"العنوان", desc:"الوصف", phone:"رقم الهاتف", city:"المدينة",
    chooseCat:"اختر فئة", electronics:"إلكترونيات", vehicles:"مركبات", realestate:"عقارات", jobs:"وظائف", services:"خدمات", other:"أخرى",
    submit:"نشر", image:"الصورة (واحدة فقط)", posted:"تم نشر إعلانك!", invalid:"أكمل الحقول المطلوبة", back:"رجوع إلى الرئيسية",
    similar:"إعلانات مشابهة"
  },
  en: {
    brand:"FreeAds", subtitle:"Free classifieds — one image per ad.",
    post:"Post Ad", search:"Search...", category:"Category", all:"All",
    price:"Price", location:"Location", condition:"Condition", details:"Details",
    singleImageNote:"Only one image per ad (like OLX).",
    createAd:"Create Ad", title:"Title", desc:"Description", phone:"Phone", city:"City",
    chooseCat:"Choose a category", electronics:"Electronics", vehicles:"Vehicles", realestate:"Real Estate", jobs:"Jobs", services:"Services", other:"Other",
    submit:"Publish", image:"Image (single only)", posted:"Your ad is posted!", invalid:"Please fill required fields", back:"Back to Home",
    similar:"Similar Ads"
  }
};

let lang = localStorage.getItem('freeads.lang') || 'ar';
function setLang(l){ lang = l; localStorage.setItem('freeads.lang', l); document.documentElement.dir = (l==='ar'?'rtl':'ltr'); applyTexts(); }
function t(key){ return (I18N[lang] && I18N[lang][key]) || key }
function applyTexts(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')) })
  document.title = t('brand') + " | " + t('subtitle');
}

// Render cards
function renderAds(filter=''){
  const grid = document.getElementById('grid');
  if(!grid) return;
  const q = filter.toLowerCase();
  const list = getAds().filter(a=> (a.title||'').toLowerCase().includes(q) || (a.city||'').toLowerCase().includes(q) || (a.category||'').toLowerCase().includes(q));
  grid.innerHTML = list.map(a=> `
    <a class="card" href="ad.html?id=${encodeURIComponent(a.id)}" aria-label="${a.title}">
      <img loading="lazy" src="${a.image||''}" alt="${a.title}"/>
      <div class="p">
        <span class="badge">${a.category||''}</span>
        <div class="price">${a.price? a.price + ' EGP':''}</div>
        <div style="margin-top:6px;font-weight:700">${a.title||''}</div>
        <div class="small">${a.city||''}</div>
      </div>
    </a>
  `).join('') || `<div class="notice">${lang==='ar'?'لا توجد نتائج. أضف أول إعلان لك.':'No results. Be the first to post.'}</div>`;
}

// Create ad
function handlePost(){
  const f = document.getElementById('adForm');
  if(!f) return;
  const imgInput = document.getElementById('image');
  let imgData = '';
  imgInput.addEventListener('change', e=> {
    if(imgInput.files.length>1){ alert(t('singleImageNote')); imgInput.value=''; return }
    const file = imgInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { imgData = reader.result }
    reader.readAsDataURL(file);
  });

  f.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    if(!data.title || !data.category){ alert(t('invalid')); return }
    const ad = {
      id: uid(), title:data.title, desc:data.desc||'', category:data.category, price:data.price||'',
      city:data.city||'', phone:data.phone||'', image:imgData||'', createdAt:Date.now()
    };
    addAd(ad);
    alert(t('posted'));
    window.location.href = "ad.html?id="+ad.id;
  });
}

// Ad page
function renderAdPage(){
  const wrap = document.getElementById('adWrap');
  if(!wrap) return;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const ad = getAd(id);
  if(!ad){ wrap.innerHTML = `<div class="alert">Ad not found.</div>`; return }
  // Fill
  document.getElementById('adTitle').textContent = ad.title;
  document.getElementById('adImg').src = ad.image || '';
  document.getElementById('adPrice').textContent = ad.price ? ad.price+' EGP' : '';
  document.getElementById('adCity').textContent = ad.city || '';
  document.getElementById('adPhone').textContent = ad.phone || '';
  document.getElementById('adDesc').textContent = ad.desc || '';

  // Similar
  const sim = getAds().filter(a=> a.category===ad.category && a.id!==ad.id).slice(0,6);
  document.getElementById('similar').innerHTML = sim.map(a=>`
    <a class="card" href="ad.html?id=${encodeURIComponent(a.id)}">
      <img loading="lazy" src="${a.image||''}" alt="${a.title}"/>
      <div class="p"><div style="font-weight:700">${a.title}</div><div class="small">${a.city}</div></div>
    </a>
  `).join('') || `<div class="notice">${lang==='ar'?'لا توجد إعلانات مشابهة الآن.':'No similar ads yet.'}</div>`;

  // JSON-LD
  const ld = {
    "@context":"https://schema.org",
    "@type":"Product",
    "name": ad.title,
    "description": ad.desc,
    "image": ad.image || "",
    "offers": {
      "@type":"Offer",
      "priceCurrency":"EGP",
      "price": ad.price || "0",
      "availability":"https://schema.org/InStock"
    }
  };
  const script = document.createElement('script');
  script.type='application/ld+json';
  script.text = JSON.stringify(ld);
  document.head.appendChild(script);
}

// AdSense placeholder injection
function injectAdSense(){
  // Replace YOUR-ADSENSE-PUBLISHER-ID with real ID when ready.
  const script = document.createElement('script');
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR-ADSENSE-PUBLISHER-ID";
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  setLang(localStorage.getItem('freeads.lang') || 'ar');
  injectAdSense();
  renderAds();
  handlePost();
  renderAdPage();

  // Search
  const s = document.getElementById('search');
  if(s){ s.addEventListener('input', e=> renderAds(e.target.value)) }
});
