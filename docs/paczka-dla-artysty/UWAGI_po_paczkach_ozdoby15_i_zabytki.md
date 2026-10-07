# Uwagi po paczkach „ozdoby15_A2” i „zabytki_ozdoby_20261006” (7.10.2026)

Dziękujemy! Większość jest już w grze na serwerze testowym. Zrzuty z gry są w folderze `18_uwagi_ozdoby15/`.

## Przyjęte i już w grze

- **Zamek Lubelski**: stoi w grze dokładnie na swoim obrysie (`zamek_w_grze.png`). Bardzo dobry.
- **12 tablic szyldów 22×20**: wszystkie w grze, czytelne, każda w swoim kolorze.
- **Słup pod tablicę** i **słup z ramieniem**: w grze, lampka nocą świeci (`slup_z_ramieniem_dzien.png`, `slup_z_ramieniem_noc.png`).
- **Ozdoby ścienne**: lampa ścienna (2 klatki), zębatka, bulaj, manometr – w grze (`ozdoby_na_scianie_w_grze_x5.png`).

**Ważne o rozmiarze.** Nasze budynki są niższe niż w makiecie (postacie w grze są mniejsze). Ozdoby zmniejszamy więc sami Twoim skryptem `wyrownaj_klatki.py`, do ok. 1,25 rozmiarów z pierwszej tabeli zamówienia 15 (manometr 10×12, zawór 11×11, zegar 12×12, zębatka 13×13, bulaj 10×10, lampa 9×12, wentylator 13×13). Jak to wygląda, pokazuje `ozdoby_w_rozmiarze_gry_x8.png`. Dlatego rysuj dalej duże, ale z **grubymi, prostymi kształtami i małą liczbą szczegółów**. Cienkie linie i drobne elementy po zmniejszeniu znikają.

## Poprawki

1. **Zawór** (`ozdoba_zawor`): po zmniejszeniu wygląda jak czerwona plamka. Potrzebne jest wyraźne **kółko z dziurą w środku i 4 grubymi szprychami** na krótkim kawałku rury. Kółko ma zająć prawie całą ramkę.
2. **Zegar** (`ozdoba_zegar`): po zmniejszeniu wskazówki znikają i zostaje kremowe kółko (dziś dorysowujemy je programem). Prosimy o **grube, ciemne wskazówki** (np. na 10:10), mniej kresek na tarczy i grubszą mosiężną ramę.
3. **Wentylator** (`ozdoba_wentylator`, 3 klatki): obudowa (mosiężny kołnierz, nity) ma być **identyczna co do piksela we wszystkich klatkach**. Zmieniają się tylko łopatki (0°, 30°, 60°). Dziś kołnierz w każdej klatce jest trochę inny, więc w animacji drga.
4. **Słup z ramieniem** (`szyld_slup_ramie`): rozstaw haczyków ma być **równy szerokości tablicy**, a haczyki mają być przy końcu ramienia. Dziś są za blisko siebie i tablica „wisi na jednym”.
5. **Słup pod tablicę** (`szyld_slup_tablica`): w opisie piszesz, że lampka w obu klatkach jest zgaszona, a u nas druga klatka wygląda na zapaloną. Prosimy o sprawdzenie: klatka 1 ma mieć lampkę zgaszoną, klatka 2 zapaloną (ciepłe żółte szkło).
6. **Krawędzie bez różu**: na brzegach rysunku zamku było ok. 250 różowych pikseli (mieszanka z tłem magenta). Wyczyściliśmy je sami, ale w kolejnych plikach prosimy o brzegi bez różowej obwódki.

## Braki (jeszcze nie dostarczone)

**Kocioł** (`ozdoba_kociol`): był zaakceptowany bez uwag, ale pliku nie ma w żadnej paczce. Prosimy o przesłanie go (duże źródło na magencie wystarczy).

**Grupa A, na ścianie (7 sztuk):**

| Plik | Co to |
|---|---|
| `ozdoba_rura_pozioma` | kawałek mosiężnej rury z obejmą; musi się powtarzać w poziomie bez szwu |
| `ozdoba_rura_kolanko` | kolanko rury (zakręt 90°) |
| `ozdoba_rura_spod_ziemi` | gruba rura wychodząca z ziemi przy ścianie, z kołnierzem i zaślepką |
| `ozdoba_zbiornik_scienny` | wysoki walcowy zbiornik z obręczami i małym manometrem |
| `ozdoba_poczta_rura` | szklana rura poczty pneumatycznej z mosiężną obejmą; musi się powtarzać w pionie |
| `ozdoba_poczta_skrzynka` | skrzynka-odbiornik poczty u dołu rury |
| `ozdoba_kratka_parowa` | żeliwna kratka w chodniku pod ścianą |

**Grupa B, na dachu (7 sztuk; widok z góry z ukosa, jak drzewa w grze):**

| Plik | Co to | Klatki |
|---|---|---|
| `ozdoba_komin_zelazny` | wysoki żeliwny komin z mosiężnym wieńcem | 1 |
| `ozdoba_swietlik` | okrągły świetlik w zębatej mosiężnej ramie | 1 |
| `ozdoba_luneta` | luneta na trójnogu, skierowana w niebo | 1 |
| `ozdoba_kopula` | mała miedziana kopuła obserwatorium ze szczeliną | 1 |
| `ozdoba_zbiornik_wody` | drewniana beczka-zbiornik na żelaznych nogach | 1 |
| `ozdoba_antena_tesli` | miedziana wieżyczka ze szklaną kulą | 2: zwykła, z iskrą |
| `ozdoba_anemometr` | wiatromierz z trzema czaszami na maszcie | 3 (obrót, maszt identyczny w każdej klatce) |

Zasady jak dotąd: jedna rzecz na obrazku, tło magenta #FF00FF, bez cienia na ziemi, obrys #1e1a24, światło z lewej-góry, klatki obok siebie w jednej skali i z tą samą podstawą.

## Zabytki

- **Brama Krakowska** i **Nowy Ratusz**: szkice stylu są ładne, ale nie leżą na szkielecie z mapy. **Szkielety są już gotowe**: zamówienie 19 (`ZAMOWIENIE_19_brama_ratusz_katedra.md`, folder `19_zabytki_szkielety/`), razem z Archikatedrą, Wieżą Trynitarską i animowaną cewką Tesli.
- **Zamek Lubelski** zostaje taki, jak jest.
- Kolejne zabytki (Brama Grodzka, Trybunał Koronny, czyli Stary Ratusz) dostaniesz po zamówieniu 19.

## Inne zamówienia w kolejce

- **Zamówienie 17: Kozioł** (boss historii „Przebudzenie Starego Grodu”): `ZAMOWIENIE_17_koziol.md` i `17_koziol/` (zastępczy wygląd dziś). Numer 14 to wozy modularne, więc Kozioł ma 17.
- **Zamówienie 14: wozy modularne**: koń 3 klatki, skrzynia 2 warstwy, beczki i worki jako pierwsza próbka, bez zmian.
