ID: 36-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 12.10.2026: „Podświetlenie szyldu jest słabe. Przerobimy to kompletnie może u grafika?”
Wykonanie: –
Dotyczy: zamówienie 36 – światło przy szyldach miejsc (sklep, szkoła, świątynia, urząd, szpital, policja, biblioteka, hotel, bank, alchemik, sklep sportowy, kemping)

# 36-P001 — światło szyldu, które przyciąga wzrok

## Po co
Gracze mówią, że szyldy miejsc słabo widać. Złota okrągła poświata za szyldem wyglądała nienaturalnie, a moja próba (snop światła rysowany kodem, zdjęcie `36_swiatlo_szyldu/proba_programisty_dzien_noc.png`) jest za słaba. Szyld ma z daleka mówić spacerowiczowi: **tu coś jest, podejdź**. Stan obecny na produkcji: `36_swiatlo_szyldu/obecnie_produkcja_dzien_noc.png`.

## Co mamy w grze
- Żeliwny słup z lampą gazową na górze i tablicą miejsca (`public/swiat/szyldy/slup_tablica.png`, `slup_ramie.png`, tablice `tablica_<rodzaj>.png` 22×20). Słup stoi na chodniku przy drzwiach. Dwie odmiany: tablica pod poprzeczką albo tablica na łańcuchach z ramienia (lekko się kołysze).
- Gra rysuje to w skali 1/2 (2 piksele obrazka = 1 piksel mapy), postać bohatera ma ~13 px mapy wysokości – słup jest od niej nieco wyższy.

## Zamówienie
1. **Światło lampy na słupie** – osobna warstwa (nakładana trybem „dodaj” / ADD, więc tło czarne albo przezroczyste – napisz które):
   - snop z lampy w dół na chodnik, kończący się plamą światła na ziemi (owal), ciepły gazowy kolor, miękkie brzegi, ale **wyraźny** – ma przyciągać wzrok także w dzień;
   - **4 klatki**: 1 = świeci równo, 2 = lekko przygaszona, 3 = prawie zgaszona, 4 = rozbłysk (mocniej niż zwykle). Z nich zrobię mruganie „zwarcia/przeciążenia sieci” co kilka–kilkanaście sekund.
   - Proporcje: lampa w punkcie (środek góry), plama na ziemi ~2,5–3 szerokości słupa; podaj w pliku, gdzie jest lampa i gdzie stopa słupa.
2. **Wariant dzienny** tego samego (albo powiedz, że jedna wersja wystarczy, a gra tylko ją przyciemni w dzień).
3. **Podświetlona tablica**: klatka „nocna” każdej z 12 tablic (lekko rozjaśnione brzegi od lampy, odblask na mosiądzu) – albo jedna nakładka światła na tablicę, wspólna dla wszystkich.
4. Opcjonalnie: **mała iskra / trzask** przy lampie (2–3 klatki) na moment mrugnięcia.

## Format
- PNG, przezroczyste tło (albo czarne dla warstw ADD – napisz), bez wygładzania krawędzi postaci, styl jak słupy z paczki szyldów.
- Najpierw **próba: 1 klatka snopu + 1 tablica nocą** do akceptacji właściciela, potem reszta.

## Co dalej po mojej stronie
Po akceptacji podepnę to w miejsce obecnej próby (na serwerze testowym jest snop z kodu, na produkcji stara poświata), z mruganiem co 7–18 s i silniejszym światłem nocą.
