# Angle for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`. The game remains a draft until you remove `"draft": true` after reviewing it.

Game controls: Look at the displayed angle, enter your estimate and press Check. Try to keep a streak before your attempts run out.

## Update (October 2026)
Full-screen responsive layout (angle board + side panel in landscape, stacked in portrait), canvas drawn at devicePixelRatio, large on-screen keypad for touch, animated angle, guess history chips with hot/cold colors, clear win/lose states (the answer and your last guess are drawn on the board), best streak. localStorage keys now use the `angle:` prefix (old unprefixed saves are not imported). New cover and screenshots.
