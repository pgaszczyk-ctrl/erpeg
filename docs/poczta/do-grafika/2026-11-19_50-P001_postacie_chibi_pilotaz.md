# 50-P001 – Postacie chibi z warstw: pilotaż strażnika

- **ID:** 50-P001
- **Odpowiedź na:** – (nowe zamówienie)
- **Od:** programista
- **Do:** grafik
- **Status:** wstrzymane (właściciel, 20.11.2026: zostajemy przy modelach 3D, tylko je dopracowujemy)
- **Akceptacja:** właściciel, 19.11.2026 („rób wszystko”; decyzje w raporcie z testu)
- **Wykonanie:** –
- **Dotyczy:** wszystkie postacie gry (bohater, mieszkańcy, potem potwory)

## Po co

Obecne postacie 3D odpadają: są za małe i nieczytelne, wszyscy wyglądają tak samo, a wygląd 3D nie pasuje do
rysowanego świata. Zastępujemy je **rysowanymi sprite'ami chibi** w klimacie lekkiego fantasy i steampunku
(gogle, mosiądz, skóra, płaszcze), składanymi z warstw. Ruch ma być płynny jak w Diablo: **8 kierunków**.
Różnorodność jak w Tibii: strój plus **4 kolory** do wyboru (nakrycie głowy, góra, dół, buty).

## Warstwy i punkty zaczepienia

| Warstwa | Co rysujesz | Jak gra to składa |
|---|---|---|
| Ciało w stroju | pełna animacja + maska kolorów | przebarwia maską według kolorów gracza |
| Głowa (twarz, włosy) | 1 rysunek na kierunek + maska skóry i włosów | przypina w punkcie szyi każdej klatki ciała |
| Hełm / nakrycie | 1 rysunek na kierunek, osobno każdy wygląd | przypina do głowy |
| Broń w ręce | 1 rysunek na kierunek, osobno każdy rodzaj | przypina w punkcie dłoni, z kątem z klatki |

W chibi głowa jest duża i sztywna, więc głowa i hełm **nie mają animacji** – animuje się tylko ciało.

### Maski kolorów (jak dotąd)

Czerwony = góra stroju, zielony = dół, niebieski = skóra, żółty = włosy, magenta = nakrycie głowy, cyjan = buty.
Trzy odcienie każdego materiału (jasny / średni / ciemny) – gra zamienia je na te same stopnie wybranej palety.

## Animacje ciała (jeden strój)

| Element | Ilość |
|---|---|
| Kierunki | 8; rysujesz 5 (dół, dół-lewo, lewo, góra-lewo, góra), prawa strona = odbicie |
| Postój | 1 klatka (opcjonalnie 4 klatki oddechu) |
| Chód | 8 klatek |
| Atak (zamach bronią) | 5 klatek |
| Razem | ok. 70 klatek + maski |
| Dane do każdej klatki | punkt szyi, punkt dłoni, kąt broni – plik JSON obok arkusza |

## Wielkość i styl

- Klatka 96 × 96 px, stopy na wierszu 90, środek stóp w kolumnie 48.
- Postać ok. 1,2–1,3× większa niż dzisiejszy bohater w grze; głowa ok. 40 % wysokości postaci.
- Gęstość pikseli jak świat: 1 piksel rysunku = 0,5 punktu mapy. Ciemny obrys #1e1a24 (1 px), nasycone kolory,
  najwyżej 16 kolorów na warstwę, twarde krawędzie (alfa 0 albo 255).
- Wzór nastroju: dzisiejsze rysowane postacie stałe (mag, Margo) i smok ognisty – „lekko poważnie, nie słodko”.

## Pilotaż (proszę najpierw tylko to)

1. Strój strażnika startowego (mundur z mosiężnymi guzikami) w 5 rysowanych kierunkach: postój, chód 8 klatek,
   atak 5 klatek, z maskami i plikiem JSON punktów zaczepienia.
2. 1 głowa (młoda osoba, krótkie włosy) w 5 kierunkach z maską skóry i włosów.
3. 2 nakrycia głowy: czapka strażnika, skórzany hełm – po 5 kierunków.
4. 2 bronie: miecz, łuk – po 5 kierunków, punkt chwytu zaznaczony w pliku.
5. Podgląd: postać złożona w 8 kierunkach na tle naszej ulicy (zrzut z gry jest w paczce 5_zrzuty_z_gry) przy
   skali gry ×1 i ×4.

Po akceptacji pilotażu: stroje profesji (rycerz, łowca, mag – gra ma je już od 5. poziomu), reszta hełmów
(brak, czapka, skórzany, żelazny, kapelusz maga, korona) i broni (miecz, topór, łuk, kusza, różdżka, kij);
mieszkańcy w lżejszym zestawie (4 kierunki, chód 4 klatki, bez ataku, 6–8 strojów różnych wiekiem i płcią);
na końcu potwory w tym samym stylu.

## Pliki

`ciało_<strój>.png` + `ciało_<strój>_maska.png` + `ciało_<strój>.json`, `glowa_<nr>.png` + maska,
`helm_<id>.png`, `bron_<id>.png` – arkusze: wiersze = kierunki (dół, dół-lewo, lewo, góra-lewo, góra),
kolumny = klatki.
