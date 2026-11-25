/* Hiten Patel portfolio
   - live-caption intro with a voice waveform
   - project list that swaps the preview on scroll, hover and focus
   - "Ask this site": voice or typed questions, answered out loud with a word-synced caption
   - nav, theme toggle, contact form validation
   No libraries. */

(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;

    /* ---------- theme ---------- */
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const effectiveTheme = () => root.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');

    const waves = [];
    const setTheme = (next) => {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
        waves.forEach(w => w.refreshColour());
    };
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
        setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
    });
    systemDark.addEventListener?.('change', () => waves.forEach(w => w.refreshColour()));

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

    /* ---------- waveform (used by the hero and by the Ask panel) ---------- */
    const makeWave = (canvas, { interactive = true } = {}) => {
        if (!canvas) return { refreshColour() {}, speak() {} };
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

        if (interactive) {
            const setPointer = (clientX) => {
                const rect = canvas.getBoundingClientRect();
                pointerX = (clientX - rect.left) / rect.width;
                pointerTarget = 0.85;
            };
            canvas.addEventListener('pointermove', (e) => setPointer(e.clientX));
            canvas.addEventListener('pointerdown', (e) => setPointer(e.clientX));
            canvas.addEventListener('pointerleave', () => { pointerTarget = 0; });
            canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointerTarget = 0; });
        }

        new ResizeObserver(resize).observe(canvas);
        reduceMotion.addEventListener?.('change', () => reduceMotion.matches ? stop() : start());

        refreshColour();
        resize();
        start();

        const api = {
            refreshColour,
            speak(strength) { energyTarget = Math.min(0.95, Math.max(energyTarget, strength)); },
        };
        waves.push(api);
        return api;
    };
    const wave = makeWave(document.querySelector('[data-wave]'));

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
    const projects = (() => {
        const list = document.querySelector('[data-projects]');
        const frame = document.querySelector('[data-preview]');
        if (!list || !frame) return { show() {} };
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

        const urlEl = document.querySelector('[data-preview-url]');
        const setActive = (i) => {
            if (i === active) return;
            if (urlEl) urlEl.textContent = items[i].dataset.url || '';
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

        return {
            // bring one project into view and make it the active one (used by Ask this site)
            show(i) {
                const title = titles[i];
                if (!title) return;
                const offset = desktop.matches ? window.innerHeight * 0.3 : 90;
                const top = title.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
                setActive(i);
            }
        };
    })();

    /* ---------- Ask this site ----------
       Visitors ask by voice (Web Speech API) or by typing. Answers come from the small
       knowledge base below, are read out with speech synthesis, and the caption lights
       each word as it is spoken. Everything runs in the browser: no server, no keys. */
    (() => {
        const panel = document.getElementById('ask');
        if (!panel) return;

        const EMAIL = 'hp040912@gmail.com';
        const SAY_EMAIL = 'h p zero four zero nine one two at gmail dot com';
        const goTo = (id) => {
            const el = document.getElementById(id);
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY - 76;
            window.scrollTo({ top, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        };
        const L = {
            email: { label: 'Email Hiten', href: 'mailto:' + EMAIL, note: EMAIL },
            phone: { label: 'Call +91 95588 83186', href: 'tel:+919558883186' },
            form: { label: 'Open the contact form', section: 'contact' },
            resume: { label: 'Open resume (PDF)', href: 'images/hitenCV.pdf', external: true },
            github: { label: 'GitHub', href: 'https://github.com/hitten04', external: true },
            linkedin: { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hitenpatel2004', external: true },
        };
        const PROJECT_CHIPS = ['Bizfusion.ai', 'AgriNova', 'IntelliDocs', 'Virtual Audio Guide', 'VisionTap'];
        const DEFAULT_CHIPS = ['What does Hiten build?', 'Show me his projects', "What's his experience?", 'How can I contact him?', 'Open his resume'];

        // weight lets a project's own name beat the general "projects" answer
        const KB = [
            { keys: ['hire', 'available', 'availability', 'freelance', 'services', 'service', 'custom', 'agent', 'agents', 'integration', 'integrations', 'collaborate', 'work with', 'what do you build', 'what does he build', 'what does hiten build', 'what can he build', 'do you build'],
              text: `Hiten is available for custom software, AI agents, AI development and integrations. The quickest way to start is an email to ${EMAIL}.`,
              say: `Hiten is available for custom software, AI agents, AI development and integrations. The quickest way to start is an email to ${SAY_EMAIL}.`,
              links: [L.email, L.form], run: () => goTo('contact') },
            { keys: ['projects', 'project', 'portfolio', 'built', 'made', 'examples', 'work'],
              text: 'Here are five of his projects: Bizfusion.ai, AgriNova, IntelliDocs, Virtual Audio Guide and VisionTap. Ask about any of them by name.',
              chips: PROJECT_CHIPS, run: () => goTo('work') },
            { weight: 3, keys: ['bizfusion', 'biz fusion', 'business fusion', 'bisfusion', 'receptionist'],
              text: 'Bizfusion.ai gives businesses an AI receptionist on the phone and in chat. Hiten built its multi-tenant FastAPI services, the admin panel and real-time voice flows with Twilio, OpenAI and Azure.',
              links: [{ label: 'Visit bizfusion.ai', href: 'https://bizfusion.ai/', external: true }], run: () => projects.show(0) },
            { weight: 3, keys: ['agrinova', 'agri nova', 'agree nova', 'agro nova', 'agriculture', 'crop', 'crops', 'farm', 'farmer', 'farmers', 'farming'],
              text: 'AgriNova tells farmers which crops suit their land. A Random Forest model reads more than ten soil and weather readings and ranks the six best crops, with over 90 percent accuracy.',
              links: [{ label: 'Visit agrinova.me', href: 'https://agrinova.me/', external: true }, { label: 'View code', href: 'https://github.com/hitten04/AgriNova', external: true }], run: () => projects.show(1) },
            { weight: 3, keys: ['intellidocs', 'intelli docs', 'intellidoc', 'intelligent docs', 'intel docs', 'pdf', 'pdfs', 'document', 'documents', 'docs'],
              text: 'IntelliDocs lets you upload a PDF, Word or text file and ask it questions. Documents are stored in ChromaDB and Groq-hosted language models write the answers.',
              links: [{ label: 'Try IntelliDocs', href: 'https://intellidocs1.streamlit.app/', external: true }, { label: 'View code', href: 'https://github.com/hitten04/IntelliDocs', external: true }], run: () => projects.show(2) },
            { weight: 3, keys: ['audio guide', 'virtual audio', 'virtual guide', 'tour', 'tours', 'audio'],
              text: 'Virtual Audio Guide offers audio tours of places you visit. Hiten built its Django REST APIs and designed the PostgreSQL schema behind the React front end.',
              links: [{ label: 'View code', href: 'https://github.com/hitten04/VirtualAudioGuide', external: true }], run: () => projects.show(3) },
            { weight: 3, keys: ['visiontap', 'vision tap', 'vision tab', 'game', 'games', 'hand tracking', 'opencv', 'open cv', 'mediapipe', 'media pipe', 'webcam', 'camera'],
              text: 'VisionTap is a webcam game. Circles appear on screen and you tap them with your finger in the air, tracked by MediaPipe, as the levels speed up.',
              links: [{ label: 'View code', href: 'https://github.com/hitten04/VisionTap-Circles-game-using-Opencv', external: true }], run: () => projects.show(4) },
            { keys: ['experience', 'job', 'jobs', 'company', 'enterprise', 'analytic', 'analytics', 'intern', 'internship', 'role', 'currently', 'employed', 'career', 'work at', 'works at'],
              text: 'Hiten works as a junior Python and AI developer at Enterprise Analytic. Before that he interned there, building FastAPI backends and voice and chat agents for an AI booking system.',
              run: () => goTo('experience') },
            { keys: ['skills', 'skill', 'tech', 'technology', 'technologies', 'stack', 'languages', 'language', 'python', 'fastapi', 'django', 'react', 'tools', 'framework', 'frameworks', 'know'],
              text: 'His main tools are Python, FastAPI and Django, with React on the front end, PostgreSQL and MySQL for data, and Twilio, OpenAI and n8n agents for AI work.',
              run: () => goTo('skills') },
            { keys: ['education', 'degree', 'college', 'university', 'study', 'studied', 'cgpa', 'gpa', 'graduate', 'graduated', 'graduation', 'engineering', 'bachelor', 'bachelors'],
              text: 'Hiten completed a B.E. in Computer Science Engineering at Lok Jagruti University in July 2026, with a CGPA of 7.81.',
              say: 'Hiten completed a bachelor of engineering in computer science at Lok Jagruti University in July 2026, with a CGPA of 7.81.',
              run: () => goTo('about') },
            { keys: ['certificate', 'certificates', 'certification', 'certifications', 'certified', 'hackathon', 'hackovate', 'achievement', 'achievements', 'award', 'awards'],
              text: 'He holds certificates from Oracle, IBM and AWS in generative AI and cloud, and his team placed in the top 50 of 245 at Hackovate LJ 2025.',
              run: () => goTo('about') },
            { keys: ['contact', 'email', 'mail', 'phone', 'call', 'number', 'reach', 'message', 'talk to', 'get in touch'],
              text: `You can email Hiten at ${EMAIL}, call +91 95588 83186, or use the contact form.`,
              say: `You can email Hiten at ${SAY_EMAIL}, call plus nine one, nine five five eight eight, eight three one eight six, or use the contact form.`,
              links: [L.email, L.phone, L.linkedin], run: () => goTo('contact') },
            { weight: 2, keys: ['resume', 'cv', 'résumé', 'curriculum', 'biodata'],
              text: "Here's Hiten's resume. Open it with the button below.", links: [L.resume] },
            { keys: ['github', 'linkedin', 'social', 'socials', 'code', 'repositories', 'repos'],
              text: 'Hiten is on GitHub as hitten04, where his project code lives, and on LinkedIn.', say: 'Hiten is on GitHub as hitten zero four, where his project code lives, and on LinkedIn.',
              links: [L.github, L.linkedin] },
            { keys: ['who', 'about', 'yourself', 'himself', 'introduce', 'introduction', 'hiten', 'tell me'],
              text: 'Hiten Patel is a junior Python and AI developer at Enterprise Analytic in Ahmedabad. He builds custom software, AI agents and the integrations that put AI to work.',
              run: () => goTo('about') },
            { keys: ['located', 'location', 'based', 'city', 'ahmedabad', 'gujarat', 'live', 'lives', 'where'],
              text: 'Hiten is based in Ahmedabad, Gujarat, in India.' },
            { weight: 2, keys: ['dark mode', 'dark theme', 'dark', 'night mode'],
              text: 'Switched to dark mode.', run: () => setTheme('dark') },
            { weight: 2, keys: ['light mode', 'light theme', 'light', 'bright'],
              text: 'Switched to light mode.', run: () => setTheme('light') },
            { weight: 2, keys: ['intro', 'replay', 'start over', 'from the top'],
              text: 'Playing the intro again.', run: () => { window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' }); setTimeout(() => document.querySelector('[data-replay]')?.click(), 500); } },
            { keys: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening', 'good afternoon'],
              text: "Hi! Ask me about Hiten's work, his skills, or how to get in touch." },
            { keys: ['help', 'what can i ask', 'what can you do', 'how does this work', 'options'],
              text: "You can ask about Hiten's projects, skills, experience or education, ask for his resume, or say dark mode or light mode." },
            { keys: ['thanks', 'thank', 'bye', 'goodbye', 'great', 'cool', 'nice', 'awesome', 'wow'],
              text: `Glad to help. Hiten would love to hear from you at ${EMAIL}.`, say: `Glad to help. Hiten would love to hear from you at ${SAY_EMAIL}.`, links: [L.email] },
        ];
        const FALLBACK = { text: "I don't have an answer for that. Try asking about Hiten's projects, skills, experience, or how to contact him." };

        const normalise = (q) => q.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const match = (q) => {
            const text = ' ' + normalise(q).replace(/\./g, ' ') + ' ';
            let best = null, bestScore = 0;
            KB.forEach(entry => {
                let score = 0;
                entry.keys.forEach(k => {
                    const key = k.replace(/\./g, ' ');
                    if (text.includes(' ' + key + ' ')) score += key.includes(' ') ? 2 : 1;
                });
                score *= score ? (entry.weight || 1) : 0;
                if (score > bestScore) { best = entry; bestScore = score; }
            });
            return best;
        };

        /* elements */
        const fab = document.querySelector('.ask-fab');
        const openers = [...document.querySelectorAll('[data-ask-open]')];
        const closeBtn = panel.querySelector('[data-ask-close]');
        const form = panel.querySelector('[data-ask-form]');
        const input = document.getElementById('ask-input');
        const micBtn = panel.querySelector('[data-ask-mic]');
        const youEl = panel.querySelector('[data-ask-you]');
        const answerEl = panel.querySelector('[data-ask-answer]');
        const liveEl = panel.querySelector('[data-ask-live]');
        const linksEl = panel.querySelector('[data-ask-links]');
        const chipsEl = panel.querySelector('[data-ask-chips]');
        const noteEl = panel.querySelector('[data-ask-note]');
        const speakToggle = document.getElementById('ask-speak');
        const askWave = makeWave(panel.querySelector('[data-ask-wave]'), { interactive: false });

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
        if (!SR) {
            micBtn.hidden = true;
            noteEl.textContent = 'Voice questions work in Chrome, Edge and Safari. You can type your question here.';
        }
        if (!synth) speakToggle.closest('label').hidden = true;
        try { if (localStorage.getItem('askSpeak') === 'off') speakToggle.checked = false; } catch (e) {}
        speakToggle.addEventListener('change', () => {
            try { localStorage.setItem('askSpeak', speakToggle.checked ? 'on' : 'off'); } catch (e) {}
            if (!speakToggle.checked) synth?.cancel();
        });

        /* chips and links */
        const renderChips = (list) => {
            chipsEl.textContent = '';
            list.forEach(label => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'ask-chip';
                b.textContent = label;
                b.addEventListener('click', () => handle(label));
                chipsEl.appendChild(b);
            });
        };
        const renderLinks = (links = []) => {
            linksEl.textContent = '';
            links.forEach(l => {
                let el;
                if (l.section) {
                    el = document.createElement('button');
                    el.type = 'button';
                    el.addEventListener('click', () => { goTo(l.section); setTimeout(() => document.getElementById('name')?.focus({ preventScroll: true }), 600); });
                } else {
                    el = document.createElement('a');
                    el.href = l.href;
                    if (l.external) { el.target = '_blank'; el.rel = 'noopener'; }
                }
                el.className = 'ask-link';
                el.textContent = l.label;
                linksEl.appendChild(el);
            });
            linksEl.hidden = links.length === 0;
        };

        /* the visitor's words */
        const setYou = (text, status) => {
            youEl.textContent = '';
            youEl.classList.toggle('is-status', !!status);
            if (status) { youEl.textContent = status; return; }
            if (!text) return;
            const label = document.createElement('span');
            label.className = 'ask-you-label';
            label.textContent = 'You asked';
            youEl.append(label, document.createTextNode(text));
        };

        /* the answer caption, lit word by word as it is spoken */
        let words = [], capTimers = [], timerMode = false;
        const clearCaption = () => { capTimers.forEach(clearTimeout); capTimers = []; timerMode = false; };
        const renderAnswer = (text) => {
            clearCaption();
            answerEl.textContent = '';
            answerEl.classList.remove('is-prompt');
            words = [];
            const starts = [];
            let pos = 0;
            text.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) { answerEl.appendChild(document.createTextNode(' ')); pos += part.length; return; }
                const sp = document.createElement('span');
                sp.className = 'w';
                sp.textContent = part;
                answerEl.appendChild(sp);
                words.push(sp);
                starts.push(pos);
                pos += part.length;
            });
            liveEl.textContent = text;   // screen readers get the whole answer at once
            answerEl.classList.add('is-live');
            return starts;
        };
        const light = (i) => {
            words.forEach((w, j) => { w.classList.toggle('is-heard', j <= i); w.classList.toggle('is-current', j === i); });
            const len = (words[i]?.textContent || '').length;
            askWave.speak(0.4 + Math.min(len, 9) * 0.05);
        };
        const finishCaption = () => {
            clearCaption();
            words.forEach(w => { w.classList.add('is-heard'); w.classList.remove('is-current'); });
            answerEl.classList.remove('is-live');
        };
        const runTimerCaption = () => {
            if (timerMode) return;
            timerMode = true;
            let at = 0;
            words.forEach((w, i) => {
                const len = w.textContent.replace(/[^\w']/g, '').length;
                capTimers.push(setTimeout(() => light(i), at));
                at += 140 + len * 26;
                if (/[,]$/.test(w.textContent)) at += 180;
                if (/[.!?]$/.test(w.textContent)) at += 320;
            });
            capTimers.push(setTimeout(finishCaption, at + 150));
        };

        let voice = null;
        const pickVoice = () => {
            const vs = synth ? synth.getVoices() : [];
            const by = (lang) => vs.find(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(lang));
            voice = by('en-in') || by('en-gb') || by('en-us') || by('en') || null;
        };
        if (synth) { pickVoice(); synth.addEventListener?.('voiceschanged', pickVoice); }

        const speakAnswer = (text, say) => {
            synth?.cancel();
            const starts = renderAnswer(text);
            if (reduceMotion.matches) finishCaption();
            if (!synth || !speakToggle.checked) { if (!reduceMotion.matches) runTimerCaption(); return; }

            const spoken = say || text;
            const exact = !say;
            const u = new SpeechSynthesisUtterance(spoken);
            if (voice) { u.voice = voice; u.lang = voice.lang; }
            u.rate = 1.02;
            let started = false, boundary = false, done = false;
            u.onstart = () => {
                started = true;
                // some voices never report word positions; fall back to timing the caption
                capTimers.push(setTimeout(() => { if (!boundary && !done && !reduceMotion.matches) runTimerCaption(); }, 650));
            };
            u.onboundary = (e) => {
                if ((e.name && e.name !== 'word') || timerMode || reduceMotion.matches) return;
                boundary = true;
                let i = 0;
                if (exact) { starts.forEach((s, j) => { if (s <= e.charIndex) i = j; }); }
                else i = Math.min(words.length - 1, Math.floor(e.charIndex / spoken.length * words.length));
                light(i);
            };
            u.onend = () => { done = true; if (!timerMode) finishCaption(); };
            u.onerror = () => { done = true; if (!boundary && !reduceMotion.matches) runTimerCaption(); else finishCaption(); };
            synth.speak(u);
            capTimers.push(setTimeout(() => { if (!started && !done && !reduceMotion.matches) runTimerCaption(); }, 1500));
        };

        /* answering */
        let actionTimer = 0;
        const handle = (q) => {
            q = q.trim();
            if (!q) return;
            stopListening(true);
            noteEl.textContent = SR ? '' : noteEl.textContent;
            setYou(q);
            const entry = match(q) || FALLBACK;
            renderLinks(entry.links);
            renderChips(entry === FALLBACK ? DEFAULT_CHIPS : (entry.chips || DEFAULT_CHIPS));
            speakAnswer(entry.text, entry.say);
            clearTimeout(actionTimer);
            if (entry.run) actionTimer = setTimeout(entry.run, 450);
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = input.value;
            if (!q.trim()) { input.focus(); return; }
            input.value = '';
            handle(q);
        });

        /* listening */
        let rec = null, listening = false, heard = '', lastError = '', shown = 0;
        const voiceErrors = {
            'not-allowed': 'Microphone access is off for this site, so voice questions can’t start. Allow the microphone in your browser settings, or type your question.',
            'service-not-allowed': 'Voice recognition isn’t available here. Type your question instead.',
            'audio-capture': 'No microphone was found. Type your question instead.',
            'network': 'Voice recognition needs an internet connection. Type your question instead.',
            'language-not-supported': 'Voice recognition doesn’t support this language here. Type your question instead.',
        };
        const setMic = (on) => {
            listening = on;
            micBtn.classList.toggle('is-listening', on);
            micBtn.setAttribute('aria-pressed', String(on));
            micBtn.setAttribute('aria-label', on ? 'Stop listening' : 'Ask by voice');
            panel.classList.toggle('is-listening', on);
        };
        const stopListening = (silent) => {
            if (!rec) return;
            const r = rec; rec = null;
            r.onresult = r.onend = r.onerror = null;
            try { r.abort(); } catch (e) {}
            setMic(false);
            if (!silent) setYou('', '');
        };
        const startListening = () => {
            if (!SR) { input.focus(); return; }
            stopListening(true);
            synth?.cancel();
            finishCaption();
            heard = ''; lastError = ''; shown = 0;
            noteEl.textContent = '';
            const r = new SR();
            rec = r;
            r.lang = (navigator.language || 'en-US').startsWith('en') ? navigator.language : 'en-US';
            r.interimResults = true;
            r.continuous = false;
            r.maxAlternatives = 1;
            r.onstart = () => { setMic(true); setYou('', 'Listening… ask your question'); };
            r.onresult = (e) => {
                let text = '';
                for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
                heard = text.trim();
                const count = heard.split(/\s+/).filter(Boolean).length;
                if (count > shown) { askWave.speak(0.6); shown = count; }
                setYou(heard);
            };
            r.onerror = (e) => { lastError = e.error; };
            r.onend = () => {
                if (rec !== r) return;
                rec = null;
                setMic(false);
                if (heard) { handle(heard); return; }
                if (lastError && voiceErrors[lastError]) {
                    noteEl.textContent = voiceErrors[lastError];
                    setYou('', '');
                    if (lastError === 'not-allowed' || lastError === 'service-not-allowed') micBtn.hidden = true;
                    input.focus();
                } else setYou('', 'I didn’t hear anything. Tap the mic and try again.');
            };
            try { r.start(); } catch (e) { rec = null; setMic(false); input.focus(); }
        };
        micBtn.addEventListener('click', () => {
            if (listening && rec) { try { rec.stop(); } catch (e) { stopListening(); } }
            else startListening();
        });

        /* open and close */
        let opener = null, heroVisible = true, footerVisible = false, closeTimer = 0;
        const updateFab = () => { if (fab) fab.hidden = heroVisible || footerVisible || !panel.hidden; };
        const isOpen = () => !panel.hidden;
        const open = ({ listen = false } = {}) => {
            clearTimeout(closeTimer);
            if (!isOpen()) {
                opener = document.activeElement;
                panel.hidden = false;
                requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-open')));
                if (!chipsEl.children.length) renderChips(DEFAULT_CHIPS);
                updateFab();
            }
            if (listen && SR && !micBtn.hidden) startListening();
            else input.focus({ preventScroll: true });
        };
        const close = () => {
            if (!isOpen()) return;
            stopListening(true);
            synth?.cancel();
            finishCaption();
            clearTimeout(actionTimer);
            panel.classList.remove('is-open');
            closeTimer = setTimeout(() => { panel.hidden = true; updateFab(); }, reduceMotion.matches ? 0 : 320);
            if (opener && opener.isConnected && !opener.hidden) opener.focus({ preventScroll: true });
            else document.querySelector('[data-ask-open]')?.focus({ preventScroll: true });
        };
        openers.forEach(b => b.addEventListener('click', () => open({ listen: b.hasAttribute('data-ask-listen') })));
        closeBtn.addEventListener('click', close);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) { close(); return; }
            const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
            if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); }
        });

        const hero = document.querySelector('.hero');
        if (hero && fab) {
            new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateFab(); }, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
        }
        // the footer has its own contact links, and the button would cover "Back to top"
        const footer = document.querySelector('.site-footer');
        if (footer && fab) {
            new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; updateFab(); }).observe(footer);
        }
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
