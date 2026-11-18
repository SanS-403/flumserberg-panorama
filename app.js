// Flumserberg Panorama: menu, header state, lightbox, click-to-load map, inquiry form (form service + mailto fallback). No dependencies, no tracking.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Header shadow after scroll
  const header = $('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const menuBtn = $('.menu-btn');
  const nav = $('#nav');
  if (menuBtn && nav) {
    const label = menuBtn.querySelector('.sr-only');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? menuBtn.dataset.close : menuBtn.dataset.open;
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); menuBtn.focus(); } });
  }

  // Lightbox
  const dlg = $('#lightbox');
  const photos = window.P8_PHOTOS || [];
  if (dlg && photos.length) {
    const img = $('.lb-stage img', dlg);
    const cap = $('.lb-cap', dlg);
    const count = $('.lb-count', dlg);
    let i = 0;
    let opener = null;
    const show = (n) => {
      i = (n + photos.length) % photos.length;
      const p = photos[i];
      img.srcset = p.w.map((w) => `/img/${p.s}-${w}.webp ${w}w`).join(', ');
      img.sizes = '100vw';
      img.src = `/img/${p.s}-1200.jpg`;
      img.alt = p.alt;
      cap.textContent = p.alt;
      count.textContent = `${i + 1} ${window.P8_OF} ${photos.length}`;
      // warm the neighbours
      [i + 1, i - 1].forEach((k) => { const q = photos[(k + photos.length) % photos.length]; const im = new Image(); im.src = `/img/${q.s}-1200.webp`; });
    };
    $$('[data-lb]').forEach((b) => b.addEventListener('click', () => {
      opener = b;
      show(Number(b.dataset.lb));
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    }));
    $('[data-lb-prev]', dlg).addEventListener('click', () => show(i - 1));
    $('[data-lb-next]', dlg).addEventListener('click', () => show(i + 1));
    $('[data-lb-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.classList.contains('lb-stage')) dlg.close(); });
    dlg.addEventListener('close', () => { img.removeAttribute('src'); img.removeAttribute('srcset'); if (opener) opener.focus(); });
    let x0 = null;
    dlg.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
      x0 = null;
    });
  }

  // Map: load OpenStreetMap only after a click
  const map = $('.map[data-embed]');
  const mapBtn = map && $('[data-map]', map);
  if (mapBtn) {
    mapBtn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = map.dataset.embed;
      f.title = map.dataset.title;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      map.appendChild(f);
      $('.map-placeholder', map).remove();
      f.focus();
    });
  }

  // Inquiry: validate, send to the form service (mail to the hosts), mailto as fallback.
  const form = $('#inquiry-form');
  if (form) {
    const t = JSON.parse(form.dataset.i18n);
    const arrival = form.arrival;
    const departure = form.departure;
    const btn = $('button[type="submit"]', form);
    const status = $('.form-status', form);
    let busy = false;
    arrival.addEventListener('change', () => {
      if (!arrival.value) return;
      departure.min = arrival.value;
      if (!departure.value || departure.value <= arrival.value) {
        const d = new Date(`${arrival.value}T12:00:00`);
        d.setDate(d.getDate() + 7);
        departure.value = d.toISOString().slice(0, 10);
      }
    });
    const setErr = (el, msg) => {
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      $(`#e-${el.name}`).textContent = msg || '';
      return !msg;
    };
    const fmt = (v) => new Date(`${v}T12:00:00`).toLocaleDateString(t.locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const mailtoHref = (subject, body) => `mailto:${form.dataset.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const showFailed = (href) => {
      status.className = 'form-status is-error';
      status.textContent = '';
      const p = document.createElement('span');
      p.textContent = t.failed;
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = href;
      a.textContent = t.failedButton;
      const q = document.createElement('span');
      q.append(`${t.orWrite} `);
      const m = document.createElement('a');
      m.href = `mailto:${form.dataset.mail}`;
      m.textContent = form.dataset.mail;
      q.append(m, '.');
      status.append(p, a, q);
      a.focus();
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      const g = Number(form.guests.value);
      const ok = [
        setErr(arrival, arrival.value ? '' : t.errors.arrival),
        setErr(departure, departure.value && departure.value > arrival.value ? '' : t.errors.departure),
        setErr(form.guests, g >= 1 && g <= 8 ? '' : t.errors.guests),
        setErr(form.name, form.name.value.trim() ? '' : t.errors.name),
        setErr(form.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()) ? '' : t.errors.email),
      ].every(Boolean);
      if (!ok) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
      const nights = Math.round((new Date(departure.value) - new Date(arrival.value)) / 864e5);
      const m = t.mail;
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      const dates = `${fmt(arrival.value)} – ${fmt(departure.value)}`;
      const subject = /^TEST Anfrage/.test(message) ? 'TEST Anfrage – bitte ignorieren' : `${m.subject}: ${dates}, ${g} ${m.guests} (${name})`;
      const body = [m.greeting, '', m.intro, '', `${dates} (${nights} ${m.nights})`, `${g} ${m.guests}`, '', message, '', m.regards, name, email].join('\n').replace(/\n{3,}/g, '\n\n');
      // Bots fill the hidden field; pretend success, send nothing.
      if (form._honey && form._honey.value) { form.classList.add('is-sent'); status.className = 'form-status is-ok'; status.textContent = t.sent; return; }
      const f = t.fields;
      const data = {
        _subject: subject,
        _cc: atob(form.dataset.cc),
        _template: 'table',
        _replyto: email,
        _captcha: 'false',
        [f.name]: name,
        email,
        [f.arrival]: fmt(arrival.value),
        [f.departure]: fmt(departure.value),
        [m.nights]: nights,
        [f.guests]: g,
        [f.message]: message || '–',
        Website: `${location.origin}${location.pathname}`,
      };
      busy = true;
      form.classList.add('is-sending');
      btn.setAttribute('aria-disabled', 'true');
      status.className = 'form-status';
      status.textContent = t.sending;
      let sent = false;
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 20000);
        const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data), signal: ctl.signal });
        clearTimeout(timer);
        const json = await res.json().catch(() => ({}));
        sent = res.ok && String(json.success) === 'true';
      } catch (err) { sent = false; }
      busy = false;
      form.classList.remove('is-sending');
      btn.removeAttribute('aria-disabled');
      if (sent) {
        form.classList.add('is-sent');
        status.className = 'form-status is-ok';
        status.textContent = `${t.sent} ${email}.`;
        status.setAttribute('tabindex', '-1');
        status.focus();
      } else {
        showFailed(mailtoHref(subject, body));
      }
    });
  }
})();
