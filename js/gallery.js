// js/galerie.js
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Настройки ----------
  const CARD_RATIO = '3 / 2';       // 16/9 | 3/2 | 1/1
  const IMAGE_FIT  = 'cover';       // 'cover' (модно) или 'contain'
  const DEF_W = 1200, DEF_H = 800;  // подсказка для резервирования места

  // Язык для ALT
let curLang = 'de';
try { curLang = localStorage.getItem('siteLang') || 'de'; } catch(e) {}

  // Источники
const imagePaths = [
    'images/event/event-1.webp','images/event/event-2.webp','images/event/event-3.webp',
    'images/event/event-4.webp','images/event/event-5.webp','images/event/event-6-1.webp',
    'images/event/event-7.webp','images/event/event-8.webp','images/event/event-9.webp',
    'images/event/event-10.webp','images/event/event-11.webp','images/event/event-12.webp',
    'images/event/event-13.webp','images/event/event-14.webp','images/event/event-15.webp',
    'images/event/event-16.webp','images/event/event-17.webp','images/event/event-18.webp',
    'images/event/event-19.webp','images/event/event-20.webp','images/event/event-21.webp'
];

const altDE = [
    "Hochzeit Catering Hameln","Eventservice Niedersachsen","Catering Buffet Hameln",
    "Hochzeitstorte Niedersachsen","Party Catering Hannover","Catering mit Servicepersonal",
    "Buffet Hochzeit Niedersachsen","Event Buffet Hameln","Hochzeit in Bad Pyrmont",
    "Catering für Firmenfeier","Russischer Abend Niedersachsen","Fingerfood Catering Hameln",
    "Hochzeitstafel Niedersachsen","Eventdekoration Hameln","Candy Bar Hochzeit",
    "Menü für Firmenfeier","Hochzeit Empfang","Eventservice NRW",
    "Hochzeit Catering Buffet","Abendveranstaltung Niedersachsen","Hochzeit Catering in Hannover"
];
const altRU = [
    "Кейтеринг на свадьбу Гамельн","Ивент-сервис Нижняя Саксония","Кейтеринг-буфет Гамельн",
    "Свадебный торт Нижняя Саксония","Кейтеринг на вечеринку Ганновер","Кейтеринг с персоналом",
    "Буфет на свадьбу Нижняя Саксония","Ивент-буфет Гамельн","Свадьба в Бад-Пырмонте",
    "Кейтеринг для корпоратива","Русский вечер Нижняя Саксония","Фингерфуд кейтеринг Гамельн",
    "Свадебный стол Нижняя Саксония","Декор мероприятия Гамельн","Кэнди-бар на свадьбу",
    "Меню для корпоратива","Фуршет на свадьбе","Ивент-сервис NRW",
    "Кейтеринг-буфет на свадьбу","Вечернее мероприятие Нижняя Саксония","Кейтеринг в Ганновере"
];
const altFallback = "Vilana Event & Catering – Event Catering Niedersachsen";

  // DOM
const gallery  = document.getElementById('gallery');
const lb       = document.getElementById('lightbox');
const lbImg    = document.getElementById('lightbox-image');
const btnPrev  = document.getElementById('lightbox-prev');
const btnNext  = document.getElementById('lightbox-next');
const btnClose = document.getElementById('lightbox-close');

if (!gallery) return;

  // ---------- Построение сетки ----------
const objFit = (IMAGE_FIT === 'cover') ? 'object-cover' : 'object-contain';
const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
        }
        });
    }, { threshold: 0.18 })
    : null;

const frag = document.createDocumentFragment();
const altArr = (curLang === 'ru' ? altRU : altDE);

imagePaths.forEach((src, i) => {
    const fig = document.createElement('figure');
    fig.className = 'group relative overflow-hidden rounded-xl shadow-md bg-white ring-1 ring-black/5 reveal';
    fig.style.aspectRatio = CARD_RATIO;

    // Превью-слой "blur-up"
    const preview = document.createElement('div');
    preview.className = 'absolute inset-0 bg-gray-200 blur-up';
    fig.appendChild(preview);

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Vilana Event & Catering – ${altArr[i] || altDE[i] || altFallback}`;
    img.width = DEF_W; img.height = DEF_H;
    img.decoding = 'async';
    img.loading = (i < 3) ? 'eager' : 'lazy';
    if (i === 0) img.fetchPriority = 'high';

    img.className = `w-full h-full ${objFit} bg-gray-100 transition-transform duration-300 group-hover:scale-105`;

    img.addEventListener('load', () => { preview.classList.add('lazyloaded'); });
    img.addEventListener('error', () => { console.error('Bild nicht gefunden:', src); });

    img.addEventListener('click', () => openLightbox(i));

    fig.appendChild(img);
    frag.appendChild(fig);

    if (io) io.observe(fig);
});

gallery.appendChild(frag);

  // ---------- Лайтбокс ----------
let current = 0;
let animLock = false;

function openLightbox(i){
    current = i;
    updateLightbox(false);
    lb?.classList.remove('hidden');
    lb?.classList.add('flex');
    document.body.style.overflow = 'hidden';
}
function closeLightbox(){
    lb?.classList.add('hidden');
    lb?.classList.remove('flex');
    lbImg && (lbImg.src = '');
    lbImg?.classList.remove('zoomed');
    document.body.style.overflow = '';
}

function slide(to){
    if (animLock) return;
    animLock = true;
    const dir = (to === 'next') ? -1 : 1;
    lbImg?.classList.add('transition-transform','duration-200');
    lbImg.style.transform = `translateX(${dir*40}px)`;
    lbImg.style.opacity = '0';
    setTimeout(() => {
    current = (to === 'next')
        ? (current + 1) % imagePaths.length
        : (current - 1 + imagePaths.length) % imagePaths.length;
    updateLightbox(false);
    lbImg.style.transform = `translateX(${dir*-8}px)`;
    setTimeout(() => {
        lbImg.style.transform = 'translateX(0)';
        lbImg.style.opacity = '1';
        animLock = false;
    }, 120);
    }, 120);
}

function updateLightbox(preloadOnly){
    if (!lbImg) return;
    lbImg.src = imagePaths[current];
    if (!preloadOnly) preloadNeighbours(current);
}

function preloadNeighbours(i){
    [ (i+1)%imagePaths.length, (i-1+imagePaths.length)%imagePaths.length ].forEach(idx=>{
    const im = new Image(); im.src = imagePaths[idx];
    });
}

function toggleZoom(){ lbImg?.classList.toggle('zoomed'); }

btnClose?.addEventListener('click', closeLightbox);
btnPrev ?.addEventListener('click', () => slide('prev'));
btnNext ?.addEventListener('click', () => slide('next'));
lbImg   ?.addEventListener('click', toggleZoom);

lb?.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

document.addEventListener('keydown', (e) => {
    if (lb?.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  slide('prev');
    if (e.key === 'ArrowRight') slide('next');
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleZoom(); }
});

  // свайпы
let startX=0,startY=0,swiping=false;
lbImg?.addEventListener('touchstart',(e)=>{ const t=e.changedTouches[0]; startX=t.clientX; startY=t.clientY; swiping=true; },{passive:true});
lbImg?.addEventListener('touchend',(e)=>{
    if(!swiping) return; const t=e.changedTouches[0];
    const dx=t.clientX-startX, dy=t.clientY-startY; swiping=false;
    if(Math.abs(dx)>50 && Math.abs(dy)<40){ dx<0 ? slide('next') : slide('prev'); }
});
});
