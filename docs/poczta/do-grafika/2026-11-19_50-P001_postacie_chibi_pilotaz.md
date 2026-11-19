ID: 50-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: zaakceptowane przez właściciela 19.11.2026 – pilotaż porównawczy (wariant A rysowany + wariant B z modelu 3D)
Wykonanie: –
Dotyczy: nowe postacie – rysowane chibi fantasy/steampunk, 8 kierunków jak w Diablo, warstwy (ciało w stroju, głowa, hełm, broń); pilotaż na stroju strażnika

# Zamówienie 50-P001 – nowe postacie chibi, pilotaż

Gotowy prompt dla ChatGPT: `50_postacie_chibi/PROMPT_GPT.md`. Zrzuty z gry do porównania wielkości: `50_postacie_chibi/zrzut_*.png`.
Pełne uzasadnienie: `docs/raporty/2026-11-19_raport_testu_i_lista_zmian.md`, sekcja „Postacie”.

## Dlaczego

Właściciel (19.11.2026): obecne postacie 3D (strażnik z `public/modele/straznik.glb`) odpadają. Są za małe i nieczytelne
(zrzuty 1–3), wszyscy wyglądają tak samo, a wygląd 3D nie pasuje do rysowanego, pikselowego świata.

Decyzje właściciela:
- styl: **rysowane chibi, fantasy i steampunk** (gogle, mosiądz, skóra, płaszcze; lekko, bajkowo, nie mrocznie);
- różnorodność jak w Tibii: **strój + 4 kolory wybierane przez gracza** (nakrycie głowy, góra, dół, buty);
- **na postaci widać hełm i broń w ręce**;
- **ruch jak w Diablo**: 8 kierunków, płynny chód, zamach bronią;
- nazwa i pasek życia tylko w walce (to robi program, nie rysunek).

## Jak postać jest zbudowana – 4 warstwy

| Warstwa | Co rysujesz | Jak gra to składa |
| --- | --- | --- |
| Ciało w stroju (bez głowy) | pełna animacja + maska | przebarwia maską według kolorów gracza |
| Głowa (twarz, włosy) | 1 rysunek na kierunek + maska | przypina w punkcie szyi z danej klatki ciała |
| Hełm / nakrycie | 1 rysunek na kierunek, na tym samym płótnie co głowa | kładzie na głowę |
| Broń w ręce | pozy na kierunek (niżej) | przypina w punkcie dłoni z danej klatki |

W chibi głowa jest duża i sztywna, więc nie animujesz jej klatka po klatce – tylko ciało.

## Kierunki i klatki ciała

- 8 kierunków, rysujesz **5**: dół (S), dół-lewo (SW), lewo (W), góra-lewo (NW), góra (N). Prawa strona = odbicie w programie.
- Na każdy kierunek: **postój 1 klatka**, **chód 8 klatek** (pełny cykl, wyraźnie różne kroki – dziś kroki A/B są często prawie takie same i postacie „lewitują”), **atak 5 klatek** (zamach bronią jednoręczną).
- Razem: 5 × 14 = **70 klatek ciała** + 70 masek.

## Wielkość i siatka

- Rysuj w **wielkości końcowej**, piksel w piksel, twarde krawędzie, przezroczyste tło (alfa tylko 0 albo 255), bez wygładzania.
- Komórka **48 × 48 px**. Cała postać z głową i hełmem ok. **34 px** wysokości, głowa ok. 40% wysokości (chibi).
  Stopy na linii **y = 45**, środek stóp **x = 24** we wszystkich klatkach.
- Obrys **#1e1a24**, 1 px, jak wszystkie postacie i budynki w grze. Nasycone kolory, 3–4 odcienie na materiał, światło z lewej-góry.
- Do każdego arkusza podgląd ×4 (NEAREST), żeby ocenić bez lupy.
- Jeśli po wstawieniu do gry 34 px okaże się za mało lub za dużo, program przeskaluje – ważna jest czysta siatka.

## Maski kolorów (zgodne z obecnymi postaciami)

Osobny plik `_maska.png` dla ciała i dla głowy/hełmu, te same wymiary i pozycje co rysunek.

| Kolor maski | Co przebarwia gra |
| --- | --- |
| czerwony #ff0000 | góra stroju (kurtka, płaszcz, tunika) |
| zielony #00ff00 | dół stroju (spodnie, spódnica) |
| cyjan #00ffff | buty |
| magenta #ff00ff | nakrycie głowy / hełm (tylko elementy barwione, metal bez maski) |
| niebieski #0000ff | skóra |
| żółty #ffff00 | włosy, broda, brwi |
| brak (przezroczysto) | wszystko, czego nie przebarwiamy: metal, mosiądz, skóra pasów, oczy, obrys |

Rysunek w masce zostaje w swoich odcieniach (jasny/ciemny) – program zachowuje jasność, zmienia tylko barwę.

## Głowa, hełm, broń

- **Głowa**: 5 rysunków (S, SW, W, NW, N) + maska. Płótno 48 × 48, głowa ustawiona tak, żeby punkt szyi był w **(24, 30)**.
- **Hełmy na pilotaż**: skórzany i żelazny. Rysowane na płótnie głowy (48 × 48, te same pozycje), 5 kierunków każdy.
  Hełm zasłania włosy – program schowa włosy pod hełmem według maski.
- **Bronie na pilotaż**: miecz i łuk.
  - Miecz: na kierunek **4 pozy** – trzymanie (do postoju i chodu) + 3 fazy zamachu (góra, środek, dół). Razem 20 rysunków.
  - Łuk: na kierunek **2 pozy** – trzymanie + napięty. Razem 10 rysunków.
  - Każdy rysunek broni ma **punkt chwytu** (gdzie dłoń) – zapisany w danych. Program przy chodzie może obrócić broń najwyżej ±15°.

## Dane do każdej klatki ciała (plik JSON obok arkusza)

```json
{
  "komorka": [48, 48],
  "stopy": [24, 45],
  "kierunki": ["S", "SW", "W", "NW", "N"],
  "klatki": {
    "S": {
      "postoj": [ { "szyja": [24, 25], "dlon": [30, 36], "bronZaPlecami": false } ],
      "chod":   [ { "szyja": [24, 25], "dlon": [30, 36], "bronZaPlecami": false } ],
      "atak":   [ { "szyja": [24, 25], "dlon": [31, 31], "pozaBroni": "gora", "bronZaPlecami": false } ]
    }
  },
  "bronie": {
    "miecz": { "S": { "trzymanie": { "chwyt": [6, 20] }, "gora": { "chwyt": [6, 20] }, "srodek": { "chwyt": [6, 20] }, "dol": { "chwyt": [6, 20] } } },
    "luk":   { "S": { "trzymanie": { "chwyt": [10, 18] }, "napiety": { "chwyt": [10, 18] } } }
  }
}
```

`chod` ma 8 wpisów, `atak` 5, w kolejności klatek w arkuszu. `bronZaPlecami: true` = broń rysowana pod ciałem (zwykle N i NW).
Liczby w przykładzie są umowne – wpisz prawdziwe dla swoich rysunków.

## Układ plików (do `od-grafika/50_postacie_chibi/`)

```
straznik_cialo.png         5 wierszy (S, SW, W, NW, N) × 14 kolumn (postój, chód 1–8, atak 1–5), komórka 48×48
straznik_cialo_maska.png   to samo, maska
glowa_01.png / _maska.png  5 kolumn (S, SW, W, NW, N), 48×48
helm_skorzany.png / _maska.png, helm_zelazny.png / _maska.png   5 kolumn, 48×48
miecz.png                  5 wierszy × 4 pozy;   luk.png   5 wierszy × 2 pozy   (wielkość komórki dowolna, podaj w JSON)
straznik.json              dane jak wyżej
podglad_x4.png             złożona postać: 5 kierunków, postój + 3 klatki chodu + 1 klatka ataku, z hełmem i mieczem
README.md                  co jest w paczce, jakie narzędzie, co niepewne
```

## Etapy

0. **Próbka stylu do akceptacji właściciela** (zanim ruszy cała paczka): jedna złożona postać w kierunkach S i W, postój + 2 klatki chodu,
   z żelaznym hełmem i mieczem, w wielkości końcowej + podgląd ×4, obok wklejona na zrzut z gry (`zrzut_1`). Bez masek i JSON.
1. **Wariant A – rysowany**: pełna paczka jak wyżej.
2. **Wariant B – z modelu 3D (porównawczy)**: ta sama paczka (te same kierunki, klatki, wielkość, maski, JSON) wyrenderowana z modelu
   strażnika (`public/modele/straznik.glb`, źródła w `scripts/model3d/`) i przerobiona na piksele: płaskie kolory w palecie, obrys #1e1a24,
   przyciągnięcie do siatki. Wystarczy ciało + głowa + żelazny hełm + miecz. Jeśli nie masz na to narzędzia, napisz – programista
   przygotuje render skryptem, a Ty tylko poprawisz piksele.

Program wstawi oba warianty do gry obok siebie; właściciel wybierze na telefonie. Wariant B, jeśli wygląda dobrze, oszczędza najwięcej pracy
przy kolejnych strojach (przedmiot modeluje się raz, kierunki i klatki wychodzą same).

## Czego nie robić

- Nie wygładzaj krawędzi i nie zostawiaj półprzezroczystych pikseli (poza maską też nie).
- Nie zmieniaj wielkości komórki ani linii stóp między klatkami.
- Nie rysuj głowy w arkuszu ciała ani hełmu na stałe na głowie.
- Nie przepuszczaj gotowych plików przez skrypty zmniejszające (`wyrownaj.py` itp.) – dostarczasz wielkość końcową.
