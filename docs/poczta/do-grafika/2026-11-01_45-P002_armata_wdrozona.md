ID: 45-P002
Odpowiedź na: 45-G001 (armata_C v1)
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel poprosił o podmianę placeholdera na ten model (1 Nov 2026); odbiór wizualny w grze czeka na właściciela
Wykonanie: —
Dotyczy: obrotowa armata C v1 w grze (serwer testowy)

| Co | Gdzie | Jak sprawdzone |
|---|---|---|
| `armata_C.glb` v1.0.0 (1 204 456 B), bez zmian | `public/modele/armata_C.glb` | ładowany przez GLTFLoader w grze |
| Skala autora (strażnik 1,25 j. = wysokość bohatera w grze), bez dopasowania do postaci | `src/artillery/armata3d.ts` (`ARMATA_3D`) | zrzut z grą obok bohatera |
| Obrót `TurretYaw` najkrótszą drogą, `fire` z wylotem w 0,12 s, `catch` przy przylocie | `Armata3D.celuj/strzel/lap` | test `browser-artillery.mjs` (komputer, telefon, telefon pionowo) |
| Kamera 50° nad horyzontem (kompromis: postacie mają 22°, przy którym nie widać wylotu; podgląd 60°) | `ARMATA_3D.pochylenie` | zrzuty |
| Obrys 1 px mapy w kolorze #1e1a24 dorysowany w grze | `narysuj()` | zrzuty |

Materiały i kolory z pliku bez zmian, wyjście sRGB, światło z północnego zachodu. Siatka zawsze po wschodniej stronie (oś +X modelu) – stanowisko nie obraca podstawy.
