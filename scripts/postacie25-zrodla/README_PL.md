# Exp-lore — 25 postaci i pojazdy

Paczka graficzna dla programisty. Status: materiał do integracji, nie zweryfikowane animacje produkcyjne.

## Zawartość
- `arkusze/`: dwa arkusze po 10 postaci oraz nowy arkusz 5 postaci.
- `postacie/`: 275 wyciętych komórek PNG RGBA (25 × 11), bez skalowania grafiki, na wspólnej przezroczystej planszy 160 × 208 px. To rozmiar eksportowy, nie natywna siatka pixel art.
- `pojazdy/hulajnoga_parowa_64.png`: oryginalna hulajnoga z referencji, 64 × 64 px.
- `pojazdy/welocyped_parowy_zrodlo.png`: nowy welocyped, duże przednie koło po prawej, przezroczysty PNG w rozdzielczości źródłowej. Dopasuj skalę do postaci metodą nearest-neighbor.
- `manifest.json`: mapowanie postaci, klatek i prostokątów w źródłowych arkuszach.

## Kolejność kolumn
1–3: dół, krok 1 / neutralna / krok 2.
4–6: góra, krok 1 / neutralna / krok 2.
7–9: prawo, krok 1 / neutralna / krok 2.
10: poza na hulajnogę.
11: zamierzona poza na welocyped.
Lewo można uzyskać odbiciem prawego boku; odbicie odwróci także asymetryczne elementy stroju.

## Ważne przed integracją
Klatki z generowanego arkusza nie zawsze pokazują wyraźny ruch. Należy ocenić sekwencje w animacji i poprawić nogi/ręce; nazwy opisują zamierzone pozy, nie potwierdzoną poprawność ruchu.
W zestawie 01 kolumny 10 i 11 zawierają postać wraz z hulajnogą; kolumna 11 nie przedstawia poprawnej jazdy na welocypedzie. Zachowano oryginalną grafikę i oznaczono tę różnicę w manifest.json.
W zestawach 02 i 03 pozy do jazdy są bez pojazdów. Dokładne punkty dłoni, stóp i siodła trzeba ustalić podczas składania. Nie dostarczono animacji kół ani przetestowanych kotwic.
Komórki wycięto z arkuszy i uzupełniono przezroczystym marginesem; wspólna plansza nie oznacza wyrównania punktów stóp. Prostokąty źródłowe są zapisane w manifest.json.

## Kolory i modułowość
Stroje mają wyraźne regiony kolorów, ale PNG nie są paletowo indeksowane i nie mają masek. Bezpośrednia zamiana jednego RGB może nie zmienić całego materiału. Przygotuj osobne maski ubrania, włosów i skóry lub ujednolić paletę w edytorze pixel art przed randomizacją.
Postacie są kompletnymi sprite'ami z głową; głowy i ciała nie są oddzielnymi warstwami.
Wyświetlanie: filtrowanie nearest-neighbor / CSS image-rendering: pixelated. Nie używać wygładzania przy powiększaniu.
