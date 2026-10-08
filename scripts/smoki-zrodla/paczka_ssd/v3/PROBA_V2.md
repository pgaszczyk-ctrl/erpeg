# Zamówienie 23 — próba leśnego i trującego

Po 2 klatki `stoi_bok_1` i `stoi_bok_2` na gatunek. To próba do oceny wyglądu; pełne 39 klatek na gatunek powstaje po akceptacji zgodnie z zamówieniem.

## Import

- Importuj wyłącznie 4 pliki `smok_*_stoi_bok_*.png` z katalogów gatunków.
- Rozmiar 220 × 200 px, bez skalowania podczas importu. Filtrowanie nearest neighbour.
- Pivot kotwicy w grze: [110, 170]. Najniższe piksele łap są na y=170. Sylwetka ma około 160 px długości; głowa skierowana w lewo, perspektywa z widoczną głębią tułowia. Leśny wyprostowany; trujący przy ziemi.
- Tło dokładnie #FF00FF: usuń przez color key. Bez miękkiego wygładzania i różowej obwódki.
- Nie ma namalowanego cienia pod smokiem; zachowaj cień dodawany przez program.
- Jedna wspólna paleta na 2 klatki każdego gatunku, maksymalnie 16 kolorów razem z tłem.
- Podglądy i pliki palety nie są klatkami do importu. GIF-y mają po 2 klatki i czyszczą poprzednią klatkę.

## Wygląd

Leśny: długoszyi, wysoki, z dużymi skrzydłami, zielony z ochrowymi liściastymi akcentami. Trujący: niski, wydłużony, wężowy, z długim ogonem, fioletowy z chłodnymi błonami i workami jadowymi. Oba mają komiksową kreskę, żywe kolory, duże płaszczyzny i światło z lewej góry. Wzorem kreski i charakteru jest lodowy/górski: lekko groźny i majestatyczny. To dwa różne typy anatomii, bez cukierkowych twarzy i pulchności.

Rysunki wykonano generatorem grafiki na podstawie lodowego/górskiego. Eksport techniczny ustala wspólną skalę, dokładną paletę i osobne płótna; nie tworzy anatomii skryptem.

## Kontrola

Sprawdzone: rozmiary, palety, marginesy, pojedyncza spójna sylwetka bez obcych fragmentów, różne klatki oddechu i zgodność GIF-ów z PNG. Wyniki w WERYFIKACJA.json. Test w grze pozostaje po stronie integracji.

W pełnym komplecie trujący ma `dmuch` zamiast `pluj`: po 3 klatki na kierunek.
