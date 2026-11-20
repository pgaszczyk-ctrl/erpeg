# 50-P003 – Próba 2 przyjęta co do kierunku; prośba o pliki i plan zbroi

- **ID:** 50-P003
- **Odpowiedź na:** próbę 2 strażnika (zrzut `50_wielkosc_kat/proba2_zrzut_od_grafika.png`)
- **Od:** programista
- **Do:** grafik
- **Status:** nowe
- **Akceptacja:** właściciel, 20.11.2026 – kierunek próby 2 i plan zbroi zaakceptowane („zgoda”);
  sama próba czeka na sprawdzenie w grze
- **Wykonanie:** –
- **Dotyczy:** 50-P001, 50-P002

## 1. Ocena próby 2

Kierunek jest dobry: hełm z kształtem i mosiężną zębatką, guziki, pas, cieniowanie, ciemny obrys, czytelny
profil z ramieniem i nogami, kolory pasują do świata. To duży skok względem próby 1.

Na podstawie zrzutu nie da się jednak sprawdzić pikseli – krawędzie na zrzucie wyglądają miękko (może to być
tylko skalowanie podglądu). Ostateczną zgodę właściciel da po zobaczeniu postaci **w grze**, obok domów
i obecnego Strażnika, na telefonie i komputerze.

## 2. Pliki, których potrzebuję (próba 2)

| Plik | Co zawiera | Wymagania |
|---|---|---|
| `straznik_przod_stoi.png` | przód, postój | **1 piksel pliku = 1 piksel świata** (bez powiększania, bez pomniejszania z większego obrazka) |
| `straznik_bok_stoi.png` | bok (patrzy w lewo), postój | jak wyżej |
| `straznik_proba2_maska.png` | maska kolorów do obu klatek (może być jeden arkusz 2 klatek) | kolory masek jak w 50-P001: czerwony góra stroju, zielony dół, niebieski skóra, żółty włosy, magenta nakrycie głowy, cyjan buty; 3 odcienie każdego |
| `straznik_proba2_x8.png` | podgląd ×8 (jak zrzut) | tylko do porównania |
| `README.md` albo `.json` | punkt stóp, punkt szyi (głowa), lista użytych kolorów | – |

Format każdej klatki:
- klatka **96 × 96 px**, stopy w wierszu **90**, środek stóp w kolumnie **48** (jak 50-P001 – wolne miejsce
  jest na zamach bronią); jeśli wygodniej, może zostać 32 × 32 ze stopami w wierszu 31 – przesunę sam, ale
  finalne arkusze muszą być 96 × 96;
- postać **30–34 px** wysokości (stopy → czubek hełmu);
- PNG RGBA, przezroczystość **tylko 0 albo 255** (żadnych półprzezroczystych pikseli na brzegach);
- najwyżej ~24 kolory na postać, obrys `#1e1a24`;
- **żadnych bloków 2 × 2** i żadnego rysowania w mniejszej siatce.

Jeśli rysujesz w programie, który eksportuje większy obraz – proszę o plik w rozdzielczości roboczej
(1 piksel rysunku = 1 piksel pliku), nie o pomniejszony render.

## 3. Plan zbroi i ekwipunku (zaakceptowany przez właściciela)

Przy postaci ok. 30 px pełne animacje dla każdej zbroi nie mają sensu – różnicę i tak słabo widać.
Robimy tak:

| Co | Jak | Ile rysowania |
|---|---|---|
| **Strój ciała** | osobny rysunek tylko dla **profesji**: strażnik (start), rycerz, łowca, mag | 4 stroje × ok. 70 klatek (8 kierunków, 5 rysowanych + odbicia: postój, chód 8, atak 5) |
| **Jakość zbroi** (5 stopni) | ten sam strój, **inne kolory przez maskę**: skóra → stal → mosiądz → złote okucia | 0 nowych klatek – ale maska musi dokładnie oddzielać materiały (tkanina / skóra / metal) |
| **Hełm / nakrycie głowy** | osobna warstwa na głowie: brak, czapka strażnika, skórzany, żelazny, kapelusz maga, korona | po 5 rysunków (kierunki), bez animacji |
| **Broń w ręce** | osobna warstwa: miecz, topór, łuk, kusza, różdżka, kij | po 5 rysunków, punkt chwytu w pliku |
| **Buty, talizmany** | nie pokazujemy na postaci (2–3 px) | 0 |

Na co uważać przy rysowaniu, żeby to działało:
- przy tej wielkości rozpoznaje się **sylwetkę, kształt hełmu, główne kolory i broń** – na nich opierać
  różnice między postaciami, nie na drobiazgach;
- metalowe części zbroi (naramienniki, okucia) na masce jako osobny materiał, żeby dało się je przebarwić
  ze skóry na stal / mosiądz / złoto;
- hełmy mają zakrywać włosy tak samo w każdym kierunku (bez przebijania włosów spod rondla).

## 4. Kolejność

1. Pliki z pkt 2 → wstawiam do gry, zrzuty dla właściciela.
2. Po akceptacji: pełny strój strażnika (5 kierunków, postój, chód, atak) + 1 głowa + 2 hełmy + miecz i łuk
   (pilotaż z 50-P001).
3. Potem stroje profesji, reszta hełmów i broni.
