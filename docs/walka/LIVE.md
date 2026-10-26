# „Nowa walka” – pakiet testowy z 26.10.2026

Polecenie właściciela (9 punktów) + brief `EXP-LORE_walka_i_lowiska_test_dla_Claude.md` (wersja 2.1).
Działa **tylko na serwerze testowym** (`/test/`), nigdy w demie QR. Przełącznik: `src/walka/live.ts` `live()`;
`?live=0` wyłącza (zapamiętane na urządzeniu, `localStorage exp-live`), `?live=1` włącza.

| # | Co | Gdzie w kodzie |
|---|----|----------------|
| 1 | Kamera „trochę w stronę izometrii”: mapa spłaszczona w pionie (`SKROT` 0,8; `?skrot=0.7` do prób), ludziki i potwory rysowane wyprostowane | `walka/live.ts`, `main.ts` (łatka `Sprite.renderWebGL`, `plaski` = nie prostuj), `GameScene.fitZoom` |
| 2 | Sterowanie: stały joystick w lewym dolnym rogu, po prawej ATAK (przytrzymaj = celowanie / mocny cios), UMIEJĘTNOŚĆ, LECZ. Klawiatura: Spacja, Q, H, E | `controls.ts`, `ui/hudLive.ts`, `UIScene.updateTouch` |
| 3 | Walka na żywo + siły (miecz: wyczerpanie – wolniejsze ciosy, brak mocnego ataku; łuk: zmęczenie obniża celność i siłę strzału; magia: mana). Same się odnawiają, maksimum rośnie z poziomem | `content/zasoby.ts`, `GameScene.updateZasoby/zaplacMocny/specjalny`, `fireShot` |
| 3 | HUD: u góry po lewej baniak życia, pod nim pasek sił (albo many z różdżką), pod nim termometr EXP; przyciski Kufer i aparat | `ui/hudLive.ts`, `ui/hud.ts` |
| 3 | Umiejętność pod złotym przyciskiem zmienia się tylko w ośrodkach treningowych: sędzia stadionu i stanowiska treningowe (miecz, łuk), biblioteka (magia) | `content/umiejetnosci.ts`, `GameScene.wyborUmiejetnosci` |
| 4 | Życie nad głową bohatera; czerwone brzegi ekranu zostają | `GameScene.rysujHpNad`, `UIScene.lowLife` |
| 5 | Zamiast gangów tylko najsłabsze grupki po 3 (chochliki albo wilki na zieleni) w losowych miejscach, dymek ok. 3× mniejszy, bez herszta | `content/gangi.ts GRUPKA_SLABA`, `Ambient.ts StreetEnemies.slabe` |
| 6 | Bezpieczne strefy: poza czerwonym dymkiem życie i siły wracają (siły szybciej); w dymku bieg męczy | `GameScene.updateZasoby` |
| 7 | Każdy zapis gry zapamiętuje miejsce bohatera (`save.tu`); po wznowieniu startuje tam (po skończonej jeździe – na stacji) | `GameScene.save`, `quests.ts`, `travel.ts enterWorld` |
| 8 | Łowiska epicentryczne w terenie bez zabudowy: obrzeże (wilki) → głębia (wargi) → rdzeń (zastępczy boss QA: Mosiężny Kozioł) z mgiełką gęstniejącą ku środkowi; z dala od wsi (>3 domy w 330 m wyklucza) i głównych dróg | `content/lowiska.ts LOWISKA_EPI`, `scenes/Lowiska.ts` |
| 9 | Rozmowy, drzwi, stragany, pociągi/wozy, cele questów „idź” i przystanki etapów – tylko dwuklikiem/dwutapem (albo E), z podpowiedzią na miejscu | `controls.ts tapped`, `GameScene.interact/questTap`, `Etapy.dotknij` |

## Wartości do strojenia (nie zatwierdzony balans)

Siły 100 (+4/poziom), odnowa 15/s po 1,5 s (×1,6 poza dymkiem, ×0,7 w dymku); mana 60 (+8/poziom), 4/s po 3 s.
Cios w wroga 4, mocny atak/umiejętność 25 (+2,5 s odnowienia), strzał 6, czar 6 (bez many czar ma 40% siły),
mocny czar 20, bieg w dymku 3/s. Życie poza dymkiem: pół serca co 2 s, 4 s po ostatniej ranie.

## Czego jeszcze nie ma

- Stan łowisk (pokonane grupy, boss) żyje tylko w sesji – po nowym logowaniu grupy są pełne.
- Mgiełka łowiska to koła (nie przycinana do kształtu lasu/pola); rdzeń nie ma własnego modelu bossa.
- Brak osobnego sprintu i aktywnego uniku; „bieg” = chodzenie po czerwonym dymku.
- Siłowni (OSM leisure=fitness_centre) nie ma jeszcze w danych mapy.
