# Zamówienie 22: bohater z klocków – 10 głów, 8 tułowi, zmienne kolory

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
