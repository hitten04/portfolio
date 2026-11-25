/* Hiten Patel portfolio
   - live-caption intro with a voice waveform
   - project list that swaps the preview on scroll, hover and focus
   - nav, theme toggle, contact form validation
   No libraries. */

(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;

    /* ---------- theme ---------- */
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const effectiveTheme = () => root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');

    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
        const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
        wave.refreshColour();
    });
    systemDark.addEventListener?.('change', () => wave.refreshColour());

    /* ---------- header + nav ---------- */
    const header = document.querySelector('.site-header');
    const nav = document.getElementById('site-nav');
    const menuBtn = document.querySelector('.menu-toggle');

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const setMenu = (open) => {
        nav.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuBtn?.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });

    const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            navLinks.forEach(a => {
                const on = a.getAttribute('href') === '#' + entry.target.id;
                a.classList.toggle('is-current', on);
                if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => {
        const s = document.querySelector(a.getAttribute('href'));
        if (s) sectionObserver.observe(s);
    });

    /* ---------- waveform ---------- */
    const wave = (() => {
        const canvas = document.querySelector('[data-wave]');
        if (!canvas) return { refreshColour() {}, speak() {}, setEnergy() {} };
        const ctx = canvas.getContext('2d');

        const BAR = 3, GAP = 4;
        let w = 0, h = 0, dpr = 1, n = 0;
        let amps = new Float32Array(0);
        let colour = '#2638F0';
        let energy = 0.04, energyTarget = 0.04;
        let pointerX = -1, pointerE = 0, pointerTarget = 0;
        let running = false, visible = true, raf = 0;
        const t0 = performance.now();

        const refreshColour = () => {
            colour = getComputedStyle(root).getPropertyValue('--ultra').trim() || colour;
            if (!running) draw(performance.now());
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width; h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const next = Math.max(8, Math.floor((w + GAP) / (BAR + GAP)));
            if (next !== n) {
                const old = amps;
                amps = new Float32Array(next);
                for (let i = 0; i < next; i++) amps[i] = old[Math.floor(i * old.length / next)] || 0.05;
                n = next;
            }
            if (!running) draw(performance.now());
        };

        // smooth pseudo-noise made from a few sines; good enough for a voice shape
        const noise = (a, b) =>
            (Math.sin(a * 1.7 + b) * 0.5 + Math.sin(a * 0.63 - b * 1.3) * 0.3 + Math.sin(a * 2.9 + b * 2.1) * 0.2) * 0.5 + 0.5;

        const draw = (now) => {
            const t = (now - t0) / 1000;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = colour;

            energy += (energyTarget - energy) * 0.12;
            energyTarget += (0.04 - energyTarget) * 0.035;      // speech decays between words
            pointerE += (pointerTarget - pointerE) * 0.08;

            const offset = (w - (n * (BAR + GAP) - GAP)) / 2;
            const mid = h / 2;
            const sigma = 0.05;

            for (let i = 0; i < n; i++) {
                const x = i / (n - 1);
                const idle = 0.07 + 0.12 * noise(i * 0.11 - t * 0.9, t * 0.6) * (0.5 + 0.5 * Math.sin(x * Math.PI));
                const speech = energy * (0.25 + 0.75 * noise(i * 0.16 + t * 2.4, t * 3.1)) * (0.55 + 0.45 * Math.sin(x * Math.PI));
                let touch = 0;
                if (pointerE > 0.001 && pointerX >= 0) {
                    const d = x - pointerX;
                    touch = pointerE * Math.exp(-(d * d) / (2 * sigma * sigma)) * (0.7 + 0.3 * Math.sin(t * 9 + i * 0.9));
                }
                const target = Math.min(1, idle + speech + touch);
                amps[i] += (target - amps[i]) * (running ? 0.22 : 1);

                const bh = Math.max(BAR, amps[i] * h * 0.92);
                const bx = offset + i * (BAR + GAP);
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(bx, mid - bh / 2, BAR, bh, BAR / 2);
                else ctx.rect(bx, mid - bh / 2, BAR, bh);
                ctx.fill();
            }
        };

        const loop = (now) => {
            draw(now);
            raf = requestAnimationFrame(loop);
        };
        const start = () => {
            if (running || reduceMotion.matches || !visible) return;
            running = true;
            raf = requestAnimationFrame(loop);
        };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visible ? start() : stop();
        }).observe(canvas);

        const setPointer = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            pointerX = (clientX - rect.left) / rect.width;
            pointerTarget = 0.85;
        };
        canvas.addEventListener('pointermove', (e) => setPointer(e.clientX));
        canvas.addEventListener('pointerdown', (e) => setPointer(e.clientX));
        canvas.addEventListener('pointerleave', () => { pointerTarget = 0; });
        canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointerTarget = 0; });

        new ResizeObserver(resize).observe(canvas);
        reduceMotion.addEventListener?.('change', () => reduceMotion.matches ? stop() : start());

        refreshColour();
        resize();
        start();

        return {
            refreshColour,
            speak(strength) { energyTarget = Math.min(0.95, Math.max(energyTarget, strength)); },
        };
    })();

    /* ---------- live-caption intro ---------- */
    (() => {
        const h1 = document.querySelector('[data-transcript]');
        if (!h1) return;
        const speaker = document.querySelector('.speaker');
        const status = document.querySelector('[data-status]');
        const timer = document.querySelector('[data-timer]');
        const replayBtn = document.querySelector('[data-replay]');

        // wrap every word in a span, keeping the spaces as text so line breaks stay natural
        const text = h1.textContent.trim();
        h1.textContent = '';
        const words = [];
        text.split(/(\s+)/).forEach(part => {
            if (/^\s+$/.test(part)) { h1.appendChild(document.createTextNode(' ')); return; }
            if (!part) return;
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            h1.appendChild(s);
            words.push(s);
        });

        let timers = [];
        let clock = 0;
        const clear = () => { timers.forEach(clearTimeout); timers = []; clearInterval(clock); };
        const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

        const finish = (elapsed) => {
            words.forEach(w => w.classList.remove('is-current', 'is-guess'));
            h1.classList.remove('is-live');
            speaker.classList.add('is-done');
            status.textContent = 'transcript';
            if (elapsed != null) timer.textContent = fmt(elapsed);
        };

        const play = () => {
            clear();
            if (reduceMotion.matches) { words.forEach(w => w.classList.add('is-heard')); finish(); timer.textContent = ''; return; }

            words.forEach(w => w.classList.remove('is-heard', 'is-current', 'is-guess'));
            h1.classList.add('is-live');
            speaker.classList.remove('is-done');
            status.textContent = 'speaking';
            timer.textContent = '0:00';

            const startedAt = performance.now();
            clock = setInterval(() => { timer.textContent = fmt(performance.now() - startedAt); }, 250);

            let at = 350;
            words.forEach((word, i) => {
                const len = word.textContent.replace(/[^\w']/g, '').length;
                timers.push(setTimeout(() => {
                    if (i > 0) {
                        const prev = words[i - 1];
                        prev.classList.remove('is-current');
                        // a beat of "low confidence" before the word settles, like a real recogniser
                        prev.classList.add('is-guess');
                        timers.push(setTimeout(() => prev.classList.remove('is-guess'), 260));
                    }
                    word.classList.add('is-heard', 'is-current');
                    wave.speak(0.45 + Math.min(len, 9) * 0.05);
                }, at));
                at += 150 + len * 24;
                if (/[,]$/.test(word.textContent)) at += 260;
                if (/[.!?]$/.test(word.textContent)) at += 520;
            });
            timers.push(setTimeout(() => { clearInterval(clock); finish(performance.now() - startedAt); }, at + 200));
        };

        replayBtn?.addEventListener('click', play);
        reduceMotion.addEventListener?.('change', () => { if (reduceMotion.matches) play(); });

        const go = () => setTimeout(play, 250);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    })();

    /* ---------- project preview ---------- */
    (() => {
        const list = document.querySelector('[data-projects]');
        const frame = document.querySelector('[data-preview]');
        if (!list || !frame) return;
        const items = [...list.children];
        const first = frame.querySelector('img');

        const imgs = items.map((li, i) => {
            if (i === 0) return first;
            const img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            frame.appendChild(img);
            return img;
        });

        // load the other screenshots once the work section is getting close,
        // so a hover never reveals an empty frame
        new IntersectionObserver((entries, obs) => {
            if (!entries[0].isIntersecting) return;
            imgs.forEach((img, i) => { if (i > 0) img.src = items[i].dataset.image; });
            obs.disconnect();
        }, { rootMargin: '800px 0px' }).observe(frame);

        // the frame takes the exact shape of the active screenshot, so each one fills it
        // with no bars and nothing cropped (shapes come from each project's img width/height)
        const ratios = items.map(li => {
            const shot = li.querySelector('.project-shot');
            return shot ? shot.width / shot.height : 2;
        });

        let active = 0;
        const fitFrame = () => {
            if (!frame.clientWidth) return;
            frame.style.aspectRatio = 'auto';
            const borders = frame.offsetHeight - frame.clientHeight;
            frame.style.height = (frame.clientWidth / ratios[active] + borders) + 'px';
        };
        const frameSizer = new ResizeObserver(fitFrame);
        frameSizer.observe(frame.parentElement);

        const setActive = (i) => {
            if (i === active) return;
            const prev = imgs[active];
            items[active].classList.remove('is-active');
            items[i].classList.add('is-active');
            imgs.forEach(img => img.classList.remove('is-leaving'));
            prev.classList.remove('is-shown');
            prev.classList.add('is-leaving');
            imgs[i].classList.add('is-shown');
            active = i;
            fitFrame();
        };

        // Scrolling drives the preview: a project becomes active once its name has
        // risen to 40% of the screen height, i.e. it sits in the middle or a little above.
        const titles = items.map(li => li.querySelector('.project-title'));
        const desktop = window.matchMedia('(min-width: 961px)');
        let lastScroll = 0, ticking = false;

        const pickFromScroll = () => {
            ticking = false;
            if (!desktop.matches) return;
            const line = window.innerHeight * 0.4;
            let pick = 0;
            titles.forEach((t, i) => { if (t.getBoundingClientRect().top <= line) pick = i; });
            setActive(pick);
        };
        window.addEventListener('scroll', () => {
            lastScroll = performance.now();
            if (!ticking) { ticking = true; requestAnimationFrame(pickFromScroll); }
        }, { passive: true });

        // Hover and keyboard still choose a project, but rows sliding under a mouse
        // that isn't moving during a scroll don't count as hovering.
        items.forEach((li, i) => {
            li.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'mouse' && performance.now() - lastScroll < 250) return;
                setActive(i);
            });
            li.addEventListener('focusin', () => setActive(i));
        });
    })();

    /* ---------- contact form ---------- */
    (() => {
        const form = document.getElementById('contactForm');
        if (!form) return;
        const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

        const check = (input) => {
            const v = input.value.trim();
            const ok = input.type === 'email' ? emailOk(v) : v.length > 0;
            const field = input.closest('.field');
            const err = document.getElementById(input.id + '-error');
            field.classList.toggle('has-error', !ok);
            err.hidden = ok;
            if (ok) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
            else { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
            return ok;
        };

        const inputs = [...form.querySelectorAll('input[required], textarea[required]')];
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                // when focus is moving to the submit button, let submit validate everything;
                // showing an error here would push the button down mid-click
                if (e.relatedTarget && e.relatedTarget.type === 'submit') return;
                if (input.value.trim()) check(input);
            });
            input.addEventListener('input', () => { if (input.closest('.field').classList.contains('has-error')) check(input); });
        });

        form.addEventListener('submit', (e) => {
            const results = inputs.map(check);
            const firstBad = inputs[results.indexOf(false)];
            if (firstBad) { e.preventDefault(); firstBad.focus(); return; }

            // keep a local copy so admin.html can list messages sent from this browser
            try {
                const saved = JSON.parse(localStorage.getItem('contactMessages')) || [];
                const val = (id) => document.getElementById(id).value.trim();
                saved.push({
                    name: val('name'),
                    email: val('email'),
                    subject: val('subject'),
                    message: val('message'),
                    date: new Date().toISOString()
                });
                localStorage.setItem('contactMessages', JSON.stringify(saved));
            } catch (err) { /* storage unavailable, the form still submits */ }
        });
    })();

    /* ---------- footer year ---------- */
    const year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
})();
