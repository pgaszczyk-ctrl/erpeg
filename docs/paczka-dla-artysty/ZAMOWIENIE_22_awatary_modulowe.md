# Zamówienie 22: bohater z klocków – 10 głów, 8 tułowi, zmienne kolory

## Pilna poprawka stylu po próbie v2 (8.10.2026)

Właściciel obejrzał nowe postacie w grze: **„wyblakłe, wychudzone i bardzo nijakie”**. Próba v2 nie ma zaakceptowanego stylu. Wróć do wyglądu istniejących bohaterów Exp-lore, zwłaszcza łuczniczki („blondynki”), wędrowca i rycerza; wzory: `public/postacie/ranger.png`, `traveler.png`, `knight.png` oraz `22_awatary/przyklad_skladania_x3.png`. Zachowaj modułowe głowy i ciała oraz osobne punkty `broda` / `szyja` opisane niżej.

- Kolory wyraźne, nasycone jak u obecnych bohaterów; czytelne światło i cień, mocny kontrast ubrania, włosów i twarzy. Neutralne kolory potrzebne do masek nie mogą dawać bladej, szarej postaci po złożeniu i przebarwieniu.
- Pełniejsze, zwarte sylwetki: szerokość ramion, tułowia, rąk i nóg porównywalna z istniejącymi bohaterami. Duża głowa, krótka szyja i wyraźne buty; bez wychudzonego korpusu pod wielką głową. Niższe i wyższe ciała nadal mają mieć naturalne proporcje.
- Twarze, fryzury i stroje mają mieć charakter i być rozpoznawalne w zwykłym rozmiarze gry. Utrzymaj obecny obrys, ostre piksele i kierunek światła.
- Najpierw popraw tylko próbę: dwie głowy i dwa ciała, komplet klatek oraz masek. Dołącz porównanie obok obecnych bohaterów **w tej samej skali**, także po złożeniu i przebarwieniu; pokaż przód, bok i tył oraz podgląd bez powiększenia. Dalsze części dopiero po akceptacji właściciela.

Ta poprawka dotyczy rysunków. Samo zwiększenie nasycenia w grze nie naprawi proporcji ani nijakich twarzy.

Dziś gracz wybiera jednego z 10 gotowych bohaterów. Właściciel chce, żeby każdy mógł złożyć własnego: **10 głów × 8 tułowi = 80 postaci**, a do tego **kolory skóry, włosów i ubrania** do wyboru. Gra będzie składać bohatera z dwóch warstw: najpierw tułów, na nim głowa.

**To nie są „modułowe postacie 24×30”, które właściciel kiedyś odrzucił („fatalnie wyglądają”).** Rysujesz dokładnie w tym samym rozmiarze i stylu co obecni bohaterowie (wzór: łuczniczka v1, „blondynka”): klatki 64 × 64, duża głowa, obrys 1 px #1e1a24, światło z lewej-góry. Sprawdziliśmy, że to działa: w `22_awatary/przyklad_skladania_x3.png` są obecne postacie rozcięte na szyi i złożone na krzyż. Wyglądają naturalnie. Przeszkadza tylko jedno: dziś każda postać ma szyję gdzie indziej (od wiersza 35 do 44). Dlatego wszystkie nowe części muszą trzymać się jednego szablonu.

## Szablon (najważniejsze)

Plik `22_awatary/szablon_192.png` (do podłożenia jako warstwa) i `szablon_opis_x4.png` (powiększony, z opisem).

- Arkusz **192 × 192 = 3 × 3 klatki po 64 px**, jak dotąd. Wiersze: dół / bok (patrzy w lewo) / góra. Kolumny: krok A / stoi / krok B.
- **Punkt szyi w każdej klatce: x 32 (w wierszu „bok” x 31), y 39.** Ten sam we wszystkich 10 głowach i 8 tułowiach, także w klatkach kroku. Bez podskoku: kołysanie przy chodzie dodamy w kodzie.
- **Głowa** (twarz, uszy, włosy, nakrycie głowy) leży powyżej wiersza 39. Włosy, broda albo warkocz mogą zachodzić na tułów w pasie do wiersza 44. Głowa jest rysowana NA tułowiu.
- **Tułów** zaczyna się od wiersza 40: szyja, ramiona, ręce, nogi, buty. **Stopy na wierszu 62**, jak dotąd.
- Głowa w kolumnach krok A i krok B może być kopią głowy z kolumny „stoi”.
- **Włosy za plecami** (długie włosy w widoku z przodu, które powinny chować się za ramionami): narysuj je w osobnym pliku `glowa_XX_tyl.png`, w tym samym układzie. Gra położy go POD tułowiem. Plik jest potrzebny tylko głowom, które go wymagają.

## Kolory zmieniane w grze (maski)

Do każdego pliku dołącz maskę `..._maska.png` w tym samym układzie. Kolor maski mówi grze, którą część może przebarwić:

| Kolor maski | Głowa | Tułów |
|---|---|---|
| niebieski (0, 0, 255) | skóra (twarz, uszy, szyja) | skóra (szyja, dłonie, gołe ręce) |
| żółty (255, 255, 0) | włosy, brwi, broda, wąsy | – |
| czerwony (255, 0, 0) | nakrycie głowy, gogle, chusta – kolor główny | ubranie – kolor główny |
| zielony (0, 255, 0) | nakrycie głowy – kolor drugi | ubranie – kolor drugi (kamizelka, fartuch, peleryna) |
| przezroczysty | oczy, usta, obrys, metal, mosiądz | pas, guziki, buty, metal, mosiądz |

Rysuj części z maską w **neutralnym, średnim tonie** z 3–4 odcieniami (światło, ton, cień, głęboki cień). Gra zachowa jasność każdego piksela i podmieni tylko barwę. Włosy rysuj w średnim brązie: nie czarne i nie białe, bo z takich nie da się zrobić innych kolorów. Skórę rysuj w średnio jasnym tonie. Obrys #1e1a24 i oczy zostają bez maski.

Listę kolorów do wyboru (ok. 6 karnacji, 10 kolorów włosów, 12 kolorów ubrań) dobierzemy w kodzie, z palety świata. Ty nie musisz robić wariantów kolorystycznych.

## Lista części

**10 głów** (`glowa_01.png` … `glowa_10.png`), różne płcie i charaktery. Wszystkie w tym samym, „dziecięco-dużym” rozmiarze głowy co obecni bohaterowie:

1. Krótkie, rozczochrane włosy.
2. Wysoki kucyk (jak łuczniczka).
3. Dwa warkocze.
4. Długie, proste włosy do ramion (z plikiem `_tyl`).
5. Kok z wetkniętym ołówkiem.
6. Gęste loki.
7. Krótko ścięty, wąsy i bokobrody.
8. Grzywka i gogle lotnicze na czole (steampunk; gogle = czerwony, paski = zielony).
9. Mały melonik z mosiężnym trybikiem, włosy wystają spod spodu (melonik = czerwony).
10. Chusta zawiązana na włosach (chusta = czerwony, wzór = zielony).

**8 tułowi** (`tulow_01.png` … `tulow_08.png`). Każdy pasuje do każdej głowy:

1. Koszula i kamizelka podróżnika (koszula = czerwony, kamizelka = zielony).
2. Skórzana kurtka z szalikiem.
3. Tunika z kapturem zarzuconym na plecy, pas z sakiewką.
4. Sukienka z warsztatowym fartuchem i mosiężnymi guzikami.
5. Lekka zbroja: napierśnik i naramienniki (metal bez maski), tunika pod spodem (maska).
6. Płaszcz z peleryną do kolan.
7. Surdut z kamizelką i łańcuszkiem zegarka (steampunk).
8. Kombinezon mechanika z szelkami i grubymi rękawicami.

Tułów nie trzyma broni ani tarczy (broń gra rysuje osobno). Plecy w wierszu „góra” mają być równie dopracowane jak przód.

## Chód (uwaga z zamówienia 06)

Kroki A i B muszą się wyraźnie różnić: jedna noga z przodu, druga z tyłu, ręce w przeciwnym rytmie, również w widoku z boku. Przy zbyt podobnych krokach postacie w grze „lewitują”. Zrób to też w sukience, płaszczu i kombinezonie: spod spodu ma być widać ruch nóg.

## Awatar w HUD-zie

Gra wycina głowę z klatki „dół / stoi” (ok. 36 × 36 px) jako portret w maszynce HUD-u i w Kufrze. Twarz z przodu musi więc być czytelna sama, bez tułowia.

## Kolejność

1. **Próba:** głowy 1 i 2, tułowie 1 i 4: wszystkie 9 klatek, maski, u głowy 4 też `_tyl`, jeśli robisz ją od razu. Złożymy w grze 4 połączenia, przebarwimy i pokażemy właścicielowi.
2. Po akceptacji: reszta głów i tułowi.

## Pliki do oddania

```
22_awatary_od_grafika/
  glowy/glowa_01.png, glowa_01_maska.png, (glowa_04_tyl.png, glowa_04_tyl_maska.png) …
  tulowie/tulow_01.png, tulow_01_maska.png …
  podglad_zlozone_x3.png   (kilka złożonych połączeń, dla nas do porównania)
```

PNG z przezroczystym tłem (jak obecni bohaterowie, nie magenta), bez wygładzania, ostre piksele.

## Co zrobimy po naszej stronie (do wiadomości)

Gra złoży bohatera z warstw: włosy-tył → tułów → głowa, i przebarwi je według masek. W tworzeniu postaci pojawią się strzałki ◀ ▶ dla głowy i tułowia oraz kolory skóry, włosów i ubrania, a w Kufrze ta sama przebieralnia. Dotychczasowi bohaterowie zostają, kto ich ma, zachowuje swój wygląd.

---

## Poprawka po próbie (7.10.2026) – głowy i ciała osobno

Próbę (głowy 1–2, tułowie 1 i 4) złożyliśmy w grze i przebarwiliśmy. Właściciel ocenił: **szyje są za długie**. Przez sztywny szablon („głowa kończy się na wierszu 39, tułów zaczyna się na 40”) każda postać ma ten sam, wyciągnięty odstęp brody od ramion. Na razie w grze opuszczamy głowę o 3 px, co wygląda dużo lepiej (`22_awatary/proba_w_grze_x3.png`). Na dalsze części zmieniamy zasady:

1. **Głowy i ciała rysuj jako osobne obrazki, nie w jednym szablonie postaci.** Głowa to sama głowa: twarz, włosy, uszy, nakrycie głowy. Bez szyi, ewentualnie 1 px cienia pod brodą.
2. **Ciała mogą mieć różny wzrost:** niższe (dziecięce, krępe) i wyższe (smukłe). Szyja jest częścią ciała: krótka, 1–2 px widocznej skóry.
3. **Każda część podaje swój punkt zaczepienia w każdej klatce** (w `metadata.json`):
   - głowa: punkt pod brodą (`broda` [x, y]);
   - ciało: punkt na szyi, w którym ma stanąć broda (`szyja` [x, y]);
   - stopy ciała zostają na wierszu 62, w punkcie [32, 62].

   Gra położy brodę głowy w punkcie szyi ciała. Dzięki temu każda głowa pasuje do każdego ciała, niezależnie od jego wzrostu.
4. **Arkusze bez zmian:** 192 × 192, 3 × 3 klatki po 64 px, wiersze dół / bok (w lewo) / góra, kolumny krok A / stoi / krok B. Głowa może być wszędzie w swoich klatkach. Liczy się punkt `broda`.
5. **Maski:** w głowie 01 kilka pasemek włosów było namalowanych tonem skóry i oznaczonych jako skóra. Po przebarwieniu włosów zostawały brązowe paski. Gra to teraz łata, ale proszę: wszystko, co jest włosami, w masce na żółto, niezależnie od użytego koloru.

Kolejność bez zmian: najpierw 2 głowy i 2 ciała (jedno niższe, jedno wyższe) według nowych zasad, potem reszta.
