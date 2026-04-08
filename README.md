# Megaphone

A PWA that routes your microphone audio to any output device in real time.

## Features

- Select any available microphone as input
- Select any available speaker/headphones as output
- Real-time passthrough — no recording, no delay buffer
- Live input level meter
- Volume control
- Installable as a PWA (works offline)

## Browser support

Speaker selection relies on the [`setSinkId()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId) API, which is supported in **Chrome** and **Edge**. In Firefox and Safari the audio will always route to the default output device.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview  # preview the production build locally
```

## Deploy

The project deploys automatically to GitHub Pages on every push to `main` via the included GitHub Actions workflow.

To enable it, go to **Settings → Pages → Source** and select **GitHub Actions**.

Live URL: `https://<your-username>.github.io/megaphone/`

> If your repository has a different name, update `base` in `vite.config.js` accordingly.
