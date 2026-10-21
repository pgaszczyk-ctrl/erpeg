# Exp-lore — grafika budynków do próbki bloczkowej

Stan obecny: 3 kategorie logiczne (dom, usługi, blok mieszkalny), ale jedna
proceduralna bryła ze spadzistym dachem, 4 rozmiary podstawy i 10 kolorów.
Próbka zawiera 668 domów, 16 usług i 6 bloków. Nie są to 690 różnych grafik.

## Proponowany pierwszy zestaw — 6 brył

1. Mały dom, podstawa 1×1.
2. Większy dom, podstawa 2×2.
3. Segment szeregu/kamienicy, podstawa 1×2 (oraz 2×1).
4. Budynek wielorodzinny, podstawa 2×2.
5. Sklep / usługi, podstawa 2×1 (oraz 1×2).
6. Warsztat / magazyn, podstawa 2×2.

To propozycja zestawu do następnego etapu, nie sześć już wdrożonych kategorii.
Najpierw warto przygotować jeden większy dom i jeden blok do sprawdzenia skali.
Nie trzeba od razu rysować wszystkich kombinacji i palet.

## Ustalone parametry obrazu

- Kamera stała, rzut 2:1: pozioma przekątna rombu dwa razy dłuższa od pionowej.
- Wzorcowa komórka: romb 128×64 px; dwa wektory podstawy (64,32) i (-64,32).
- 1 komórka = 1 m świata gry = 10 m terenu rzeczywistego. To skala umowna gry,
  nie prośba o realistyczny dom o wielkości 20 metrów na ekranie.
- Podstawa 1×1: maksymalny romb 128×64; 2×2: 256×128;
  2×1 / 1×2: 192×96. Prostokąty mają różne położenia narożników, nie wystarczy
  rozciągnąć kwadratowego domu.
- PNG z przezroczystym tłem, bez trawy i drogi. Własny cień najlepiej osobno.
- Budynek stoi wewnątrz obszaru podstawy z odstępem 0,15 komórki od każdej
  krawędzi; nie powiększać parteru poza ten obszar. Dach może zasłaniać tło
  wyżej, ale nie może udawać zajętości sąsiedniej działki na ziemi.
- Zapisać punkt zaczepienia na ziemi: najbliższy kamerze narożnik prostokąta
  zajętości (punkt x=max, y=max w świecie), z osobnymi współrzędnymi anchor_px
  w obrazie. Nie używać do tego dolnej krawędzi płótna lub cienia.
- Pozycja, kolizje i przypisanie źródeł pozostają po stronie generatora.
  Podmieniamy wyłącznie sposób rysowania. Nie rozciągać sprite'a do dowolnej
  działki: dobieramy wariant o odpowiedniej podstawie.
- Rozpoznawalne drzwi, okna, bryła, dach; wspólny kierunek światła i gęstość
  pikseli. Fantasy/steampunk jako delikatny dodatek, nie nowe losowe budowle.
- Na początek jedna paleta. Kolejne kolory można dodać przez maski materiałów
  (ściana, dach, drewno, metal); nie trzeba eksportować 10 pełnych kopii.
- Dwa ustawienia frontu są przydatne na start. Docelowo można dostarczyć cztery
  warianty 0/90/180/270 przy niezmienionej kamerze. Nie obracamy gotowego PNG
  w płaszczyźnie ekranu — narożniki i fasady muszą być narysowane ponownie.

## Przykładowy opis pliku

```json
{
  "id": "house-large",
  "file": "house-large-0.png",
  "footprint_cells": [2, 2],
  "orientation": 0,
  "cell_diamond_px": [128, 64],
  "anchor_px": [256, 384],
  "canvas_px": [512, 512],
  "height_game_m": 1.4
}
```

anchor_px i rozmiar płótna są przykładem; grafik ma podać rzeczywiste wartości.
Do pierwszej próbki dołączyć przezroczystą nakładkę obrysu podstawy i punktu
zaczepienia. Programista sprawdzi grafikę w miejscu obecnego modułu i zachowa
jego zajętość. Import sprite'ów i manifestu nie jest jeszcze zaimplementowany;
obecny renderer rysuje bryłę kodem. Najpierw sprawdzamy pierwszą dostarczoną
bryłę, potem wdrażamy podmianę i rozszerzamy bibliotekę.
