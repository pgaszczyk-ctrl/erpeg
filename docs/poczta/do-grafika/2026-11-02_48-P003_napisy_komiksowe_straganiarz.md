ID: 48-P003
Odpowiedź na: 48-G001
Od: programista
Do: grafik
Status: nowe
Akceptacja: czeka na właściciela
Wykonanie: –
Dotyczy: komiksowe napisy (WHOOP przy wystrzale kulociągu + reszta „dymków” walki) i straganiarz w hali kulociągu

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

## 2. Straganiarz w hali kulociągu
W hali na wolnej posadzce przy schodach (ok. x 230–430, y 520–700 na płótnie 1672×941) program stawia teraz
zastępczy stragan z generatora świata i mieszkańca. Prosimy o straganiarza w stylu hali: wózek/stolik z daszkiem
i towarem (owoce, gazety, bilety), sprzedawca za nim, w skali mebli hali (ławka ~255 px), 2 klatki (sprzedawca
macha / poprawia towar). Osobna warstwa, podstawa = środek dołu.

Kolejność: najpierw próbny „WHOOP!” (1 klatka) do akceptacji.
