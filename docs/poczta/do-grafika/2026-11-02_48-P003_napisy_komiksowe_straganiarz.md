ID: 48-P003
Odpowiedź na: 48-G001
Od: programista
Do: grafik
Status: nowe
Akceptacja: czeka na właściciela
Wykonanie: –
Dotyczy: komiksowe napisy (WHOOP przy wystrzale + „dymki” walki) i hala kulociągu do chodzenia (mapa przejść, warstwy przednie, punkty, gazeciarz i straganiarz w skali hali, mrugająca lampa)

# Zamówienie 48-P003

Właściciel (2 XI 2026): „napis WHOOP chyba musi zrobić grafik”. Dziś te napisy rysuje kod:
- wystrzał kulociągu: żółta gwiazda-wybuch z obrysem i czerwone „WHOOP!” (EN „WHOOSH!”) na środku ekranu, 2 s;
- walka (`src/ui/comicBurst.ts`): przy trafieniu liczba obrażeń (do 9 – sama kremowa liczba z obrysem, od 10 –
  w żółtej gwieździe z „!”), przy pudle szary dymek „PUDŁO” / „MISS”. Font Comic Neue, kształty z kodu.

## 1. Napisy komiksowe – jeden komplet, żeby wszystko było w tym samym stylu
Pikselowy komiks w naszej palecie, obrys #1e1a24, twarde krawędzie, przezroczyste tło.
- „WHOOP!” i „WHOOSH!” (osobne pliki PL/EN), duży wybuch ok. 320×200, 3 klatki: wyskok, pełny, lekko drgający.
- Pusta gwiazda-wybuch do liczb obrażeń w 3 wielkościach (ok. 44×42, 54×50, 64×58) – program wpisze liczbę.
- Dymek „PUDŁO” i „MISS” (ok. 64×32).
- Opcjonalnie: „BUM!” (strzał armaty), „PSSST!” (para), „CHLUP!” (woda).

## 2. Hala do chodzenia (zmiana właściciela, 2 XI 2026)
Właściciel: „zejście do podziemi z metrem to normalne zejście. Wchodzisz i na hali możesz chodzić, gadać z NPC
i coś kupić. Dopiero kupujesz bilet przy podejściu do kuli.” Hala z 48-G001 przestaje więc być tylko tłem
animacji: bohater schodzi schodami z ulicy i chodzi po niej jak po lochu albo arenie. Potrzebujemy do tej samej
hali (płótno 1672×941, ta sama kamera):

- **Mapa chodzenia**: PNG 1672×941, biały = można chodzić, czarny = ściana/mebel/rura. Na posadzce, bez
  ścian, ławek, beczek, skrzyń, lamp, schodów spiralnych (poza ich zejściem) i maszyn wyrzutni.
- **Skala postaci**: podaj wysokość stojącej postaci w pikselach hali. Musi pasować i do mebli (ławka ~255 px),
  i do kuli (pasażer w kuli ma dziś 42×44 px). Jeśli postać nie mieści się w kuli w tej skali – powiększ kulę
  i podaj nową skalę albo zaproponuj inne rozwiązanie.
- **Warstwy przednie** (osobne PNG + linia podstawy y każdej): rzeczy, za którymi postać może przejść – lampy na
  słupkach, ławki, poręcz schodów, beczki/skrzynie, maszyny wyrzutni z obejmami. Program sortuje je z postaciami
  po linii podstawy.
- **Punkty**: wejście (dół schodów, tu staje bohater po zejściu i tu wychodzi na ulicę), przy każdej z 3 wyrzutni
  punkt podejścia przy bocznych schodkach (tam gracz kupuje bilet i wsiada), oraz obszar pustej posadzki po lewej
  (ok. x 120–880, y 300–700 – podaj dokładny wielokąt), gdzie program losowo stawia NPC.
- **Gazeciarz i straganiarz w skali hali**: stoją w losowym miejscu tego obszaru, gracz z nimi rozmawia
  (gazeta, zlecenia) i u straganiarza sprzedaje/kupuje. Gazeciarz: przód, bok, tył stojący + 2 klatki
  wołania. Straganiarz: wózek/stolik z daszkiem i towarem (owoce, gazety, bilety) jako osobna warstwa
  z linią podstawy, sprzedawca za nim, 2 klatki (macha / poprawia towar). Podstawa = środek dołu.
- **Mrugająca lampa**: jedna z lamp hali w 3 klatkach (świeci / przygasa / gaśnie) – z zamówienia 48-P001.

Postać gracza i mieszkańcy wejdą tam jako sprite'y z gry (ten sam bohater 3D/2D co na ulicy), więc ważna jest
tylko podana skala.

Kolejność: najpierw próbny „WHOOP!” (1 klatka) i mapa chodzenia + skala postaci, potem reszta.
