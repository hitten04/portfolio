# Hiten Patel - Portfolio Website

Personal portfolio of Hiten Patel, a Python and AI developer in Ahmedabad.

## Design

The site is built around a live-caption idea, because most of Hiten's work is software that listens and talks back:

- The intro transcribes itself word by word, like live captions, over a voice waveform.
- The waveform reacts to your cursor (or finger on touch screens). "Replay intro" plays the caption again.
- Scrolling, hovering or tabbing through the project list swaps the screenshot in the preview panel.
- **Ask this site**: visitors ask a question by voice or by typing ("What does Hiten build?", "Show me AgriNova", "Dark mode"). Their words appear as a live caption, the answer is read aloud with each word highlighted as it's spoken, and the page scrolls to the right section or project. It runs entirely in the browser (Web Speech API), with no server or API keys. Press `/` to open it from the keyboard.
- Light and dark themes follow the system setting, with a toggle in the header.
- With "reduce motion" turned on in the OS, the intro appears instantly and the waveform stays still.

Typefaces: Familjen Grotesk (headings) and Atkinson Hyperlegible Next (body), from Google Fonts.

## Technologies

- HTML5, CSS3 (custom properties, grid), vanilla JavaScript with no libraries
- Canvas 2D for the waveform
- Web Speech API (speech recognition and speech synthesis) for Ask this site; voice input works in Chrome, Edge and Safari, and every browser can type
- Formspree for the contact form

## Project structure

```
portfolio/
├── index.html          # Main page
├── thanks.html         # Shown after the contact form is sent
├── admin.html          # Lists contact messages saved in this browser
├── css/
│   └── style.css       # All styles, theme tokens at the top
├── js/
│   └── script.js       # Caption intro, waveform, project preview, Ask this site, nav, form
└── images/
    ├── web/            # Compressed WebP images used by the site
    └── hitenCV.pdf     # Resume
```

## Setup

No build step. Open `index.html` in a browser, or serve the folder with any static server:

```
python -m http.server
```

## Customizing

- Colours and type sizes: the `:root` block at the top of `css/style.css`
- Intro sentence: the `<h1 data-transcript>` in `index.html`
- Projects: each `<li class="project">` in `index.html`; set `data-image` to the screenshot for the preview panel
- New images: add a WebP to `images/web/` (about 1400px wide for project screenshots)
- Ask this site answers: the `KB` list in `js/script.js`; each entry has trigger words (`keys`), the answer (`text`), optional spoken wording (`say`), buttons (`links`) and an action (`run`)

## Contact

Hiten Patel - [hp040912@gmail.com](mailto:hp040912@gmail.com)
