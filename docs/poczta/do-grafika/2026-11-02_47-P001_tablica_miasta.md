ID: 47-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel, 2.11.2026 („całą tablicę niech generuje grafik, ty tylko nałożysz na nią mapkę; regionalna
lub festiwalowa – w Halloween dynie, w święta zaśnieżona, w Japonii/Chinach azjatyckie daszki, we Francji gargulce”)
Wykonanie: —
Dotyczy: tablica z mapką miasta (nowe drogowskazy) – obiekt w świecie gry i ramka okna z mapką

# Zamówienie 47: tablica z mapką miasta – regionalna i świąteczna

## Co to jest w grze
W miastach stoją **tablice z mapką miasta**: przy wylotówkach, dworcach, dużych rondach, głównych skrzyżowaniach,
przy każdej armacie i przy każdym włazie podziemnego pinballa (metro). Bohater podchodzi, naciska AKCJA i otwiera
się duża mapka miasta wypalona w drewnie, z mosiężnymi tabliczkami wylotówek.

**Ty rysujesz całą tablicę, gra nakłada na nią mapkę.** Mapkę każdego miasta wylicza generator w chwili, gdy
ktoś tam gra – Ty jej nie rysujesz. Zostawiasz w tablicy **puste okno** (deskę), w które gra wpisze mapkę.

Dziś tablica jest rysowana kodem (tymczasowa, `src/art.ts` `drawTablicaMiasta`): `47_tablica/obecna_w_grze_x2.png`.
Okno z mapką: `47_tablica/okno_mapki_lublin.png`, `okno_mapki_krakow.png`.

## Jak to się składa (warstwy)
1. **Tablica regionalna** – cała tablica: słupki, rama, daszek/zwieńczenie, puste okno na mapkę.
   Gra wybiera ją po kraju, w którym stoi tablica.
2. **Ozdoba świąteczna** – osobna przezroczysta warstwa na tym samym płótnie, kładziona na wierzch dowolnej
   tablicy regionalnej. Gra włącza ją według daty, a śnieg także wtedy, gdy w grze naprawdę pada śnieg (gra ma
   prawdziwą pogodę).

Dzięki warstwom nie trzeba rysować każdej kombinacji: 4 regiony × 3 ozdoby = 7 obrazków, a nie 12.

## Co potrzebujemy

### A. Tablica w świecie (obiekt na mapie)
Płótno **48×56 px** (gra pokazuje w połowie), podstawa = środek dołu (tam, gdzie słupki stoją na ziemi).
Wyraźnie wyższa od postaci (postać ~13 px mapy, tablica ~28 px mapy).

**Okno na mapkę:** prostokąt **32×20 px** w tym samym miejscu na każdej tablicy (np. lewy górny róg w x 8, y 14) –
wypełnij go **czystym kolorem #FF00FF** (magenta). Gra wytnie magentę i wpisze tam miniaturę mapki danego miasta.
Podaj w wiadomości dokładne współrzędne okna.

Tablice regionalne (każda osobny plik):
| plik | region | motyw |
|---|---|---|
| `tablica_europa.png` | domyślna (cały świat poza resztą) | mosiądz, złoto, ciemne drewno, mała zębatka na górze – lekki steampunk |
| `tablica_azja.png` | Japonia, Chiny, Korea, Tajwan… | daszek z podwiniętymi rogami (pagoda), czerwona laka, złote okucia |
| `tablica_francja.png` | Francja (później może Belgia) | kute żelazo, mały gargulec (albo dwa) na rogach, secesyjne zawijasy |
| `tablica_arabska.png` (opcjonalnie) | Bliski Wschód, Afryka Północna | łuk podkowiasty, ornament geometryczny, mosiężne latarenki |

Ozdoby świąteczne (warstwy 48×56, przezroczyste, pasujące na każdą tablicę – trzymaj się krawędzi i stóp, nie
zasłaniaj okna):
| plik | kiedy | motyw |
|---|---|---|
| `ozdoba_halloween.png` | ok. 20 X – 2 XI | 1–2 dynie przy słupkach, pajęczyna w rogu, nietoperz |
| `ozdoba_zima.png` | grudzień – luty, oraz gdy w grze pada śnieg | czapa śniegu na zwieńczeniu i ramie, sopelki |
| `ozdoba_swieta.png` | ok. 6 XII – 6 I | gałązka jedliny z czerwoną kokardą/lampkami (kładziona razem ze śniegiem) |

### B. Ramka dużego okna z mapką (druga faza – po akceptacji A)
Okno z mapką dziś ma ramkę z kodu (drewno + mosiądz). Ramka w stylu regionu: 4 narożniki 48×48 px + 4 kafle
krawędzi 16×48 / 48×16 px (gra rozciąga krawędzie), dla każdego regionu, plus narożniki świąteczne (dynia,
śnieg, gałązka) jako osobne nakładki.

### C. Kartki z ogłoszeniami (zadania z tablicy)
Na mapce w oknie tablicy wisi kartka z ogłoszeniem przybita gwoździem; gra wpisuje w nią treść (jak w gazecie),
po stuknięciu kartka się powiększa z przyciskami „Przyjmuję” / „Odejdź”. Dziś jest rysowana kodem (CSS).
Potrzebujemy **4 kartek** (każda w 2 rozmiarach: mała 104×76 px na mapce i duża 380×300 px po powiększeniu,
z pustym miejscem na tekst – **bez napisów**, poza nagłówkiem listu gończego):
| plik | kiedy | wygląd |
|---|---|---|
| `kartka_zwykla_{mala,duza}.png` | zwykłe zlecenia (dostawy) | kremowy papier, poszarpany brzeg |
| `kartka_gonczy_{mala,duza}.png` | polowania na potwory | list gończy: żółtawy, czerwona ramka, nagłówek „POSZUKIWANY” (i wersja z „WANTED”) |
| `kartka_urzedowa_{mala,duza}.png` | zlecenia urzędów/policji | biała, czerwona lakowa pieczęć w rogu |
| `kartka_stara_{mala,duza}.png` | skupy (grzyby, drewno) | pożółkła, plamy, zagięty róg |

Do tego **2–3 gwoździe/pinezki** 12×12 px (`gwozdz_mosiezny.png`, `gwozdz_zelazny.png`, `pinezka_czerwona.png`) i
pieczątka **„PRZYJĘTE”** (oraz „TAKEN”) 80×28 px, czerwona, przekrzywiona – gra kładzie ją na kartkę wziętą tego dnia.
W świecie: tablica z dostępnym ogłoszeniem ma przypiętą małą białą kartkę – narysuj ją jako warstwę
`ozdoba_kartka.png` 48×56 px (jak ozdoby świąteczne), żeby pasowała na każdą tablicę regionalną.

## Styl
Paleta świata (jak szyldy miejsc i armata), obrys 1 px #1e1a24 jak postacie, światło z północnego zachodu, twarda
alfa (0/255), bez wygładzania, płaskie plamy koloru, **bez napisów** (napisy są tylko w oknie mapki), bez
gradientów „z AI”.

## Kolejność
1. **Próbka:** `tablica_europa.png` + `ozdoba_zima.png` – do akceptacji właściciela.
2. Po akceptacji: reszta części A.
3. Część C (kartki) – może iść równolegle z resztą A.
4. Na końcu część B.

## Jak oddać
Pliki do `docs/poczta/od-grafika/47_tablica/` + wiadomość `RRRR-MM-DD_47-G001_…md` (ID, wersja plików, współrzędne
okna na mapkę). Ja podepnę tablice (kraj → region, data/pogoda → ozdoba, miniatura mapki w oknie) i odpowiem
47-P002 z tabelą, co gdzie trafiło.
