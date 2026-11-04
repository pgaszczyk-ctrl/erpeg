# Exp-lore — wodniki, ekwipunek i sprzedaż

## Zawartość
- `potwory/`: szlam wodny64×64 i herszt wodników80×80, pojedyncze statyczne sprite'y.
- `ikony/`: cztery ikony64×64, eksport siatki32×32 ×2.
- `audio/ka_ching.wav`: własny syntetyczny efekt kasy,0,72sekundy, mono PCM16bit44,1kHz, bez cudzych sampli.
- `PROMPT_DLA_PROGRAMISTY.md`: pełne polecenie integracji grafik i efektu sprzedaży.
- `demo_sprzedazy.html`: autonomiczny pokaz napisu SPRZEDANE, powiększenia salda, licznika i dźwięku; nie zmienia danych gry.
- `manifest.json`: rozmiary i punkty osadzenia potworów.
- `zrodla/`: duże oryginały generacji i płaskie źródłowe PNG na siatkach rysowania.
- `podglady/`: przegląd i powiększenia×4 nearest-neighbor.

Wodniki zaprojektowano według stylu mieszkańców z paczki26, bez referencji obecnego sprite'a zwykłego wodnika. Herszt jest nową propozycją wyglądu. Szlam jest jednym powtarzalnym wariantem, nie arkuszem animacji. Twarze są proste i nie przechodzą przez filtr uśredniający.

Ikona czapki Robin Hooda ma oddzielną nazwę; programista powinien sprawdzić mapowanie starego kapelusz.png. Grafiki nie są jeszcze podłączone do repozytorium gry. Demo pokazuje fikcyjną kwotę413monet. Dźwięk jest WAV w paczce; lokalny podgląd HTML najlepiej uruchomić z serwera projektu.

Eksporty mają twardą przezroczystość0/255 i pełne bloki2×2. Światło z lewej góry, ograniczona paleta, bez tła i ramki. Źródła są płaskimi PNG, nie plikami wielowarstwowymi.

## Dodatkowo: latarnie i parasole
Dwa nowe parasole64×64 w parasole/, proponowane kotwice i podgląd nakładania. PROMPT_LATARNIE_PARASOLE.md zawiera warunek noc LUB deszcz, podświetlenie szkła i terenu oraz podłączenie parasoli. Oświetlenie jest zadaniem kodu gry, bez nowego sprite'a latarni.
