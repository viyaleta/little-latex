# Little LaTeX Equation Editor

A tiny browser-based LaTeX equation editor with live preview, PNG export, and
clipboard image copy.

Made with help of Claude. 

## Features

- Live KaTeX rendering.
- Copy equation as an image to clipboard.
- Save equation as a PNG.
- Auto or custom height export.
- Auto-closing brackets in the editor.

## Use it

- Open `index.html` in your browser.
- For clipboard copy support, serve the folder locally and open the local URL:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Equation lookup

The editor ships with a built-in lookup of popular math and physics equations.
Type a common name (for example, "quadratic formula") in the lookup field to
insert its LaTeX. The list is curated but not exhaustive, so feel free to add
more entries in `equations.json`. The lookup list is loaded via `fetch`, so run
the app through a local server (see instructions above) rather than using a
`file://` URL.

## Publish with GitHub Pages

1. Create a new GitHub repository and upload these files.
2. In the repository settings, enable **GitHub Pages**:
   - Source: `main` branch
   - Folder: `/ (root)`
3. After a minute, your site will be available at:
   `https://<your-username>.github.io/<repo-name>/`

## Owner

Reference: https://github.com/viyaleta/little-latex (MIT License)
