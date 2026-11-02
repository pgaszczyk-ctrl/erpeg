# Modułowe domy fantasy/steampunk — propozycja paczki dla grafika

Cel: ciepły, ręcznie rysowany domek w świecie obecnych drzew, bruku i postaci. Obecna bryła to konstrukcja do ubrania, nie docelowa elewacja. [Aktualny kadr z gry](house-reference.png) jest referencją skali i proporcji. Geometria, rzuty, dachy, liczba kondygnacji i rozmieszczenie wynikają z generatora OSM.

To specyfikacja przygotowana dla właściciela, a nie wysłane zlecenie ani potwierdzenie wykonania grafiki.

## Najpierw jeden dom wzorcowy

Na aktualnym kadrze zaprojektować jeden gotowy ciepły domek: jasny tynk albo cegła, wyraźna stolarka, mosiężne okucia, czytelne drzwi, gzyms/okap, jedna instalacja parowa i charakterystyczny komin. Pokazać też parterowy i dwukondygnacyjny wariant tego samego zestawu. Po wyborze wyglądu rozciąć go na poniższe moduły. Najważniejszy jest dom jako całość; dodanie losowych kół zębatych do pustej szarej ściany nie wystarczy.

## Co narysować

Wymiary są w natywnych pikselach tekstur budynków, przed powiększeniem gry. Obecna postać ma w tej siatce około 21 × 27 px; otwór drzwiowy około 24 × 30 px. Ramki mogą wystawać poza otwór. Nie zmieniać rozmiaru postaci.

| Zestaw | Pierwsza paczka | Format/rozmiar orientacyjny |
|---|---|---|
| Materiały ścian | ciepły jasny tynk, cegła, deski; 2 spokojne warianty każdego | 32 × 32, bezszwowe, bez okien i drzwi |
| Dachy | ceramiczna dachówka, łupek/gont, miedziana/blaszana połać | 32 × 32, powtarzalne; rzędy czytelne co 5–8 px |
| Wejścia | drewniane, sklepowe, metalowe z okuciami | otwór 24 × 30, moduł z ramą około 32 × 40 |
| Okna | prostokątne z podziałem, łukowe, okrągły iluminator | szyba około 16 × 13; moduł 24 × 24 |
| Konstrukcja i wykończenie | cokół, gzyms, okap, narożnik, belki, listwy z nitami | paski 32 × 8 / 8 × 32; narożniki i zakończenia osobno |
| Instalacja fasady | rura prosta, kolanko, trójnik, obejma, zawór, manometr, kratka | rury 4/8 px średnicy; części 8–32 px, kotwica połączenia |
| Akcenty domu | szyld, skrzynka, lampa przy wejściu, osłona/daszek, niewielki balkon | 16–48 px; lampa jest nowym elementem fasady, istniejących latarni ulicznych nie zmieniać |
| Urządzenia dachowe | kocioł, komin, Tesla; później zbiornik i wieża wodna | kompatybilne klatki 48 × 64, kotwica (24,54) |

Pierwsza paczka wystarczy dla trzech rodzin: ciepły dom z drewnianym ryglem, mały dom miejski oraz ceglana hala/warsztat. Więcej odmian regionalnych korzysta później z tej samej techniki i innych zestawów materiałów. Nie potrzeba osobnego kompletnego sprite'a dla każdego obrysu OSM.

## Sposób wykorzystania

- Generator buduje bryłę, prosty dach, ściany i szczyty oraz wskazuje otwory i punkty mocowania. Zachowuje drzwi wielkości postaci i ustalone 1/2/3 kondygnacje.
- Materiały i moduły okien/drzwi są nakładane na rzeczywiste płaszczyzny ścian, więc podlegają temu samemu rzutowi i zasłanianiu. Grafiki fasadowe dostarczyć frontalnie, bez namalowanej perspektywy czy kompletnego rzutu kamery.
- Paski mają środek powtarzalny i osobne zakończenia/narożniki, aby dopasować je do szerokości domu. Otwory pozostają wolne od belek i rur; instalacje łączą się w sensowną całość.
- Elementy dachowe i wolnostojące urządzenia są osobnymi sprite'ami z kotwicą i wybranymi widokami. Dla szerszego zakresu obrotów potrzebują 4 kierunków; nie odbijać lustrzanie gotowego światłocienia.
- Gzyms, cegła, stolarka i niewielka instalacja stanowią normalną fasadę. Duże urządzenia dachowe są rzadszym akcentem (poza przemysłem do 1 na 3 budynki).
- Shader wybiera trzy odcienie z palety. Integracja atlasu ma mapować kolory na indeksy materiałów, bez mnożenia RGB i tworzenia niekontrolowanych nowych barw. Globalne światło i cień bryły liczy generator; na kaflach nie malować dużego cienia padającego na ziemię.

## Styl i pliki

Światło z NW, kontur 1 px w skali tekstury, trzy wyraźne tony materiału, bez antyaliasingu, gradientów, połysku i neonowego glow. Duże spokojne płaszczyzny, mało punktowego szumu. Szyby ciemne z jednym jasnym pikselem. Mosiądz, drewno, ciepła cegła i ciemne żelazo mają być czytelne także w małym powiększeniu.

Obowiązuje [paleta 16 kolorów](../../../src/architecture/palette.json), [pasek palety](../../../public/architecture/palette.png). Przykładowe rodziny: mosiądz #6b4a22 / #9a6420 / #c8963e; jasny tynk #948d80 / #bab3a2 / #ece6d6; żelazo #1e1a24 / #3a3540 / #67615b. Cegła może korzystać z #b2453a. Nie dodawać nowych turkusów ani jaskrawych dachów.

Dostarczyć źródło Aseprite (warstwy materiał/okucia/detal) i PNG bez strat, alfa wyłącznie 0/255. Dla atlasu 2 px przezroczystego odstępu między modułami; kafle powtarzalne również osobno, bez tego odstępu. Parametry w JSON: id, rect [x,y,w,h], pivot [x,y], slot (wall/window/door/eave/ridge/chimney), repeat (none/x/xy), material, opcjonalnie animation {fps,frames}. Średnice rur i końcówki muszą do siebie pasować.

Para i dym: 6 klatek, 6 klatek/s, pętla; iskra Tesli: 4–6 klatek, pętla. Efekt rysowany oddzielnie od urządzenia, aby go nie skalować razem ze ścianą. Istniejące drzewa, trawa, woda, bruk, pobocza, postacie i rury przy drogach pozostają bez zmian.

## Stan integracji

Aktualnie działa bryła, proceduralny detal fasady oraz zastępczy atlas dekoracji. Nakładanie ręcznie rysowanych modułów fasad i materiałów wymaga osobnego kroku w shaderze/generatorze po otrzymaniu grafiki; nie jest już gotową funkcją tylko dlatego, że istnieje ten dokument. Obecna poprawka dotyczy poprawnego zasłaniania domów i widoczności postaci.
