ID: 44-P001
Odpowiedź na: – (nowe zamówienie; dotyczy też 42-P001 i paczki „EXP-LORE_straznik_model_3D”)
Od: programista
Do: grafik
Status: nowe
Akceptacja: zlecone przez właściciela 27.10.2026: „Przygotuj zamówienie dla grafika na nagrobki i wejścia. Wylistuj też jakie mamy npce i potworki i dodaj do zamówienia. Stworki mają być w 3d tak jak modele postaci zbudowane w three.js, wejścia itp jako dotychczasowe ilustracje pod przyjemnym kątem, nie na płasko.”
Wykonanie: –
Dotyczy: A) nagrobki, wejścia do krypt/katakumb i wnętrze lochów – ilustracje; B) wszystkie potworki, smoki i postacie niezależne – modele 3D jak Strażnik; C) lista wszystkich zastępczych grafik (placeholderów) w grze

# Zamówienie 44: cmentarze, wejścia do lochów i stworki w 3D

## Dlaczego

Na serwerze testowym są już **lochy**: krypta pod każdym większym cmentarzem i katakumby pod każdą dużą
świątynią. Schodzi się po schodach do małego labiryntu z potworami, strażnikiem i skrzynią. Wszystko, co
tam widać, jest dziś narysowane kodem – prostokąty i kreski (zrzuty w `44_lochy_i_3d/teraz_*.png`).
Cmentarze dostały rzędy grobów, też z kodu (`teraz_cmentarz_unicka.png`, `teraz_groby_x3.png`).

Drugi powód: Twój **Strażnik w 3D** (`public/modele/straznik.glb`) chodzi już w grze na serwerze testowym
i wygląda dobrze. Właściciel chce, żeby tak samo – bryłowo, w 3D – zrobić **wszystkie stworki i postacie**.

Zasada podziału:

| Co | Jak |
|---|---|
| Rzeczy stojące w świecie (nagrobki, wejścia, skrzynie, pochodnie, płyty podłogi) | **ilustracje PNG**, jak wozy konne, zabytki i ozdoby – widziane z góry pod przyjemnym kątem świata, **nie płasko z lotu ptaka** |
| Wszystko, co się rusza i walczy albo rozmawia (potworki, smoki, ludzie, pies) | **modele 3D (GLB)**, jak Strażnik |

---

## Część A – ilustracje (PNG)

### Wspólne zasady (jak dotąd)

- Kąt: ten sam co w świecie gry – widok z góry pod ok. 60°, widać **wierzch i przednią ścianę** (zobacz
  wozy konne, Targi Lublin, Bramę Krakowską). Nie płasko z lotu ptaka.
- Światło z **północnego zachodu** (lewa góra), cień krótko w prawo w dół.
- Obrys **1 px #1e1a24**, twarda przezroczystość (bez półprzezroczystych krawędzi poza światłem/poświatą),
  paleta stonowana jak dachy i ziemia.
- Skala względem bohatera: bohater ma ok. **27 px** wysokości na rysunku (2 px rysunku na 1 px mapy).
  Rzecz „wielkości człowieka” ma ok. 27 px; nagrobek ok. 1 m = ok. 8–10 px wysokości tablicy.
  Dorzuć do każdej planszy podgląd **×4** z bohaterem obok (sylwetka w `teraz_wejscie_katakumby_x4.png`).
- Punkt zaczepienia: **środek dołu podstawy** (jak przy ozdobach) – podaj go w pliku .json albo w opisie.
- Światło (pochodnia, latarnia przy wejściu) zawsze z **widocznego źródła** i jako osobna warstwa poświaty.

### A1. Nagrobki (cmentarz w świecie)

Dziś: płyta + tablica albo krzyż, 6 kolorów kamienia, znicz/kwiaty, stary grób ziemny z drewnianym krzyżem
(`teraz_groby_x3.png`). Kwatera grobu ma na mapie ok. **4 × 7 px mapy** (≈ 8 × 14 px rysunku) – nagrobki
muszą się mieścić w rzędach co 6 × 10 px mapy.

1. Płyta z tablicą (zaokrągloną) – **3 kształty** tablicy.
2. Płyta z kamiennym krzyżem – **2 kształty**.
3. Stary grób ziemny z drewnianym krzyżem (lekko krzywym).
4. Grób dziecięcy (mniejszy) – 1.
5. Grobowiec rodzinny (2 kwatery szerokości, z daszkiem / aniołem) – 1–2, rzadki akcent.
6. Kamień każdego nagrobka w **kilku odcieniach** – wystarczy szary jasny w wersji bazowej + **maska**
   (czerwony = kamień), kolory podmienimy kodem (dziś: jasny szary, grafit, prawie czarny, piaskowiec,
   jasny granit, brąz).
7. Dodatki osobno, do nakładania: znicz czerwony / zielony / biały (**2 klatki płomienia**), wiązanka kwiatów
   (3 kolory), wieniec, mech na starej płycie.
8. Opcjonalnie: krzyż/kapliczka na skrzyżowaniu alejek, ławka cmentarna, stara brama cmentarna z kratą.

### A2. Wejścia do lochów (w świecie)

1. **Krypta na cmentarzu** – niewielka kamienna kaplica grobowa albo zejście w ziemię z kamiennymi
   schodami, kratą/uchylonymi drzwiami, ciemnością w środku i **zimną (niebieskawą) latarnią** obok.
   Wielkość: ok. 1,5 × wysokość bohatera. Musi być widać od razu, że da się tu wejść.
   Wersje: **zamknięta/otwarta** nie jest potrzebna – zawsze otwarta.
2. **Katakumby pod świątynią** – okute drzwiczki w ziemi albo w podmurówce przy tylnej ścianie świątyni
   („ktoś je niedawno wyważył”), schodki w dół, ciepłe światło **pochodni** przy wejściu.
   Rysuj tak, żeby stało **na ziemi przy murze** (mur świątyni namalujemy my).
3. Warstwa poświaty dla obu (osobny PNG), 2–3 klatki migotania pochodni.

Dziś obie są prostokątem z kodu (`teraz_wejscie_katakumby.png`, `teraz_wejscie_katakumby_x4.png`).

### A3. Wnętrze lochu

Labirynt na kratce **8 px mapy** (16 px rysunku): korytarze szerokie na 3 kratki, komnaty 6–10 kratek,
ściany grube na 2 kratki. Widok jak świat – ściany widać od góry (wierzch) i od przodu (lico ok. 1 kratki).
Zrzuty: `teraz_loch_walka.png`, `teraz_loch_telefon.png`, `teraz_loch_schody.png`, `teraz_loch_skrzynia.png`.

Dwa zestawy (**krypta** – zimny szary kamień z mchem; **katakumby** – ceglasto-brązowy kamień):

1. Płyty podłogi – kafel **16 × 16 px**, 4 warianty, sklejalne bez szwu.
2. Wierzch ściany – kafel sklejalny; **lico ściany** (przód) – kafel sklejalny w poziomie, 2–3 warianty
   (zwykłe, pęknięte, z niszą na kości w katakumbach).
3. Narożniki/zakończenia lica (lewy, prawy) – jeśli bez nich wygląda źle.
4. **Schody w górę** (z jaśniejszym światłem dnia z góry) – wejście/wyjście z lochu.
5. **Skrzynia** – zamknięta i otwarta (złoto w środku), wielkości ok. pół bohatera.
6. **Pochodnia na ścianie** – 3 klatki płomienia + osobna warstwa światła.
7. Dekoracje podłogi (pojedyncze PNG): kości, czaszka, trumna, sarkofag, beczka, skrzynka, pajęczyna w rogu,
   kałuża, gruz, świece na posadzce.

### Kolejność

Najpierw **próba**: 2 nagrobki (tablica + krzyż), wejście do krypty, 1 kafel podłogi + lico ściany krypty.
Po akceptacji właściciela reszta.

---

## Część B – modele 3D (GLB), jak Strażnik

### Wspólne zasady (z Twojej paczki Strażnika)

- Format **GLB**, sztywne części (bez skórowania) albo prosty szkielet – jak Strażnik; kolory w
  wierzchołkach, `KHR_materials_unlit`. Gra sama dorysowuje obrys #1e1a24 i oświetla z NW.
- **Wspólny szkielet i wspólne animacje bazowe** dla ludzi (o czym pisałeś w README) – ludzie,
  bandyci, szkielety, zombiaki, herszt mogą dzielić chód i atak, z dopasowanymi proporcjami.
- Budżet: postać w grze zajmuje ok. 54 px wysokości, więc **ok. 2–5 tys. trójkątów** na zwykłego
  stworka, do ok. 10 tys. na bossa/smoka. Na ekranie bywa 10–20 stworków naraz – na telefonie.
- Skala: korzeń jak u Strażnika (człowiek ≈ 1,25 jednostki). Stopy w punkcie 0, przód w stronę +Z.
- Węzły chwytu broni (`*_at_hand_grip`) tam, gdzie stworek coś trzyma (pałka, nóż, miecz, różdżka).
- Animacje (nazwy klipów):
  `idle`, `walk`, `attack` (z wyraźnym **zamachem ≥ 0,4 s** – gracz musi zdążyć uciec; w grze atak jest
  zapowiadany), `hit` (krótkie drgnięcie), `death`. Specjalne – przy danym stworku niżej.
- Ludzie (NPC, mieszkańcy): `idle`, `walk`, `talk` (gest ręką), dla niektórych `wave`.
- Kolory ubrań mieszkańców podmieniamy kodem – oznacz grupy wierzchołków (np. osobny węzeł/materiał
  „ubranie_1”, „ubranie_2”, „skora”, „wlosy”), żeby jeden model dał kilka strojów.
- Wygląd według dzisiejszych rysunków (plansze `obecne_*.png`) – możesz poprawić, ale postać ma być
  rozpoznawalna. Styl: jak Strażnik (lekko bajkowy steampunk, lekko straszny, nie przerażający).

### B1. Potworki (pierwszy etap – lochy i ulice)

Plansza: `44_lochy_i_3d/obecne_potworki.png`.

| # | Stworek | Gdzie w grze | Dziś | Specjalne animacje |
|---|---|---|---|---|
| 1 | **Chochlik** (+ Wielki chochlik = ten sam ×1,6) | gangi na ulicach, katakumby | arkusz 2D | `throw` (rzut żołędziem) |
| 2 | **Bandyta** | gangi nocą, katakumby | arkusz 2D | – (nóż/pałka w ręce) |
| 3 | **Szkielet** | cmentarze, krypty | arkusz 2D | `rise` (wstaje z ziemi – opcjonalnie) |
| 4 | **Upiór krypty** (boss krypty) | strażnik skrzyni w krypcie | blady szkielet ×1,9 (zastępczo) | `scream` (zamach z zasięgiem), unosi się nad ziemią |
| 5 | **Zombiak** | przy wodzie, krypty | arkusz 2D | – |
| 6 | **Wodnik** | w deszczu, przy wodzie | zombiak na niebiesko (zastępczo) | `cast` (przywołuje wodne bloby) |
| 7 | **Wodny blob** | w deszczu | ilustracja 2D | `wobble` zamiast chodu |
| 8 | **Driada** | lasy | arkusz 2D | `cast` (pnącza – opcjonalnie) |
| 9 | **Herszt** (+ Wielki herszt ×2,5) | boss gangu | arkusz 2D (goblin w hełmie) | `slam` (uderzenie pałką w ziemię) |
| 10 | **Wilk** | łowiska za miastem | **brak** (bandyta zastępczo) | `lunge` (skok do przodu) |
| 11 | **Warg** | łowiska, głębiej | **brak** | `bite`, `pounce` (skok z góry) |
| 12 | **Mosiężny Kozioł** (boss) | łowiska, fabuła „Serce Zębatka” | arkusz 2D | `charge` (szarża), `stomp` (tupnięcie), `horns` (rogi) |
| 13 | **Pojedynkowicz** („wojownik”) | mieszkaniec wyzwany na pojedynek | ten sam co mieszkaniec | korzysta z modelu mieszkańca |

**Wilk i warg (42-P001) przechodzą do tego zamówienia** – zamiast arkuszy 2D prosimy od razu o modele 3D.
Jeżeli 2D jest już w drodze, przyślij, ale dalsza praca w 3D.

### B2. Postacie niezależne (drugi etap)

Plansze: `obecne_npc.png`, `obecne_mieszkancy.png`.

| # | Postać | Uwagi |
|---|---|---|
| 1 | **Mag Albrecht** | stary czarodziej w kapeluszu, laska; `talk`, `cast` |
| 2 | **Siostra Margo** | zakonnica |
| 3 | **Dziadek Marek** | |
| 4 | **Babcia Iwonka** | |
| 5 | **Babcia Grażynka** | ze wsi, ogrodniczka |
| 6 | **Luigi** | hiszpański macho (nie ten z Mario) |
| 7 | **Martin** | |
| 8 | **Woźnica** | ten sam model gra też **konduktora** i **kapitana portu** (inne kolory/czapka) |
| 9 | **Gazeciarz** | chłopiec z torbą gazet; `shout` (wymachuje gazetą) |
| 10 | **Sędzia Areny** | |
| 11 | **Mechaniczny Gladiator** | przeciwnik na Arenie; walczy jak bohater (miecz + tarcza) |
| 12 | **Biało-czarny pies** | czworonóg; `idle`, `walk`, `sit`, `wag` (merda ogonem) |
| 13 | **Mieszkańcy** – 15 wyglądów | kobieta, młoda kobieta, mieszczka, babcia, starsza pani, pan, pan z wąsem, młody mężczyzna, starszy pan, starszy pan w kapeluszu, chłopiec ×3 (różne), dziewczynka, dziewczynka z warkoczykami. Wystarczy **ok. 6–8 brył** (dziecko ch./dz., dorosły m./k., starszy m./k. + kapelusz/fryzury jako wymienne części) z podmienianymi kolorami. Z nich biorą wygląd też ludzie z misji (np. Hela Trybik) i „mądrale” z zagadkami. Rekwizyt: **parasol** (w deszczu). |

Bohater gracza: dziś każdy jest Strażnikiem. Kolejne wersje bohatera (łuczniczka, mag, wersje kobiece) –
tak jak pisałeś w README – to osobny wątek, nie w tym zamówieniu.

### B3. Smoki (trzeci etap)

Plansza: `obecne_smoki.png` (Twoje rysunki z 40-G002 – są dobre, chodzi tylko o przejście na 3D, żeby
obracały się płynnie jak Strażnik).

Smok **leśny, kwasowy, trujący, ognisty, górski** i **Cień smoka** (fabuła). Jeden wspólny szkielet smoka
(4 łapy, skrzydła, ogon, szyja), osobne głowy/kolce/kolory. Klipy: `idle`, `walk`, `bite`, `breathe`
(zionięcie – z węzłem `Snout` w pysku, stamtąd wylatuje ogień/kwas/dym), `takeoff`, `fly`, `land`, `death`.
Smok jest duży (ok. 6 wysokości bohatera długości) – budżet do ok. 10–15 tys. trójkątów.

### Kolejność i próba

1. Próba: **szkielet** i **wilk** (dwa różne rodzaje ciała), z klipami `idle/walk/attack/death`.
2. Po akceptacji: reszta B1 (lochy i ulice), potem B2, na końcu B3.

---

## Część C – lista zastępczych grafik (placeholdery)

Właściciel poprosił o pełną listę rzeczy, które w grze są dziś **narysowane kodem** albo **pożyczone od
innej postaci**. Nie wszystko jest pilne – kolumna „Priorytet” mówi, co najbardziej razi. Pozycje z
dopiskiem „zamówione” mają już osobne zamówienie – tu tylko dla porządku. Rzeczy w świecie = ilustracje
(zasady z części A), rzeczy żywe = 3D (część B), ikony = jak dotychczasowe ikony 32×32 ×2.

### C1. Postacie i stworki pożyczone od innych (→ część B, 3D)

| Co | Dziś | Priorytet |
|---|---|---|
| Wilk, warg | arkusz bandyty zabarwiony | wysoki (B1) |
| Upiór krypty | szkielet powiększony i rozjaśniony | wysoki (B1) |
| Wodnik | zombiak na niebiesko | średni (B1) |
| Wielki chochlik, Wielki herszt | zwykły chochlik/herszt powiększony | niski (wystarczy skala) |
| Konduktor przy pociągu | woźnica | średni (B2) |
| Kapitan portu | woźnica na granatowo | średni (B2) |
| Mędrzec/mędrczyni poza Lublinem (wędrowny mag) | Mag Albrecht | niski (B2) |
| Ludzie z misji (Hela Trybik, Maszynista Bolek…) i „mądrale” z zagadkami | wygląd losowego mieszkańca | niski – wystarczą mieszkańcy z B2 |
| Bohater: każdy jest Strażnikiem | jeden model | osobny wątek (łuczniczka, mag, kobiece wersje) |

### C2. Rzeczy w świecie rysowane kodem (→ ilustracje)

| Co | Gdzie w grze | Priorytet |
|---|---|---|
| Nagrobki, wejścia do krypt/katakumb, wnętrze lochu | cmentarze, świątynie, lochy | **wysoki** (część A) |
| Parasol przechodnia (z góry) | mieszkańcy w deszczu | średni |
| Zwinięta gazeta nad głową gazeciarza | gazeciarze | niski |
| Tablica z kotwicą przy porcie | porty | zamówione 37-P001 |
| Stragany kupca (rondo) i wózek targowy z latarnią | ronda | zamówione 37-P001 |
| Bujanie tablic innych niż sklep (dziś wychylane kodem) | szyldy na słupach | niski – 3 klatki jak tablica sklepu z 36-G002 |
| Wozy konne w 8 kierunkach, woźnica na koźle | dworce autobusowe | zamówione 34-P001 |
| Lokomotywa, tender, wagony (z prostego modelu kodem) | stacje kolejowe | średni – **dobry kandydat do 3D** jak stworki (obracają się po torze) |
| Kopczyk na szczycie z chorągiewką kraju | szczyty gór | niski |
| Znaki szlaku (kamień biało-czerwony, słupek, kopczyk) | szlaki w górach | niski |
| Głazy pod urwiskiem | strome zbocza | średni (z zamówieniem gór 16) |
| Żelazny most kolejowy (kratownice) | rzeki pod torami | niski |
| Mosiężny kocioł przy rurociągu ulicznym | ulice z rurami | średni |
| Kukurydza, słonecznik, chmiel na polach | pola | niski |
| Leżący przedmiot z misji (zguba) | prośby mieszkańców | średni |
| Chorągwie Areny na masztach przy boiskach, tablica przy bramie stadionu | stadiony | niski (z zamówienia 38 jest tylko wnętrze) |

### C3. Efekty i znaczniki (→ krótkie animacje 2D)

| Co | Gdzie | Priorytet |
|---|---|---|
| Cień smoka przelatującego nad miastem (fabuła) | początek historii | średni |
| Zapowiedzi ataków smoka: czerwony stożek, okrąg, pas | walka ze smokiem | niski (czytelne, ale „z kodu”) |
| Kula kwasu i kłąb trującego dymu (gdy brak Twoich efektów) | smoki | niski |
| Dym legowiska smoka (kłęby w kolorze gatunku) | legowiska | niski |
| Czerwone kłęby na granicy gangu + muszki | tereny gangów | niski |
| Niebieski dym zasięgu ruchu | walka turowa | niski |
| Złoty łuk zamachu, wachlarz ognia | ataki obszarowe | średni |
| Strzała i pocisk magii w locie | łuk, różdżka | średni |
| Ślad cięcia mieczem | każdy atak | średni |
| Dymek rozmowy i „!” nad głową | postacie z czymś do powiedzenia | średni |
| Znacznik misji (złoty i „zrobione”), złota poświata rzeczy do podniesienia | misje | średni |
| Złota poświata dojrzałych warzyw | pola | niski |
| Moneta i serce leżące na ziemi | łup | średni |

### C4. Ikony (→ 32×32 ×2, jak dotychczasowe)

| Co | Dziś | Priorytet |
|---|---|---|
| Przedmioty z fabuły „Serce Zębatka”: gwizdek maszynisty, kluczyk-nakręcacz, kieszonkowy chronometr, zegarek czeladnika, filtr aetherowy, klasztorny pochłaniacz, płaszcz cechmistrza, karabin „Trybunał”, pączek | emoji | **wysoki** (misje są na produkcji) |
| Hamburger (jarski, McDonald’s) | emoji | średni |
| Łuska smocza | kwadracik z kodu | średni |
| Kieł (łup z wilków) | brak | średni |
| Namiot, esencje (dąb, mróz) | emoji / rysunek z kodu | niski |
| Ataki w walce: Mocny atak (dziś złota poświata), Zamach, Salwa, Wachlarz ognia | piksele z kodu | średni |
| Szyld kupca na rondzie, warsztatu samochodowego, wytwórcy jedzenia | szyld zwykłego sklepu | niski |

### C5. HUD

| Co | Priorytet |
|---|---|
| Dwie rurki przy portrecie (życie, siły/mana) | zamówione 43-P001 |
| Portrety do rozmów dla postaci bez portretu | zamówione 35-P002 |

---

## Co jest w folderze `44_lochy_i_3d/`

| Plik | Co pokazuje |
|---|---|
| `teraz_cmentarz_unicka.png` | cmentarz przy Unickiej w Lublinie z grobami z kodu |
| `teraz_groby_x3.png` | groby z kodu powiększone ×3, z bohaterem i wejściem do krypty |
| `teraz_wejscie_katakumby.png`, `_x4.png` | dzisiejsze wejście (prostokąt z kodu) przy świątyni |
| `teraz_loch_walka.png`, `teraz_loch_telefon.png` | wnętrze lochu z kodu (komputer, telefon) |
| `teraz_loch_schody.png`, `teraz_loch_skrzynia.png` | schody w górę i skrzynia z kodu |
| `obecne_potworki.png` | wszystkie dzisiejsze potworki (przód, bok, tył) |
| `obecne_smoki.png` | sześć smoków (bok, przód) |
| `obecne_npc.png` | postacie stałe i pies |
| `obecne_mieszkancy.png` | 15 wyglądów mieszkańców |

Wzór modelu 3D: `public/modele/straznik.glb`, Twój opis `scripts/model3d/README_od_grafika.md`,
podgląd `scripts/model3d/straznik_podglad.html`.

## Jak odpowiedzieć

Plik `RRRR-MM-DD_44-G001_…md` w `od-grafika/` (nagłówek jak zwykle), pliki w paczce `44_…/`.
Przy każdym modelu podaj: liczbę trójkątów, nazwy klipów z długościami, nazwy węzłów chwytu.
