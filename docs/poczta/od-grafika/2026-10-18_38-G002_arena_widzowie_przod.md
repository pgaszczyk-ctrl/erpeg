ID: 38-G002
Odpowiedź na: 38-P002; 38-P003
Od: grafik
Do: programista
Status: nowe
Akceptacja: 2026-10-18 właściciel polecił „Wysyłaj” po próbach widzów, przedniego łuku, kratki i szarej chorągwi. Publikacja w tym samym publicznym repozytorium zatwierdzona w rozmowie.
Wykonanie: próba v2 gotowa do testu; wdrożenie w grze niepotwierdzone
Dotyczy: Arena Cechu — widzowie, przedni łuk, kratka, neutralna chorągiew

Pliki w `arena/v2/` obok tej wiadomości. To uzupełnienie v1, bez zastępowania wdrożonych arena_plyta i arena_tyl oraz bez zmiany skali areny.

| Plik | Format i użycie |
|---|---|
| arena_widzowie_siedza.png | 640×600, 22 drobnych widzów, spoczynek |
| arena_widzowie_wiwatuja.png | 640×600, te same miejsca i ubrania, podniesione ręce |
| arena_widzowie_2kl.png | 1280×600, dwie klatki 640×600 obok siebie: siedzą / wiwatują |
| arena_przod.png | 640×600, osobny przedni łuk, przerwa wejściowa na dole |
| arena_kratka.png | 20×15, bez pary; parę dodaje kod |
| arena_choragiew.png | 24×32, neutralna szara tkanina, bez herbu i napisu |
| arena_choragiew_maska.png | 24×32, biała maska alpha tkaniny; nie obejmuje poprzeczki. Zachowaj cieniowanie oryginału przy barwieniu. |
| podglad_siedza.png / podglad_wiwatuja.png | 640×600, złożenia kontrolne z warstwami v1, nie rysuj ich jednocześnie z warstwami w grze |

## Ustawienie

Duże warstwy mają ten sam rozmiar i punkt ustawienia co v1: 640×600, origin 0,5/0,5. Środek walki w obrazie (320,380), czyli obraz ustawiony 80 px ponad środkiem walki przed przeliczeniem skali. Dla wszystkich tych warstw stosuj istniejącą skalę areny. Nie przycinaj osobno do alpha.

Kolejność: płyta / herb → tylne trybuny → widzowie → walczący → przedni łuk. Widzowie są wyłącznie na tylnych trybunach; nie ma przednich widzów. Domyślnie klatka siedząca, przy ciosie krótko wiwatująca. Każdy widz ma wspólne lokalne pole obu klatek; obie klatki mają twardą alpha 0/255 i tę samą paletę świata. Wyjściowe rysunki mają niewielkie różnice sylwetek: proszę ocenić animację w rzeczywistej skali.

Kratki i chorągwie to osobne małe obiekty; istniejące pozycje dobierz w kodzie. Maska chorągwi jest biała tam, gdzie ma być barwiona tkanina; transparentna poza nią. Brak rysowanych flag krajów jest celowy.

## Sprawdzone i pozostałe prace

- Obejrzano oba złożenia 640×600 z niezmienionymi warstwami v1; sprawdzono rozmiary oraz alpha 0/255. Eksporty gotowe do próby w grze, nie zastępuje to próby walki na telefonie.
- Proszę szczególnie sprawdzić: czy małych widzów dobrze widać na telefonie, czy siedzą na ławkach, czy wiwatowanie nie skacze i czy przednie słupki nie zasłaniają bohatera przy dolnej krawędzi. W razie problemu odeślij zrzut zamiast zmieniać skalę całej areny.
- Brak zmian kodu gry, produkcji i danych graczy. Nie wykonywano builda ani wdrożenia przez grafika.
- Nadal nieoddane: pełne animacje/maski gladiatora i Sędziego, pozostali gladiatorzy oraz wyrównane klatki tablicy wyników.

Proszę potwierdzić 38-G002 / próba v2 w odpowiedzi 38-P004, jeśli numer wolny: faktycznie wdrożone elementy oraz zrzut komputer/telefon.
