# Targi Lublin i uproszczony smok — podmiana grafiki

## 1. Targi Lublin

`budynek/targi_lublin.png` to przezroczysty PNG 854×617. Obrys alfa jest dokładnie maską dostarczonego szkieletu. Budynek został przerysowany generatorem, przeskalowany nearest-neighbor i dopasowany do tej maski. Dachy i ściany mają artystyczną interpretację; geometria wewnętrznych podziałów nie jest modelem pomiarowym.

Zastąpić proceduralne hale A/B/C tym jednym obrazem. Nie rysować pod nim drugi raz starych dachów ani ścian. Pozostawić dotychczasową geometrię kolizji i sortowania obiektu.

Położenie z oryginalnego `budynek/targi_lublin.json`:

- lewy górny róg w pikselach świata: **[29236, 25909]**;
- lewy górny róg w punktach mapy: **[14618, 12954.5]**;
- rozmiar obrazu 1×: **854×617**.

Wybrać jeden układ współrzędnych zgodny z istniejącym rendererem. Nie używać tych dwóch pozycji jednocześnie i nie mnożyć ponownie obrazu przez 4. Wyłączyć wygładzanie tekstur.

### Warstwy na dachu

Wszystkie poniższe pozycje są przesunięciami lewego górnego rogu warstwy względem lewego górnego rogu budynku w pikselach obrazu 1×. Rysować je po budynku w tym samym układzie transformacji. Nie traktować ich jako nowych obiektów kolizji.

| Warstwa | Plik | Pozycja x,y | Rozmiar |
| --- | --- | --- | --- |
| Rzeźba smoka na złotej D20 | `rzezba_smok_d20.png` | 319,203 | 108×136 |
| StarFest — symbol, bez napisu | `obrot_starfest_12klatek.png` | 152,70 | klatka 64×64 |
| Targi Lublin — symbol, bez napisu | `obrot_targi_12klatek.png` | 663,64 | klatka 64×64 |
| Złota D20 | `obrot_d20_12klatek.png` | 433,328 | klatka 64×64 |

Arkusze obrotu są poziome, **768×64**, po **12 klatek 64×64**, bez odstępów. Odczytać klatkę z prostokąta `[numer*64, 0, 64, 64]`. Odtwarzać w pętli, 8 klatek/s, z przesunięciami fazy 0/4/8. Szczegóły są też w `warstwy.json`.

To animacja obrotu płaskich, dwustronnych szyldów wokół pionowej osi, wykonana przez zmianę szerokości i pokazanie odwrotnej strony symbolu. Nie jest to pełny obrót przestrzennej kostki 3D. Rzeźba smoka pozostaje nieruchoma. `znak_*.png` są nieruchomymi wariantami. Podgląd PNG/GIF nie jest zasobem do podmiany: ma już złożone warstwy i magentę.

## 2. Smok górski

Podmienić tylko pliki o identycznych nazwach:

- `smok_gorski/smok_gorski_stoi_bok_1.png`;
- `smok_gorski/smok_gorski_stoi_przod_1.png`.

Obie klatki mają **220×200**, 15 wspólnych kolorów smoka i magentę **#FF00FF**. Usunąć wyłącznie dokładną magentę przy imporcie lub w dotychczasowym mechanizmie chroma key. Przednia klatka ma zaakceptowany lekki skos, przesunięte łapy i skrzydła w różnej perspektywie. Nie obracać jej dodatkowo programowo.

Te klatki są już w docelowym rozmiarze. Nie przepuszczać ich przez poprzednie zmniejszenie klatek 512 px. Jeżeli renderer wyznacza skalę lub punkt zaczepienia z wymiarów starego pliku, ustawić wyjątek dla tych dwóch klatek. Porównać punkt zaczepienia stóp z obecnym rendererem — kod gry nie był dołączony i nie mogłem zweryfikować jego pivotu.

**Zakres tej paczki: dwie zaakceptowane klatki próbne, nie komplet uproszczonych animacji.** Nie nadpisywać nimi chodu, gryzienia, startu, lotu, lądowania, śmierci ani widoku z tyłu. Pozostałe klatki i efekty uderzeń z `koziol_i_smok_gorski` pozostają aktualne. Mieszanie uproszczonych klatek ze starymi może powodować zmianę stylu przy przejściu do ruchu; pełna zamiana wymaga przerysowania reszty animacji.

## Kontrola po integracji

Sprawdzić dopasowanie narożników Targów do mapy i brak podwójnych ścian, stałą pozycję rzeźby oraz obrót szyldów bez ruchu podstaw. Dla smoka sprawdzić skalę około 160 px długości z boku, chroma key, punkt zaczepienia i przejście do istniejącego chodu. Kamera/zoom mają skalować wszystkie warstwy wspólnie z wyłączonym wygładzaniem.
