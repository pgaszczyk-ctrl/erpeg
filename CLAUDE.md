# Erpeg: notes for Claude

- The owner does not program. They describe features in Polish; reply in Polish, avoid jargon, and verify changes yourself (build plus a Playwright screenshot/check) before reporting.
- Stack: Phaser 4 + TypeScript + Vite. `npm run build` runs a typecheck and the build. The Phaser 4 API differs from v3 (e.g. `setTintMode` instead of `setTintFill`); the bundled guides live in `node_modules/phaser/skills/`.
- Layout: `src/art.ts` holds the placeholder art drawn on canvas (texture keys in `TEX`); `src/world.ts` generates the map; `src/objects/` holds the player and enemies; `src/scenes/` holds Boot, Game (the world) and UI (HUD, touch controls, game over).
- Mobile first: integer camera zoom. All input (touch, keyboard, mouse click) is handled natively in `src/controls.ts`; Phaser input for touch and keyboard is disabled because its pointer and key state got stuck on real devices. UIScene only draws the controls. Test at phone viewport too.
- `window.__game` is exposed for debugging and automated browser checks.
