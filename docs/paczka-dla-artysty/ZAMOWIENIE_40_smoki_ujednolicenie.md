ID: 40-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: zlecone przez właściciela (18.10.2026: „stare są bardzo różne i potrzebujemy je ujednolicić”)
Wykonanie: –
Dotyczy: wszystkie smoki – jeden wspólny styl

# Zamówienie 40: smoki w jednym stylu

## Dlaczego

Każdy z naszych 5 smoków powstał w innej paczce i każdy wygląda inaczej.
Obok siebie nie wyglądają jak jeden gatunek z jednej gry.
Zobacz `40_smoki_ujednolicenie/porownanie_stoi_bok_x2.png` i `porownanie_stoi_przod_x2.png`
(stoją tam w skali gry, a po prawej, dla porównania, stoi bohater).

Co dziś się nie zgadza:

| Smok | Skąd jest | Co jest nie tak |
|---|---|---|
| górski (niebieski) | zam. 15/20 | ma inną komórkę (216×194), stopy wypadają w innym miejscu, a kolorów jest 194 (reszta ma do 16). Wszystkie 41 klatek to w grze tylko 2 obrazki (stoi z boku i stoi z przodu), więc nie widać chodu, ugryzienia ani lotu. Tyłu nie ma wcale. |
| ognisty (czerwony) | „smoki_chochlik_v3” | pełny komplet 39 klatek. Wzór stylu razem z kwasowym. |
| kwasowy (zielono-fioletowy) | „smoki_chochlik_v3” | pełny komplet 39 klatek. **Wzór stylu** (właściciel: „o taki styl chodzi”). |
| leśny (morski) | próba 23 v2 | są tylko 2 próbne klatki z boku. Jest smukły, „realistyczny” i stoi wyżej na nogach, więc nie pasuje do pulchnego kwasowego. Nie ma przodu ani tyłu. |
| trujący (fioletowy) | próba 23 v2 | też tylko 2 klatki z boku. Jest płaski i długi, jak jaszczurka. Nie ma przodu ani tyłu. |

Oprócz tego „Cień smoka” z głównej historii (boss u Maga Albrechta) nie ma
żadnego rysunku. Gra rysuje go sama, w kodzie, jako maleńkiego zielonego
smoka (`obecny_zastepczy_z_kodu_x4.png`).

## Wspólny styl (dla wszystkich)

- Wzorem jest **kwasowy** (i ognisty z tej samej paczki): pulchna, bajkowa
  sylwetka, duża głowa, krótkie mocne łapy, okrągły tułów, rzut z góry pod
  kątem ok. 60° jak cały świat gry. To ma być sympatyczny przeciwnik dla
  dzieci, a nie potwór z horroru.
- Duże, gładkie płaszczyzny po 3 odcienie (światło, ton, cień), bez drobnych łusek i szumu.
- Dwie barwy na smoka: ciało w jednym kolorze, kolce/kryza/błony skrzydeł w drugim, dopełniającym. Kolory jasne i nasycone.
- Obrys 1 px #1e1a24, najwyżej 16 kolorów na smoka, światło z lewej-góry.
- **Wszystkie smoki tej samej wielkości i w tej samej pozie bazowej.** Różnią
  się kolorem, kształtem głowy, rogów, kolców i skrzydeł oraz jednym znakiem
  rozpoznawczym (jak niżej). Sylwetka tułowia i łap może być wspólna.
- Komórka **220 × 200**, stopy w **[110, 170]**, jedno tło (magenta #ff00ff albo przezroczyste), bez cienia pod smokiem (gra rysuje go sama).

## Gatunki (propozycje do Twojej oceny)

| Smok | Barwy | Znak rozpoznawczy | Atak specjalny (pozy) |
|---|---|---|---|
| leśny | jasna zieleń liści + mchowe złoto | kryza i skrzydła jak liście/paprocie, grzybki lub kwiatki na grzbiecie | brak (tylko ugryzienie) |
| kwasowy | limonka + fiolet | zostaje jak jest (wzór) | `pluj` |
| trujący | śliwkowy fiolet + świecąca limonka/turkus | worki z jadem, bańki na grzbiecie | `dmuch` (wydech chmury) |
| ognisty | czerwień + grafit | zostaje jak jest (wzór) | `ziej` |
| górski | szaroniebieski + śnieżna biel | skalne płyty i szron na grzbiecie, największe skrzydła | `start`, `lot_gora`, `ladowanie` (lot i upadek) |
| Cień smoka (boss, opcjonalnie) | głęboki granat + złote oczy i żyłki | większe rogi, „dymiące” końce skrzydeł; ciemny, ale w tym samym bajkowym stylu | `ziej` + `pluj` + `dmuch` + lot (ataki w fazach) |

Kwasowy i ognisty mogą zostać bez zmian. Jeśli przy ujednolicaniu wolisz
je lekko poprawić (np. ten sam kształt łap u wszystkich), to śmiało.

## Klatki (na smoka, tak jak dziś u kwasowego)

- `stoi` 2, `idzie` 4, `ugryzienie` 3, w każdej z 3 stron: `bok` (patrzy w lewo, prawą stronę gra robi lustrem), `przod`, `tyl`
- `smierc_bok` 3
- atak specjalny: 3 klatki na stronę (1 zapowiada, 2 wyrzuca, 3 wraca)
- tylko górski (i Cień): `start_bok` 3, `start_przod` 3, `lot_gora` 2, `ladowanie_przod` 3
- Do każdej strony podaj, gdzie jest **pysk** (punkt, z którego wylatuje ogień, kwas lub dym).

## Kolejność

1. **Próba:** `stoi_bok_1` i `stoi_przod_1` każdego smoka (5, a z Cieniem 6) na jednej planszy obok siebie, w skali gry. Właściciel akceptuje cały „zestaw” naraz, bo chodzi o to, żeby pasowały do siebie.
2. Po akceptacji: pełne komplety, gatunek po gatunku (najpierw górski, bo w grze walczy się z nim najczęściej – demo pod zamkiem).

## Co jest w paczce `40_smoki_ujednolicenie/`

- `porownanie_stoi_bok_x2.png`, `porownanie_stoi_przod_x2.png`: wszystkie smoki obok siebie w skali gry, z bohaterem
- `plansza_<gatunek>.png`: wszystkie obecne klatki gatunku podpisane nazwami
- `obecne_klatki/<gatunek>/<klatka>.png`: każda klatka osobno (220×200, górski 216×194)
- `obecne_arkusze/`: arkusze dokładnie tak, jak są w grze (+ .json z nazwami klatek)
- `obecne_efekty/`: obecne efekty (ogień, kwas, fala, pył, pęknięcia). Efekty zostają, nie trzeba ich rysować od nowa.
- `obecny_zastepczy_z_kodu_x4.png`: smok rysowany przez kod (dziś Cień smoka)

Paczkę zbudował `scripts/smoki-wyciagnij.py`.
