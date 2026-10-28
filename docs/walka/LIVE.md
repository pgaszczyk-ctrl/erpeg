# „Nowa walka” – pakiet testowy z 26.10.2026

Polecenie właściciela (9 punktów) + brief `EXP-LORE_walka_i_lowiska_test_dla_Claude.md` (wersja 2.1).
Działa **tylko na serwerze testowym** (`/test/`), nigdy w demie QR. Przełącznik: `src/walka/live.ts` `live()`;
`?live=0` wyłącza (zapamiętane na urządzeniu, `localStorage exp-live`), `?live=1` włącza.

| # | Co | Gdzie w kodzie |
|---|----|----------------|
| 1 | ~~Kamera „trochę w stronę izometrii”~~ – wycofane 26.10 (właściciel: „poprzednia była lepsza”): znów prosto z góry (`SKROT` 1); `?skrot=0.8` pokazuje próbę | `walka/live.ts`, `main.ts` (łatka `Sprite.renderWebGL`, `plaski` = nie prostuj), `GameScene.fitZoom` |
| 2 | Sterowanie jak w nowym exp-lore: stały joystick w lewym dolnym rogu, po prawej drążek ATAKU (dotknij = atak w najbliższego wroga, przeciągnij = celuj i puść, przytrzymaj = mocny cios), obok UMIEJĘTNOŚĆ, nad nim LECZ. Telefon tylko poziomo (jak pad): pionowo gra śpi pod kartą „Obróć telefon”, przy pierwszym dotyku pełny ekran + blokada poziomu, gdzie przeglądarka pozwala. Klawiatura: Spacja, Q, H, E | `controls.ts`, `ui/hudLive.ts`, `ui/poziomo.ts`, `UIScene.updateTouch` |
| 3 | Walka na żywo + siły (miecz: wyczerpanie – wolniejsze ciosy, brak mocnego ataku; łuk: zmęczenie obniża celność i siłę strzału; magia: mana). Same się odnawiają, maksimum rośnie z poziomem | `content/zasoby.ts`, `GameScene.updateZasoby/zaplacMocny/specjalny`, `fireShot` |
| 3 | HUD: ten z produkcji (teleskop: portret ze zbiornikiem EXP, poziom, rozwijana kolumna Menu/Plecak/Aparat/Pojazd) + dwie rurki obok portretu: życie i siły (z różdżką mana). Bez baniaka. Rurki na razie z kodu – zamówienie u grafika 43-P001 | `ui/hudTeleskop.ts teleskopRurki/ustawRurki`, `ui/hud.ts` |
| 3 | Umiejętność pod złotym przyciskiem zmienia się tylko w ośrodkach treningowych: sędzia stadionu i stanowiska treningowe (miecz, łuk), biblioteka (magia) | `content/umiejetnosci.ts`, `GameScene.wyborUmiejetnosci` |
| 4 | Życie nad głową bohatera; czerwone brzegi ekranu zostają | `GameScene.rysujHpNad`, `UIScene.lowLife` |
| 5 | Zamiast gangów tylko najsłabsze grupki po 3–4 (chochliki albo wilki na zieleni) w losowych miejscach, rozproszone w małym dymku (48 m), bez herszta | `content/gangi.ts GRUPKA_SLABA`, `Ambient.ts StreetEnemies.slabe` |
| 6 | Bezpieczne strefy: poza czerwonym dymkiem życie i siły wracają (siły szybciej); w dymku bieg męczy | `GameScene.updateZasoby` |
| 7 | Każdy zapis gry zapamiętuje miejsce bohatera (`save.tu`); po wznowieniu startuje tam (po skończonej jeździe – na stacji) | `GameScene.save`, `quests.ts`, `travel.ts enterWorld` |
| 8 | Łowiska epicentryczne w terenie bez zabudowy: obrzeże (wilki) → głębia (wargi) → rdzeń (zastępczy boss QA: Mosiężny Kozioł) z mgiełką gęstniejącą ku środkowi; z dala od wsi (>3 domy w 330 m wyklucza) i głównych dróg | `content/lowiska.ts LOWISKA_EPI`, `scenes/Lowiska.ts` |
| 9 | Rozmowy, drzwi, stragany, pociągi/wozy, cele questów „idź” i przystanki etapów – tylko dwuklikiem/dwutapem (albo E), z podpowiedzią na miejscu | `controls.ts tapped`, `GameScene.interact/questTap`, `Etapy.dotknij` |

## Runda 2 (26.10.2026): walka jak wilki w exp-lore, łup z panelu

Właściciel: „walka jest kiepska – wciąż po prostu podchodzą jak stare chochliki”, „ten podbieg z pokazywaniem zakresu jest super”.

- **Każdy stworek** w trybie live walczy przez `objects/StworAI.ts` (zastąpił WilkAI): podejście → czerwona zapowiedź
  (pokazany obszar = prawdziwe trafienie, wypełnia się do chwili ciosu) → atak trafiający najwyżej raz → odpoczynek.
  Nikt nie zadaje już obrażeń samym dotykiem. Wspólny limit: 2 ataki wręcz + 1 dystansowy naraz; reszta krąży
  wokół bohatera w odstępach. Liczby: `content/lowiska.ts STWORY_AI` (wartości do testu).
- Formy ataków wzięte z pakietu bestiariusza ChatGPT (gałąź exp-lore `chatgpt/bestiary-handoff`, `actions.json`):
  wilk – doskok (wolf_lunge); warg – ugryzienie w klin z bliska (warg_bite) i daleki skok z długą zapowiedzią
  (warg_pounce); chochlik leśny – rzut żołędziem z dystansu (acorn: trzyma 12–18 m, ucieka, pocisk staje na ścianie);
  zwykłe stworki misji – doskok jak wilk.
- **Boss (Mosiężny Kozioł)**: taran po zapowiedzianym pasie, tupnięcie – koło wokół niego ze spowolnieniem ×0,5 na 2 s
  (jak roots), rogi – klin z bliska (jak peat_slam). Nie odskakuje po ciosach. Brief ChatGPT mówi o bossie tylko tyle:
  „silny skok lub atak obszarowy, czytelna zapowiedź, rezerwuje limit” (bazyliszek ma w pakiecie jedno spojrzenie
  w klin), więc ten zestaw to **propozycja do potwierdzenia** z ChatGPT/właścicielem.
- **Łowiska gęstsze i rozproszone**: komórka 1,1 km, promień 300 m; obrzeże 7 watah po 4–8 wilków, głębia 4 grupy
  wargów + 2–3 chochliki z żołędziami, członkowie rozsiani po całym terenie grupy (95 m) co najmniej 7 m od siebie.
  Gdy w komórce nie ma otwartego terenu, czasem (35%) **małe łowisko w miejskim parku** (120 m, sama warstwa
  zewnętrzna: 2 grupy po 3–5 wilków albo chochlików).
- **Panel admina „🐺 Stworki”**: EXP i łup dla każdego stworka; łup = wiersze (cokolwiek z gry: złoto, diament,
  mikstura, serce, towary, amunicja, przedmioty) × ilość × szansa %, „＋ Dodaj przedmiot”. Każdy wiersz losowany
  osobno. Tabela `stwory_lup`, RPC `game_stwory` / `admin_stwory` / `admin_stwory_zapisz` (docs/sql/stwory-lup.sql,
  w bazie). Gra czyta przy starcie (`content/stwory.ts`), stosuje tylko w nowej walce. Nowy towar **kieł**
  (15 monet, ikonka z kodu).

## Wartości do strojenia (nie zatwierdzony balans)

Siły 100 (+4/poziom), odnowa (10 + 0,25 × poziom)/s po 2,2 s od ostatniego zużycia (×1,6 w bezpieczeństwie, ×0,65 w zagrożeniu). Mana bez zmian: 60 (+8/poziom), (4 + 0,35 × poziom)/s po 3 s.
Cios w zasięgu wroga 10, mocny atak/umiejętność 30 (+2,5 s odnowienia), zwykły strzał 10, czar 6 (bez many czar ma 40% siły), mocny czar 20. Zwykły ruch jest darmowy, również w dymku. Życie tylko w bezpieczeństwie: pół serca co 2 s, 4 s po ostatniej ranie. Zagrożenie obejmuje dymek, loch i pobliskiego przeciwnika.

### Strojenie 28.10.2026 — presja od pierwszego poziomu

- Chochlik: zapowiedź 550 ms + odpoczynek 450 ms (wcześniej 850 + 1100 ms), żołądź 36 m/s zamiast 24. Nadal tylko jeden zarezerwowany atak dystansowy; pociski respektują ściany i blokują kierunek na początku zapowiedzi.
- Zwykłe trafienie stwora z StworAI nie odpycha ani nie przerywa jego ataku. Mocny cios i esencje zachowują jawne ogłuszenie; efekt trafienia i obrażenia zostają.
- Dziesięć ciosów bez odpoczynku opróżnia pulę poziomu 1. Poniżej 20% zwykły miecz działa 1,8× wolniej i zadaje 60% obrażeń; mocna umiejętność wymaga pełnego kosztu. Ten sam czas odnowienia obowiązuje tapnięcie, klawiaturę i kierowany atak drążkiem.
- Odwrót i omijanie czerwonych zapowiedzi pozwalają odpoczywać: brak zużycia sił i spowolnienia za sam ruch. Po ok. 6 s bez ataków w zagrożeniu wraca ok. 25–30 sił, nie cała pula.
- Test zasobów: node scripts/tests/combat-balance.mjs. Test AI/HUD: node scripts/tests/browser-combat-balance.mjs (TELEFON=1), po buildzie i podglądzie na 4173.
- Stan: build, osobny typecheck i test zasobów przeszły lokalnie. Środowisko wyłączono podczas prób przeglądarkowych; końcowego wyniku PC/telefonu brak. Ta gałąź wymaga dokończenia tych prób przed połączeniem z serwerem TEST. Balans pozostaje do oceny właściciela.

## Czego jeszcze nie ma

- Stan łowisk (pokonane grupy, boss) żyje tylko w sesji – po nowym logowaniu grupy są pełne.
- Mgiełka łowiska to koła (nie przycinana do kształtu lasu/pola); rdzeń nie ma własnego modelu bossa.
- Chochliki/wargi/kozioł nie mają jeszcze osobnych klatek ataku – zapowiedź i atak widać po czerwonych obszarach.
- Brak osobnego sprintu i aktywnego uniku; unikanie odbywa się zwykłym, darmowym ruchem.
- Siłowni (OSM leisure=fitness_centre) nie ma jeszcze w danych mapy.
