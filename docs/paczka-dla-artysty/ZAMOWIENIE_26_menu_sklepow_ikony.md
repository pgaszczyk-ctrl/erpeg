# 26 — Banery sklepów, poprawki ikon i koni

Decyzje właściciela z 8.10.2026. Materiały do nowego menu zakupów: kafelki przedmiotów, karta szczegółów i ilustracja w górnym pasku. To zamówienie grafik; przebudowa menu jest osobnym zadaniem.

## 1. Baner sklepu — dwie wersje

Zamawiamy **dokładnie dwa motywy, każdy w dwóch kompozycjach — łącznie cztery PNG**:

1. **Decathlon na drewnie**: czytelny napis „Decathlon” wyryty lub wypalony na drewnianym szyldzie. Faktura desek, delikatne mosiężne mocowania, ciepłe światło; napis wygląda jak część drewna. Bez współczesnej plastikowej tablicy. To próbka możliwego wyglądu sklepu partnerskiego, nie informacja o zawartej współpracy.
2. **Kupiec**: wyrazisty losowy kupiec w stylu obecnych mieszkańców gry, przy straganie lub z towarem w tle. Ciepła, nasycona paleta, pełniejsza sylwetka, krótka szyja; twarz czytelna także na telefonie. Bez rozbudowanych drobnych ozdób, które po zmniejszeniu znikną.

Każdy motyw przygotować na komputer i telefon według tabeli. Szyld może zastępować postać w górnym pasku sklepu; osobny portret nie jest potrzebny.

| Wersja | Plik PNG | Siatka rysowania | Eksport | Typowy rozmiar w menu |
|---|---|---|---|---|
| Komputer, szeroki pasek | 960 × 160 px | 240 × 40 px | ×4 | 480 × 80 px |
| Telefon, krótszy i wyższy pasek | 640 × 192 px | 160 × 48 px | ×4 | 320 × 96 px |

- Jeden piksel siatki = jednolity kwadrat 4 × 4 px w PNG, około 2 × 2 px w menu przy powyższym rozmiarze. Powiększenie nearest-neighbour, bez wygładzania i rozmywania.
- Wersja telefonu jest osobną kompozycją: szyld, twarz lub najważniejszy element zajmuje większą część obrazka. Nie obcinać mechanicznie szerokiego banera.
- Ważne elementy minimum 4 piksele siatki od krawędzi (16 px pliku). Tło może dochodzić do krawędzi.
- Drewno, mosiądz i pergamin pasujące do gry; ciemny obrys, czytelne cieniowanie i nasycenie zgodne z referencjami poniżej.
- Ilustracja bez zewnętrznej ramki, przycisków, cen i liczników — doda je gra. Napis/logo na szyldzie może być częścią ilustracji.
- Nazwy czterech plików: `kupiec_01_poziomy.png`, `kupiec_01_telefon.png`, `decathlon_poziomy.png`, `decathlon_telefon.png`.

## 2. Trzy zatwierdzone wzory dla poprawianych ikon

Dołączono **oryginalne PNG używane w grze**, po 64 × 64 px, bez ponownego przetwarzania:

| Wzór | Plik | Co z niego przejąć |
|---|---|---|
| Żelazny miecz | [zelazny.png](26_menu_sklepow/referencje/zelazny.png) | Czytelna sylwetka, ciemny obrys i cieniowanie stali |
| Szabla hartowana | [szabla_hartowana.png](26_menu_sklepow/referencje/szabla_hartowana.png) | Szczegóły rękojeści, odróżnienie materiałów i refleksy na ostrzu |
| Tarcza okuta | [tarcza_okuta.png](26_menu_sklepow/referencje/tarcza_okuta.png) | Faktura drewna, nity i metalowe okucie, ciepła paleta |

[Wspólny podgląd 64/128 px](26_menu_sklepow/referencje/podglad.html) pokazuje każdy wzór w rozmiarze kafelka oraz w powiększeniu ×2 bez wygładzania. Powiększenie jest podglądem, nie nową wersją grafiki.

## 3. Ikony do narysowania od nowa — 16 sztuk

Obecne pliki poniżej mają 16 × 16 px i po powiększeniu odstają od nowych ikon. Potrzebne nowe rysunki, a nie samo powiększenie starych.

Wszystkie 16 starych PNG znajduje się w `26_menu_sklepow/ikony_do_poprawy/` — to przykłady funkcji przedmiotów, nie wzory jakości.

| Priorytet / grupa | Nazwy plików do podmiany |
|---|---|
| Najpierw hełmy | `skorzany_helm.png`, `zelazny_helm.png` |
| Zbroje | `skorzana_zbroja.png`, `kolczuga.png` |
| Buty | `skorzane_buty.png`, `zelazne_buty.png` |
| Nakrycia głowy | `kapelusz.png`, `czapka_maga.png`, `korona.png` |
| Magia | `rozdzka.png`, `kula.png`, `ksiega.png` |
| Starsze miecze | `rycerski.png`, `swietlisty.png`, `gromowladny.png` |
| Talizman | `podkowa_szczescia.png` |

Format nowych ikon: **64 × 64 px, PNG z przezroczystym tłem; rysunek na siatce 32 × 32, eksport ×2 nearest-neighbour**. Jeden piksel rysowania = 2 × 2 px w pliku i w kafelku 64 × 64. Taka sama gęstość i charakter jak w dołączonych wzorach. Cały przedmiot musi mieścić się w kadrze, z niewielkim przezroczystym marginesem. Bez tła, napisów i ramki kafelka.

Nowe ikony i banery mają różne powiększenie eksportowe (×2 / ×4), lecz tę samą docelową wielkość rysowanego piksela w menu: około 2 px.

## 4. Dodatkowe braki i spójność

- Zwykły namiot i super namiot: brak osobnych ikon; jeśli będą zamawiane, format jak pozostałe ikony 64 × 64 px.
- Esencja dębu i esencja mrozu: osobne ikony potrzebne przy przebudowie menu alchemika.
- Ikonę roweru w plecaku warto ujednolicić z nowym welocypedem (`public/hud/welocyped_128.png`), zamiast dotychczasowego zwykłego roweru. To dopasowanie istniejącej grafiki, nie nowy projekt pojazdu.
- Większość nowych mieczy, tarcze, broń dystansowa, narzędzia, amunicja i surowce mogą pozostać. Po przygotowaniu grafik potrzebna próba w nowym menu, również na telefonie.

## 5. Konie i wozy — dopasować do świata gry

Obecne konie mają wielką, okrągłą głowę, przesadnie duże oko i ciężki obrys. Są pokazane głównie z boku, a świat oglądamy z góry pod skosem. Przy małych mieszkańcach wyglądają jak element z innej gry. Nie wystarczy zmiana kolorów ani powiększenie tego samego rysunku.

### Jak rysować

- Ten sam widok z góry pod skosem co woźnica, budynki i teren: widoczny grzbiet konia i górne powierzchnie wozu. Zachować kierunek w lewo oraz układ koń z przodu, wóz za nim.
- Koń baśniowy, zwarty i czytelny, ale bez ogromnego oka i okrągłego pyska jak w kreskówce. Zmniejszyć głowę względem tułowia, zaznaczyć szyję, łopatkę, zad oraz nogi. Nie rysować cienkich realistycznych nóg ani wielkiej „maskotkowej” głowy.
- Ciemny obrys około jednego piksela rysunku, bez dodatkowej grubej czarnej obwódki. Kilka wyraźnych tonów każdego materiału; bez fotograficznej sierści, gradientów i rozmycia.
- Drewno i mosiądz jak w tarczy z referencji, uprząż ze skóry, czytelne mocowania; steampunk w dodatkach, bez zasłaniania konia ornamentami. Światło z lewego górnego rogu, zgodne z otoczeniem.
- Dopasować wielkość piksela i kontrast do dołączonego woźnicy oraz ujęć z gry. Paleta świata jest pomocą, nie obowiązkiem automatycznego sprowadzenia każdego koloru do najbliższej próbki.
- Nie powiększać całego zaprzęgu. Ocenić projekt obok mieszkańca w rzeczywistym rozmiarze w grze, a nie tylko na dużym powiększeniu.

### Pliki i animacja

Obecny format odczytany z rzeczywistych PNG: **arkusz 254 × 102 px, dwie klatki po 127 × 102 px obok siebie**. Przezroczyste tło, rysowanie bez wygładzania, jeden piksel siatki = jeden piksel PNG. To odrębna siatka obiektów świata; nie stosować do niej eksportu ×4 z banerów.

- Na początek **jeden szary koń z pustym wozem, dwie klatki** (`woz_konny_pusty_szary.png`) oraz porównanie przy dołączonym woźnicy. Po ocenie tej próby właściciel zatwierdzi kierunek przed rysowaniem pozostałych odmian.
- Docelowo dziewięć arkuszy: 3 maści (`brazowy`, `czarny`, `szary`) × 3 ładunki (`pusty`, `beczki`, `worki`), czyli 18 klatek. Zachować istniejące nazwy `woz_konny_<ladunek>_<masc>.png`.
- Klatka 1: stanie. Klatka 2: subtelny ruch ogona, ucha lub jednej nogi; nie zmieniać wielkości głowy, oka, tułowia ani wozu. Gra przełącza klatki mniej więcej co 1,4–2,6 sekundy, to nie animacja jazdy.
- W obu klatkach takie samo położenie kół i kopyt, ten sam kadr i punkt oparcia. Obecny punkt zakotwiczenia jest w połowie szerokości i na 92% wysokości klatki (około x=63,5; y=93,8). Pozostawić dolny margines oraz punkty styku z ziemią zgodne z załączonym arkuszem. Nie dodawać ramki ani podpisów.
- Gra dopasowuje wysokość całej klatki do 50 jednostek mapy. Nie wypełniać nowego kadru większą sylwetką tylko dlatego, że jest wolne miejsce; najpierw porównanie w świecie.
- Jeżeli potrzebny będzie większy plik, ustalić to po próbce; nie powiększać automatycznie rysunku i nie przepuszczać gotowej grafiki przez kolejne filtry.

W `26_menu_sklepow/konie/obecne/` są wszystkie dziewięć obecnych arkuszy. W `konie/styl/` są woźnica, powiększenie woźnicy, dwa ujęcia zaprzęgów z gry, paleta świata i przykładowy bohater. Ujęcia dokumentują otoczenie i problem, a nie zatwierdzony wygląd konia.

## 6. Oczy bohatera i czarodzieja — uwaga po sprawdzeniu

Właściciel zgłosił zwężanie prawego oka postaci w kapeluszu i maga. **Nie traktować tego od razu jako błędu grafika.** Nowy bohater był zmniejszany z większych źródeł do klatek 64 × 64, co pogubiło część drobnych szczegółów; stary mag przechodzi dodatkowo przez filtr uśredniający sąsiednie piksele. Przesuwanie rysunku po ekranie przy ułamkowej skali też może zmieniać widoczną szerokość tak małego szczegółu.

- Przy ewentualnej korekcie trzymać szerokość i kształt obu oczu w kolejnych klatkach patrzących w tę samą stronę; głowa nie powinna „oddychać” podczas kroków. Perspektywa może uzasadniać mniejsze dalsze oko, ale nie jego przypadkowe zwężanie między klatkami.
- Sprawdzić twarz po zmniejszeniu do docelowej klatki 64 × 64 i w grze. Nie projektować czytelności oka wyłącznie na wielkim obrazie źródłowym.
- Dołączono źródłowe klatki bohatera, arkusz używany przez grę, oryginalny arkusz maga oraz porównanie z jego rzeczywistą teksturą po filtrze w `26_menu_sklepow/oczy/`. Materiały diagnostyczne nie są nowymi grafikami do podmiany.
- Naprawa sposobu wyświetlania należy do kodu gry; niniejsza paczka nie zamawia ponownego narysowania wszystkich 25 postaci ani zmiany ich strojów.

## 7. Kolejność oddawania

Najpierw skórzany hełm, jedna próba konia oraz cztery banery. Do oceny ikony dać podgląd 64 × 64, konia obok woźnicy, banerów w typowym rozmiarze z tabeli. Po zatwierdzeniu stylu dokończyć pozostałe 15 ikon i osiem wariantów zaprzęgu. Dodatkowe braki z punktu 4 są opisane do osobnego ustalenia zakresu.

Oddać przezroczyste PNG tam, gdzie wymagane, oraz pliki źródłowe. Bez cen i przycisków w obrazach. Nie dostarczać jedynie JPEG ani wygładzonego skalowania starszych rysunków. Wszystkie materiały i to zamówienie są w jednej paczce; nie wymagają dostępu do repozytorium.
