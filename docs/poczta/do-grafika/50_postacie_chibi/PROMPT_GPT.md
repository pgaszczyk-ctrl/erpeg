# Prompt dla ChatGPT – zamówienie 50-P001 (postacie chibi, pilotaż)

Jak użyć:
1. Wklej do ChatGPT cały blok „PROMPT 1” i dołącz zrzuty `zrzut_1_bohater_z_bliska_lublin.png` i `zrzut_2_skala_postaci_burgas.png`.
2. Wynik pokaż właścicielowi (etap 0 – próbka stylu). Dopiero po akceptacji użyj „PROMPT 2” do pełnej paczki.
3. Szczegóły techniczne (siatka, maski, JSON) są w `../2026-11-19_50-P001_postacie_chibi_pilotaz.md` – trzymaj się ich przy cięciu plików.

Generator obrazów nie trzyma siatki pikseli ani identycznych pozycji między klatkami. Traktuj jego wynik jako wzór, a końcowe klatki
popraw ręcznie (lub skryptem tnącym) do siatki 48 × 48 z twardą alfą – tak jak przy wcześniejszych paczkach (zaakceptowany podgląd → pliki produkcyjne).

---

## PROMPT 1 – próbka stylu (etap 0)

```
You are the character artist for "Exp-lore", a mobile top-down RPG played on real OpenStreetMap streets, with a light fairy-tale steampunk world (brass, steam, gas lamps, goggles) and pixel-art buildings seen from above at about 60 degrees. The attached screenshots show the current game: the world style, the scale of buildings and the current small 3D hero, which the owner rejected as too small, unreadable and too 3D.

Design a NEW player character: a young city guard recruit, chibi proportions (head about 40% of total height, big expressive eyes, short limbs), fantasy-steampunk outfit: padded jacket with brass buttons and leather straps, simple trousers, sturdy boots. Friendly and brave, not dark or grim. Readable silhouette at very small size.

Style rules:
- Hand-drawn pixel art, crisp hard edges, NO anti-aliasing, NO blur, NO semi-transparent pixels.
- 1-pixel dark outline in #1e1a24 around the whole figure and main shapes.
- Saturated, warm colors; 3–4 shades per material; light from the top-left.
- Transparent background.
- Final in-game size: the whole figure including head and helmet is about 34 pixels tall, standing in a 48x48 cell, feet on the same line in every frame.

Show on ONE sheet, drawn at final pixel size and also enlarged 4x with nearest-neighbor:
- the character facing DOWN (towards the viewer) and facing LEFT (side view),
- for each direction: standing pose + 2 walking frames (clearly different steps),
- wearing a simple IRON HELMET (separate piece sitting on the head) and holding a one-handed SWORD in the right hand.
Also paste one enlarged copy of the standing figure next to a building from the attached screenshot, at the same scale as the game, so the owner can judge size and readability.
```

## PROMPT 2 – pełna paczka (etap 1, po akceptacji próbki)

```
Using the approved guard recruit design, produce production sprite sheets as separate LAYERS, all as hand-drawn pixel art at final size (48x48 px cells, feet on y=45, feet centered at x=24, figure ~34 px tall, 1-px outline #1e1a24, hard alpha, transparent background, no anti-aliasing).

Directions (5, the right side will be mirrored by the game): DOWN, DOWN-LEFT, LEFT, UP-LEFT, UP.

1) BODY WITHOUT HEAD (the outfit): for each direction one row with 14 frames: 1 idle, 8 walk cycle frames (smooth, Diablo-like, clearly alternating legs and arm swing), 5 attack frames (one-handed sword swing). The neck is left empty for the head layer. Sheet: 5 rows x 14 columns.

2) HEAD: 5 drawings (one per direction), same 48x48 canvas, neck point at (24,30). Head does not animate.

3) HELMETS on the head canvas (48x48, same positions as the head), 5 directions each: a LEATHER helmet and an IRON helmet. The helmet must fully cover the hair.

4) WEAPONS as separate images: SWORD in 4 poses per direction (hold, swing high, swing middle, swing low) and BOW in 2 poses per direction (hold, drawn). Mark where the hand grips it.

5) COLOR MASKS for body, head and helmets, same size and positions as the drawings, keeping each pixel's light/dark value but painted in these flat key colors:
   red #ff0000 = upper outfit (jacket), green #00ff00 = lower outfit (trousers), cyan #00ffff = boots,
   magenta #ff00ff = dyeable cloth/leather parts of headwear (bare metal stays unmasked), blue #0000ff = skin, yellow #ffff00 = hair/eyebrows.
   Everything else (metal, brass, belts, eyes, outline) is transparent in the mask.

Deliver each layer as its own PNG plus a 4x nearest-neighbor preview of the assembled character in all 5 directions (idle, 3 walk frames, 1 attack frame) with iron helmet and sword.
```

## PROMPT 3 – wariant B z modelu 3D (opcjonalnie, jeśli robisz go Ty)

```
Render the existing guard 3D model (public/modele/straznik.glb) from a top-down camera at about 50 degrees, in the same 5 directions and the same frames as the hand-drawn set (idle, 8-frame walk, 5-frame sword attack), at a size that gives a ~34 px tall figure in a 48x48 cell with feet at y=45. Then convert to pixel art: flat colors snapped to a limited palette (3–4 shades per material), 1-px outline #1e1a24, hard alpha, no anti-aliasing, head/helmet/weapon as separate layers like the hand-drawn set. Goal: compare side by side with the hand-drawn version in the game; it should read as drawn pixel art, not as a 3D render.
```
