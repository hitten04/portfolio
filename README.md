# Hiten Patel - Portfolio Website

Personal portfolio of Hiten Patel, a Python and AI developer in Ahmedabad.

## Design

The site is built around a live-caption idea, because most of Hiten's work is software that listens and talks back:

- The intro transcribes itself word by word, like live captions, over a voice waveform.
- The waveform reacts to your cursor (or finger on touch screens). "Replay intro" plays the caption again.
- Hovering or tabbing through the project list swaps the screenshot in the preview panel.
- Light and dark themes follow the system setting, with a toggle in the header.
- With "reduce motion" turned on in the OS, the intro appears instantly and the waveform stays still.

Typefaces: Familjen Grotesk (headings) and Atkinson Hyperlegible Next (body), from Google Fonts.

## Technologies

- HTML5, CSS3 (custom properties, grid), vanilla JavaScript with no libraries
- Canvas 2D for the waveform
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
│   └── script.js       # Caption intro, waveform, project preview, nav, form
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

## Contact

Hiten Patel - [hp040912@gmail.com](mailto:hp040912@gmail.com)
