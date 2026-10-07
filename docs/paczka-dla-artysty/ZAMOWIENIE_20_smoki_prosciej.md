# Zamówienie 20: smoki prościej (poprawka do smoka górskiego i wytyczne dla kolejnych gatunków)

Smok górski z paczki „koziol_i_smok_gorski” jest już w grze: chodzi, gryzie, startuje, lata i ląduje z Twoimi efektami. **Animacje i kierunki są dobre.** Właściciel ocenił jednak w grze, że **„smok jest zbyt detaliczny”**. Obok zielonej trawy, prostych dachów i postaci smok wygląda jak z innej gry.

Obrazki są w folderze `20_smok_prosciej/`:

- `1_smok_w_grze_teraz_x3.png`: smok w grze dziś (powiększony 3×). Ma setki drobnych łusek, każda z własnym światłem i cieniem, oraz plamy śniegu z wieloma odcieniami. Z odległości zlewa się w szum.
- `2_koziol_w_grze_dobry_przyklad_x3.png`: Kozioł w grze. **Taka gęstość jest dobra:** duże, czytelne płaszczyzny, mało kolorów i wyraźny obrys.
- `3_nasza_proba_uproszczenia_skryptem_NIE.png`: po lewej Twój smok, po prawej nasza próba automatycznego uproszczenia (grubsze piksele, 16 kolorów). Wyszło gorzej: błoto, zgubiony pysk. **Uproszczenia nie da się zrobić skryptem, musi je narysować ręka.**

## Skąd problem (nasza wina w wytycznych)

W zamówieniu prosiliśmy o „piksele jak u postaci” i 24–32 kolory przy smoku na 8–9 wzrostów bohaterki. Smok jest kilka razy większy od postaci, więc przy pikselu postaci ma kilkadziesiąt razy więcej pikseli do zapełnienia, a generator zapełnił je detalem. Do tego rysunek powstał duży (klatki 512 px) i zmniejszamy go skryptem mniej więcej o połowę, więc drobne łuski zamieniają się w szum.

## Nowe wytyczne dla smoków (górski poprawiony i wszystkie kolejne gatunki)

1. **Rysuj od razu w rozmiarze gry**, nie dużo większym. Klatka ok. **220 × 200 px**, smok z boku ok. **160 px długości** (6 wzrostów bohaterki; bohaterka ma ok. 27 px wzrostu). Zmniejszenie z 512 px niszczy rysunek.
2. **Najwyżej 12–16 kolorów na cały arkusz**, wspólnych dla wszystkich klatek. Na każdą barwę 3 odcienie: światło, ton, cień. Bez dodatkowych pośrednich.
3. **Duże płaszczyzny zamiast łusek:** pancerz z 6–10 dużych płyt na grzbiecie, brzuch jednym pasem, skrzydło jako 3–4 pola błony między kośćmi. Pojedyncza łuska nie powinna mieć mniej niż ok. 6 × 6 px.
4. **Śnieg i kryształy (smok górski):** kilka dużych białych czap (na barkach, grzbiecie i łbie), każda w 2 odcieniach. Nie rób drobnych plamek po całym ciele.
5. **Czytelna sylwetka:** łeb, rogi, skrzydła i ogon mają się dać rozpoznać w samym obrysie, również z tyłu i z przodu. Obrys 1 px #1e1a24 dookoła, wewnątrz tylko tam, gdzie oddziela duże części (skrzydło od tułowia).
6. **Bez szumu, bez ditheringu**, bez pojedynczych samotnych pikseli innego koloru.
7. Światło z lewej-góry, tło magenta #FF00FF, bez różowej obwódki.
8. Te same nazwy plików i ta sama lista klatek co w paczce „koziol_i_smok_gorski”, więc gra podmieni je bez zmian w kodzie.

**Efekty uderzenia** (fala, pył, pęknięcia, odłamki) są w porządku i zostają.

## Kolejność

1. Smok górski poprawiony: najpierw **2 klatki próbne** (`stoi_bok_1` i `stoi_przod_1`) do akceptacji właściciela, potem reszta.
2. Następne gatunki (leśny, kwasowy, trujący, ognisty, Cień smoka) od razu według tych wytycznych.

## Polecenie dla generatora (dopisz do dotychczasowego)

```
Simplify: SNES-era chunky pixel art, max 16 colours for the whole sheet, 3 shades per colour,
big readable armour plates (6-10 on the back), no tiny scales, no noise, no dithering, no lone pixels,
a few big snow caps instead of speckles, clear silhouette, 1-pixel dark outline #1e1a24.
Draw it at FINAL size: frame about 220x200 px, the dragon about 160 px long from the side.
```
