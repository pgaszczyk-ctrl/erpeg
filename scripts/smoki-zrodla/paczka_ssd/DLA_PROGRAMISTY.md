# Dwa nowe smoki, świnka i dekoracje zamiast straganów

## Smoki

W folderach `smok_ognisty/` i `smok_kwasowy/` jest po **39 klatek PNG 220×200**. Są już w rozmiarze gry; nie stosować poprzedniego zmniejszania obrazów 512 px. Ustawiać filtrowanie nearest-neighbor, bez wygładzania.

| Animacja | Kierunki | Klatki na kierunek |
| --- | --- | --- |
| `stoi` | `bok`, `przod`, `tyl` | 2 |
| `idzie` | `bok`, `przod`, `tyl` | 4 |
| `ugryzienie` | `bok`, `przod`, `tyl` | 3 |
| `ziej` — ognisty | `bok`, `przod`, `tyl` | 3 |
| `pluj` — kwasowy | `bok`, `przod`, `tyl` | 3 |
| `smierc` | `bok` | 3 |

Nazwy: `smok_<gatunek>_<animacja>_<kierunek>_<nr>.png`. Bok patrzy w lewo, prawy kierunek uzyskać lustrem. Przód oznacza ruch w dół ekranu, tył w górę. Widoki z przodu mają lekko skręcone głowy i przesunięte łapy. Ognisty jest smukły, z długimi rogami i szczelinami żaru; kwasowy ma worek gardłowy, wiotką szyję i fioletową kryzę.

Każdy gatunek ma osobną wspólną paletę: **15 kolorów ciała + #FF00FF**. Dokładną magentę usuwać przy imporcie. `paleta.png` jest wzorcem kolorów, nie klatką animacji. GIF-y i PNG z `podglad` są wyłącznie do sprawdzania.

Eksport używa jednej skali i jednej pozycji odniesienia w całej animacji danego kierunku. Nie przycinać ani nie wyśrodkowywać osobno gotowych klatek. Punkt odniesienia płótna to `[110,170]`; prostokąty rysunków są w `klatki_i_pivoty.json`. Jest to techniczny punkt odniesienia eksportu, nie zmierzony pivot istniejącego renderera gry. Po integracji skorygować wspólny offset kierunku, jeśli wymagają tego jego pozycje stóp.

W ugryzieniu/specialu klatka 1 zapowiada, 2 trafia/emituje, 3 wraca. Chód zapętlać 1–4; oddychanie 1–2. Śmierć odtworzyć raz i zatrzymać ostatnią klatkę. Przykładowe tempa GIF-ów służą podglądowi; rytm walki i prędkość ruchu zachować zgodnie z istniejącą logiką gry. Nie wyznaczać obrażeń z podglądu GIF.

## Efekty — osobno od ciał

Folder `efekty/` zawiera:

- ogień: 5 kierunków × 3 fazy = 15 PNG, płótno 128×128;
- przypaloną plamę: 3 fazy;
- pocisk kwasu: 2 klatki;
- rozbryzg kwasu: 3 klatki;
- kałużę kwasu: 3 klatki pętli.

Ogień ma kierunki `prawo`, `prawo_dol`, `dol`, `prawo_gora`, `gora`; lewe kierunki uzyskać lustrem. Pełny stożek ma około 108 px długości, kałuża około 65 px szerokości, kula pocisku około 7 px i około 12 px razem z ogonem. Pozostałe efekty mają płótno 96×96. `efekty/metadata.json` podaje punkt emisji/zakotwiczenia i obrys każdej klatki. Ogień mocować punktem emisji do pyska, pozostałe obiekty do pozycji uderzenia lub pocisku. Dokładny offset pyska trzeba sprawdzić w rendererze.

Efekty są na magencie. Faza emisji przypada na drugą klatkę `ziej`/`pluj`. Plama i rozbryzg nie są pętlami; kałuża i lecący pocisk mogą zapętlać animację. Nie zmieniać dotychczasowych efektów smoka górskiego.

## Świnka — zabawka psa

`ikony/swinka.png` — PNG z przezroczystością, **32×32**; `ikony/swinka_16x16.png` — wariant **16×16** do małych slotów. Podmienić ikonę istniejącego przedmiotu przez aktualną konfigurację jego zasobu; ID przedmiotu nie było dołączone, dlatego nie podaję zgadywanej nazwy w kodzie. To gumowa zabawka z ryjkiem, czarnym oczkiem, paskami i otwartą buzią, nie zwierzę/NPC. Nie dodawać interakcji ani steampunkowych ozdób do przedmiotu.

## Dekoracje zamiast dekoracyjnych straganów

Sześć PNG z przezroczystością w `dekoracje/`, każdy na płótnie **64×80**, z punktem podstawy **[32,72]**:

| Plik | Proponowane użycie |
| --- | --- |
| `zegar_uliczny.png` | narożnik placu, okolica wejścia |
| `pompa_parowa.png` | przy murze lub hali, rzadziej |
| `teleskop.png` | otwarty plac, pojedyncze stanowisko |
| `lawka_trybiki.png` | obrzeża placu i chodników |
| `donica_miedziana.png` | wejścia i narożniki, najczęściej |
| `gablota_ogloszen.png` | przy wejściu lub rozwidleniu |

Rozmiar rysunku i anchor są w `dekoracje/metadata.json`. Dekoracje **nie są sklepami**: nie nadawać im hitboxu interakcji sprzedawcy, świecenia, ikony handlu ani ekwipunku. Zastąpić nimi warstwę dekoracyjnych straganów, a nie aktywnych sprzedawców.

Proponowana reguła, do dostosowania przez programistę:

1. W miejscu wskazanego świecącego punktu handlu losować **1–5 aktywnych straganów** w jednej luźnej grupie, z zachowaniem istniejącej interakcji handlu. Nie mnożyć automatycznie nagród ani identycznych sprzedawców.
2. Usunąć stare dekoracyjne stragany. Nie wypełniać każdego ich punktu nowym obiektem: wykorzystać orientacyjnie **25–35%** dawnych miejsc, zachować przejścia i odstęp minimum 1,5 szerokości obiektu.
3. Losować mieszankę dekoracji: donica 30%, ławka 25%, zegar 15%, gablota 15%, pompa 10%, teleskop 5%. To propozycja rozmieszczenia, nie zmiana wykonana w kodzie gry.
4. Użyć stałego seeda obszaru, aby układ nie zmieniał się przy każdym odświeżeniu. Wykluczyć wejścia, drogi ruchu, aktywne punkty i kolizje budynków.

## Zakres i kontrola

Paczka zawiera dwa nowe gatunki z pełną listą klatek z zamówienia 15b, ich efekty, ikonę i sześć dekoracji. Nie obejmuje kolejnych gatunków leśnego/trującego/Cienia ani brakującej reszty uproszczonych klatek górskiego. Opis Cienia smoka nie był dostarczony.

Przed publikacją sprawdzić GIF-y i przejścia między animacjami w grze, skalę względem bohaterki, kotwicę stóp, offset efektu przy pysku oraz przejścia między dekoracjami. Kod i uruchomiona gra nie były dołączone, więc integracja nie została przetestowana. Rysunki powstały generatorem, następnie zostały wyeksportowane nearest-neighbor, ze wspólnymi paletami i bez ditheringu; nie jest to filtrowanie starych szczegółowych smoków.
