import { WORKS, HIGHLIGHTS, POCKET } from './works.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Движение: уважаем системную настройку, но ?motion=1 включает всё и запоминается. */
const qs = new URLSearchParams(location.search);
let forced = qs.get('motion') === '1';
try {
  if (qs.has('motion')) localStorage.setItem('motion', qs.get('motion'));
  forced = localStorage.getItem('motion') === '1';
} catch { /* хранилище недоступно */ }
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches && !forced;
root.classList.toggle('rm', RM);

const EO = 'cubic-bezier(.16,1,.3,1)';
const mqWide = matchMedia('(min-width:900px) and (min-height:560px)');
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
const byId = Object.fromEntries(WORKS.map((w) => [w.id, w]));
const play = (v) => { if (v && !RM) v.play().catch(() => {}); };
const onView = (el, fn, opt) => el && new IntersectionObserver(([e]) => fn(e.isIntersecting, e), opt).observe(el);

/* ── типограф: короткие слова не висят в конце строки, слова через дефис не рвутся ── */
const NB = '\u00a0';
const tp = (s) => s
  .replace(/(?<![а-яёА-ЯЁa-zA-Z0-9-])([а-яёА-ЯЁ]{1,2}|для|без|что|как|или|над|под|при|про|это|нет|его|уже|ещё|все|всё|чем|где|кто|так)[ \n]+/g, `$1${NB}`)
  .replace(/([а-яёА-ЯЁA-Za-z0-9])-(?=[а-яёА-ЯЁA-Za-z])/g, '$1-⁠')
  .replace(/ (—|–) /g, `${NB}$1 `)
  .replace(/(\d) (?=[₽а-яё\d])/g, `$1${NB}`);
{
  const tw = document.createTreeWalker($('main'), NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (tw.nextNode()) nodes.push(tw.currentNode);
  for (const n of nodes) if (n.nodeValue.trim()) n.nodeValue = tp(n.nodeValue);
}

const macHTML = (inner) => `<div class="mac"><div class="mac__lid"><div class="mac__scr">${inner}</div></div><div class="mac__base"></div></div>`;
const iphHTML = (inner) => `<div class="iph"><div class="iph__in"><div class="iph__scr">${inner}</div></div></div>`;
const vidHTML = (id) => `<video muted loop playsinline preload="none" poster="media/${id}.jpg" data-src="media/${id}.mp4"></video>`;
const arm = (v) => { if (v && !v.src && v.dataset.src) v.src = v.dataset.src; return v; };

const scrollFns = [];
const resizeFns = [];

/* ── первый экран: MacBook с шоурилом, при прокрутке экран разворачивается на всю страницу ── */
const hero = $('.hero');
if (hero) {
  const heroPin = $('.hero__pin'), heroMac = $('.hero__mac'), heroScr = $('.mac__scr', heroMac);
  const heroTxt = $('.hero__txt'), heroIph = $('.hero__iph'), glow = $('.glow');
  const heroVids = $$('video', hero);
  let Z = null;
  const offsetIn = (el, stop) => { let x = 0, y = 0; while (el && el !== stop) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return [x, y]; };
  const measure = () => {
    const on = mqWide.matches && !RM;
    hero.classList.toggle('is-zoom', on);
    if (!on) {
      Z = null;
      for (const el of [heroMac, heroTxt, heroIph, glow]) el.removeAttribute('style');
      heroPin.style.removeProperty('--cap');
      return;
    }
    const [mx, my] = offsetIn(heroMac, heroPin), [sx, sy] = offsetIn(heroScr, heroPin);
    const sw = heroScr.offsetWidth, sh = heroScr.offsetHeight, pw = heroPin.clientWidth, ph = heroPin.clientHeight;
    Z = { tx: pw / 2 - (sx + sw / 2), ty: ph / 2 - (sy + sh / 2), S: Math.max(pw / sw, ph / sh) * 1.03 };
    heroMac.style.transformOrigin = `${sx - mx + sw / 2}px ${sy - my + sh / 2}px`;
  };
  const update = () => {
    if (!Z) return;
    const r = hero.getBoundingClientRect();
    if (r.bottom < -50) return;
    const p = clamp(-r.top / (r.height - innerHeight));
    const a = ease(clamp((p - .03) / .64));
    heroMac.style.transform = `translate(${Z.tx * a}px,${Z.ty * a}px) scale(${1 + (Z.S - 1) * a})`;
    const t = clamp(p / .2);
    heroTxt.style.opacity = 1 - t;
    heroTxt.style.transform = `translateY(${-70 * t}px)`;
    heroTxt.style.pointerEvents = t > .6 ? 'none' : '';
    const k = clamp(p / .32);
    heroIph.style.opacity = 1 - k;
    heroIph.style.transform = `translate(${k * 26}vw,${k * 8}vh) scale(${1 + k * .5})`;
    glow.style.opacity = .34 * (1 - a);
    heroPin.style.setProperty('--cap', clamp((p - .72) / .13));
  };
  onView(hero, (on) => { hero.classList.toggle('is-live', on); heroVids.forEach((v) => (on ? play(v) : v.pause())); }, { threshold: .05 });
  scrollFns.push(update); resizeFns.push(measure);
  measure();
}
onView($('.brief'), (on, e) => e.target.classList.toggle('is-live', on));

/* ── заявление: слова загораются по мере прокрутки ── */
const sayT = $('[data-light]');
if (sayT) {
  sayT.innerHTML = sayT.textContent.trim().split(/ +/).map((x) => `<span>${x}</span>`).join(' ');
  const words = $$('span', sayT);
  scrollFns.push(() => {
    if (RM) return;
    const r = sayT.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    const n = Math.round(clamp((innerHeight * .86 - r.top) / (r.height + innerHeight * .3)) * words.length);
    words.forEach((s, i) => s.classList.toggle('on', i < n));
  });
}

/* ── решения: видео в устройствах играют, пока видны ── */
$$('.fx__v video').forEach((v) => onView(v, (on) => (on ? play(arm(v)) : v.pause()), { threshold: .2 }));

/* ── одна заявка, два исхода: переключатель + один автопоказ «как с нами» ── */
const day = $('.day');
if (day) {
  const btns = $$('.day__seg button'), lines = $$('.tl', day);
  let touched = false, timer = 0;
  const set = (s) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', b.dataset.s === s));
    lines.forEach((l) => l.classList.toggle('is-on', l.dataset.s === s));
    day.dataset.s = s;
  };
  btns.forEach((b) => b.addEventListener('click', () => { touched = true; clearTimeout(timer); set(b.dataset.s); }));
  onView($('.day__card'), (on) => {
    clearTimeout(timer);
    if (on && !touched) timer = setTimeout(() => { if (!touched) { touched = true; set('march'); } }, 4200);
  }, { threshold: .6 });
  set('now');
}

/* ── примеры: карусель с автопрокруткой ── */
const viewer = $('.viewer');
const hlScroll = $('.hl__scroll');
if (hlScroll) {
  const hlTrack = $('.hl__track'), dotsEl = $('.dots');
  const hlPlay = $('.hl__play'), hlPrev = $('.hl__prev'), hlNext = $('.hl__next');
  const SLIDE_MS = 6500;
  hlTrack.innerHTML = HIGHLIGHTS.map((h) => {
    const w = byId[h.id];
    return `<a class="hl__s" href="${w.url}" target="_blank" rel="noopener" data-open="${w.id}" style="--tint:${w.tint}" draggable="false">
      <div class="hl__txt"><div><p class="hl__k"><b>${w.name}</b>&ensp;${h.k || w.kind}</p><p class="hl__line">${tp(h.line)}</p></div><span class="more">Открыть вживую</span></div>
      <div class="hl__vis">${w.phone ? iphHTML(vidHTML(w.id)) : macHTML(vidHTML(w.id))}</div>
    </a>`;
  }).join('');
  dotsEl.innerHTML = HIGHLIGHTS.map((h, i) => `<button class="dot" role="tab" aria-label="${byId[h.id].name}" data-i="${i}"><i></i></button>`).join('');
  const slides = $$('.hl__s', hlTrack), dots = $$('.dot', dotsEl);
  let hi = -1, hlProg = 0, hlPaused = RM, hlSeen = false, hlLast = 0;
  const slideStep = () => slides[0].offsetWidth + 20;
  const hlSet = (i) => {
    if (i === hi) return;
    hi = i; hlProg = 0;
    slides.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      const v = $('video', s);
      if (k === i) { arm(v); if (hlSeen) play(v); } else v.pause();
      if (Math.abs(k - i) === 1) arm(v);
    });
    dots.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', k === i); d.style.setProperty('--p', 0); });
    hlPrev.disabled = i === 0; hlNext.disabled = i === slides.length - 1;
  };
  const hlGo = (i) => hlScroll.scrollTo({ left: clamp(i, 0, slides.length - 1) * slideStep(), behavior: RM ? 'auto' : 'smooth' });
  hlScroll.addEventListener('scroll', () => hlSet(clamp(Math.round(hlScroll.scrollLeft / slideStep()), 0, slides.length - 1)), { passive: true });
  dots.forEach((d) => d.addEventListener('click', () => hlGo(+d.dataset.i)));
  hlPrev.addEventListener('click', () => hlGo(hi - 1));
  hlNext.addEventListener('click', () => hlGo(hi + 1));
  hlPlay.addEventListener('click', () => {
    hlPaused = !hlPaused;
    hlPlay.classList.toggle('is-paused', hlPaused);
    hlPlay.setAttribute('aria-label', hlPaused ? 'Продолжить' : 'Пауза');
    const v = $('video', slides[hi]);
    hlPaused ? v.pause() : play(v);
  });
  hlPlay.classList.toggle('is-paused', hlPaused);
  const tick = (now) => {
    const dt = Math.min(100, now - hlLast); hlLast = now;
    if (hlSeen && !hlPaused && !viewer?.open && !document.hidden) {
      hlProg += dt / SLIDE_MS;
      dots[hi]?.style.setProperty('--p', clamp(hlProg));
      if (hlProg >= 1) { hlProg = 0; hlGo(hi === slides.length - 1 ? 0 : hi + 1); }
    }
    if (hlSeen) requestAnimationFrame(tick);
  };
  onView(hlScroll, (on) => {
    const was = hlSeen; hlSeen = on;
    const v = $('video', slides[Math.max(hi, 0)]);
    if (hlSeen && !was) { if (!hlPaused) play(arm(v)); hlLast = performance.now(); requestAnimationFrame(tick); }
    if (!hlSeen) v?.pause();
  }, { threshold: .35 });
  hlSet(0);
}

/* ── все работы: сетка, фильтр, видео по наведению ── */
const grid = $('.grid');
if (grid) {
  grid.innerHTML = WORKS.map((w, i) => `
    <a class="tile" href="${w.url}" target="_blank" rel="noopener" data-open="${w.id}" data-cat="${w.cat.join(' ')}" style="--tint:${w.tint};--d:${i % 3};view-transition-name:t-${w.id}" data-rv>
      <div class="tile__h"><p class="tile__k">${w.kind}</p><h3 class="tile__n">${w.name}</h3><p class="tile__w">${tp(w.what)}</p></div>
      <div class="tile__m${w.phone ? ' is-phone' : ''}">${w.phone ? iphHTML(`<img src="media/${w.id}.jpg" alt="" loading="lazy">`) : `<img src="media/${w.id}.jpg" alt="" loading="lazy">`}</div>
      <span class="plus" aria-hidden="true"></span>
    </a>`).join('');
  const tiles = $$('.tile', grid);
  if (finePointer && !RM) {
    tiles.forEach((t) => {
      const box = $('.iph__scr', t) || $('.tile__m', t);
      t.addEventListener('pointerenter', () => {
        let v = $('video', box);
        if (!v) { v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, src: `media/${t.dataset.open}.mp4` }); box.append(v); }
        play(v);
      });
      t.addEventListener('pointerleave', () => $('video', box)?.pause());
    });
  }
  const segBtns = $$('.works__seg button');
  segBtns.forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.f;
    const apply = () => {
      segBtns.forEach((o) => o.setAttribute('aria-pressed', o === b));
      grid.classList.toggle('is-f', f !== 'all');
      tiles.forEach((t) => { t.classList.add('in'); t.style.setProperty('--d', 0); t.hidden = f !== 'all' && !t.dataset.cat.split(' ').includes(f); });
    };
    if (document.startViewTransition && !RM) document.startViewTransition(apply); else apply();
  }));
}

/* ── под телефон: закреплённый iPhone, экран меняется по прокрутке ── */
const pocket = $('.pocket');
if (pocket) {
  const pScr = $('.pocket__iph .iph__scr');
  $('.pocket__steps').innerHTML = POCKET.map((s) => `<div class="pstep"><h3>${tp(s.h)}</h3><p>${tp(s.p)}</p><a class="more" href="${byId[s.id].url}" target="_blank" rel="noopener" data-open="${s.id}">Открыть вживую</a></div>`).join('');
  $('.pocket__nums').innerHTML = POCKET.map((s, i) => `<button class="pnum" data-i="${i}">${byId[s.id].name}</button>`).join('');
  pScr.innerHTML = POCKET.map((s) => `<div class="player">${vidHTML(s.media)}</div>`).join('');
  $('.pocket__m').innerHTML = POCKET.map((s) => `<a class="pcard" href="${byId[s.id].url}" target="_blank" rel="noopener"><h3>${tp(s.h)}</h3><p>${tp(s.p)}</p>${iphHTML(`<img src="media/${s.media}.jpg" alt="" loading="lazy">`)}</a>`).join('');
  const pSteps = $$('.pstep'), pNums = $$('.pnum'), pPlayers = $$('.player', pScr);
  let pi = -1;
  scrollFns.push(() => {
    if (!mqWide.matches) return;
    const r = pocket.getBoundingClientRect();
    if (!(r.top < innerHeight && r.bottom > 0)) { if (pi >= 0) pPlayers[pi].firstChild.pause(); return; }
    const i = Math.floor(clamp(-r.top / (r.height - innerHeight), 0, .999) * POCKET.length);
    const v = pPlayers[i].firstChild;
    if (i !== pi) {
      pi = i;
      pSteps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      pNums.forEach((s, k) => s.classList.toggle('is-on', k === i));
      pPlayers.forEach((s, k) => { s.classList.toggle('is-on', k === i); if (k !== i) s.firstChild.pause(); });
      arm(v);
    }
    if (v.paused) play(v);
  });
  pNums.forEach((b, i) => b.addEventListener('click', () => scrollTo({ top: pocket.getBoundingClientRect().top + scrollY + ((i + .5) / POCKET.length) * (pocket.offsetHeight - innerHeight), behavior: RM ? 'auto' : 'smooth' })));
}

/* ── появление блоков ── */
{
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-rv]').forEach((el) => io.observe(el));
}

/* ── прокрутка: шапка светлеет над светлыми частями, фото основателя чуть плывёт ── */
const nav = $('.nav'), lights = $$('.light'), whoImg = $('.who__ph img');
scrollFns.push(() => {
  nav.classList.toggle('is-light', lights.some((l) => { const r = l.getBoundingClientRect(); return r.top <= 26 && r.bottom > 26; }));
  if (!RM && whoImg) {
    const wr = whoImg.parentElement.getBoundingClientRect();
    if (wr.top < innerHeight && wr.bottom > 0) whoImg.style.setProperty('--py', `${((wr.top + wr.height / 2) / innerHeight - .5) * -30}px`);
  }
});
const onScroll = () => scrollFns.forEach((f) => f());
let ticking = false;
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { resizeFns.forEach((f) => f()); onScroll(); }, 150); });

/* ── живой просмотр: настоящий сайт работы открывается поверх страницы ── */
if (viewer) {
  const vSheet = $('.viewer__sheet'), vFrame = $('iframe', viewer), vOut = $('.viewer__out');
  const vModes = $$('[data-mode]', viewer);
  const setMode = (m) => { viewer.classList.toggle('is-phone', m === 'phone'); vModes.forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === m)); };
  vModes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  const open = (w, from) => {
    $('.viewer__n b').textContent = w.name;
    $('.viewer__n span').textContent = w.kind;
    vOut.href = w.url;
    setMode(w.phone || from?.closest('.fx__v--ph, .fx:has(.fx__v--ph)') ? 'phone' : 'desk');
    vFrame.src = w.url;
    root.style.overflow = 'hidden';
    viewer.showModal();
    if (RM) return;
    viewer.animate({ opacity: [0, 1] }, { duration: 260, easing: 'ease-out' });
    const a = from?.getBoundingClientRect(), b = vSheet.getBoundingClientRect();
    if (a?.width) vSheet.animate({ transform: [`translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})`, 'none'] }, { duration: 720, easing: EO });
  };
  viewer.addEventListener('close', () => { vFrame.src = 'about:blank'; root.style.overflow = ''; });
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  $('.viewer__x').addEventListener('click', () => viewer.close());
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open]');
    if (!t || innerWidth < 900 || e.metaKey || e.ctrlKey || e.shiftKey) return; // на телефоне ссылка просто откроет сайт
    e.preventDefault();
    open(byId[t.dataset.open], t.closest('.tile, .hl__s, .fx')?.querySelector('.fx__v') || t.closest('.tile, .hl__s') || $('.pocket__iph') || t);
  });
}

/* ── заявка: сообщение в Telegram собирается из выбранного ── */
const briefBtn = $('.brief__btn');
if (briefBtn && $('.chip')) {
  const build = () => {
    const v = (g) => $(`.chip[data-g="${g}"][aria-pressed="true"]`).dataset.v;
    briefBtn.href = 'https://t.me/marchvlvv?text=' + encodeURIComponent(`Здравствуйте! ${v('what')}. Бюджет ${v('money')}, сроки ${v('when')}. Хочу разобрать, что можно поставить.`);
  };
  $$('.chip').forEach((c) => c.addEventListener('click', () => {
    $$(`.chip[data-g="${c.dataset.g}"]`).forEach((o) => o.setAttribute('aria-pressed', o === c));
    build();
  }));
  build();
}

onScroll();
