ID: 45-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel zlecił 31.10.2026 („chcę, żeby grafik je poprawił”; wzór: „dążymy do jakości skórzanej zbroi by31”)
Wykonanie: —
Dotyczy: ikony przedmiotów (Kufer, skrzynia, sklep, dialogi, koło walki, broń w ręce)
Wersja: 3 (31.10.2026) – kompletna paczka referencyjna; zastępuje wersje 1 i 2

# Zamówienie 45 – ikony przedmiotów w jakości skórzanej zbroi

## Teraz rysujesz tylko PRÓBĘ 1
**`rycerski`, `korona`, `kijek`, `zelazny_helm`** – pokazane obok wzorcowej zbroi (szablon: `podglady/proba1_szablon_DZIS.png`).
Dalsze rysowanie dopiero po akceptacji wyglądu przez właściciela.

## Zawartość paczki
| Plik / folder | Co to jest |
|---|---|
| `CZYTAJ_MNIE.md` | ten opis |
| `wzor/skorzana_zbroja_proby31_ORYGINAL.png` | **wzór jakości** – oryginał bajt w bajt (`public/proby31/skorzana_zbroja.png`, 1254×1254) |
| `wzor/skorzana_zbroja_DOCELOWY_FORMAT_64.png` (+ `_x16.png`) | ten sam wzór przeliczony na docelowy format 64×64 – tak mają wyglądać Twoje pliki |
| `wzor/pomiar_siatki_wycinek_x4.png` | wycinek oryginału pokazujący nierówną siatkę |
| `plansza_obecnych_ikon.png` | wszystkie obecne ikony z podpisami (plik, rozmiar, nazwa w grze; czerwone = stare 16×16) |
| `obecne/` | obecne pliki ikon (do porównania, nie do poprawiania na nich) |
| `podglady/podglad_rozmiary_gry.png` | wzór i 4 ikony próby w rozmiarach, w jakich pokazuje je gra |
| `podglady/proba1_szablon_DZIS.png` | układ planszy próby: wzór + 4 ikony, pod spodem 32 px |
| `podglad_prob.html` | otwórz w przeglądarce, upuść swoje PNG: pokaże je w rozmiarach z gry obok wzoru i sprawdzi format |
| `lista_przedmiotow.csv` | pełna lista (to samo co tabele niżej), do otwarcia w arkuszu |

## 1. Pomiar wzoru (skórzana zbroja, paczka 31)
- Plik: 1254×1254 px, RGBA.
- Przedmiot zajmuje 1015×994 px (x 116–1130, y 141–1134), czyli ok. 81 % kadru; margines ok. 9 % z każdej strony.
- **Siatka pikseli jest nierówna:** „duże piksele” mają od 11 do 16 px (średnio ok. 14,7 px), więc przedmiot ma ok. 69 dużych pikseli szerokości. Obraz jest wygenerowany „w stylu pixel artu”, a nie narysowany na siatce.
- Przezroczystość nie jest twarda: wnętrze ma alfę 250–254 (nie 255), krawędzie są miękkie (ok. 17 000 półprzezroczystych pikseli), w środku ok. 56 000 odcieni (szum i gradienty).

**Wniosek:** bierzemy z niego wygląd (pełna sylwetka, 3–4 tony na materiał, klamry/nity/szwy, złoty akcent, gruby ciemny obrys, światło z lewej góry), ale **nie format pliku**. Ten sam wzór przeliczony na siatkę 64×64 (`wzor/..._DOCELOWY_FORMAT_64.png`, 31 kolorów) wygląda w grze praktycznie tak samo – zobacz pierwsze dwa wiersze `podglady/podglad_rozmiary_gry.png`.

## 2. Dokładny format nowych ikon
| Cecha | Wymaganie |
|---|---|
| Rozmiar pliku | **dokładnie 64×64 px**, PNG RGBA |
| Siatka | 1 piksel pliku = 1 piksel rysunku (bez skalowania, bez „dużych pikseli” złożonych z kilku pikseli) |
| Przezroczystość | tylko 0 albo 255 – zero półprzezroczystych pikseli, bez wygładzania krawędzi |
| Margines | **4 px pustego pola z każdej strony**: cały rysunek łącznie z obrysem w polu x 4–59, y 4–59 (56×56) |
| Wypełnienie | rysunek dotyka pola 56×56 co najmniej z dwóch przeciwległych stron (szerokość lub wysokość ≥ 51 px) |
| Położenie | wyśrodkowany; **broń po przekątnej: rękojeść w lewym dolnym rogu, czubek w prawym górnym** (gra obraca obrazek wokół dłoni przy ciosie – inaczej miecz poleci odwrotnie) |
| Obrys | 1 px, kolor #1e1a24, zamknięty dookoła sylwetki |
| Kolory | najwyżej 48 na ikonę (wzór w 64×64 ma 31); 3–4 tony na materiał; światło z lewej góry |
| Tło | brak – bez ramki, bez cienia pod przedmiotem, bez poświaty poza obrysem |
| Do oceny | dodatkowo `<id>_x16.png` = ta sama ikona powiększona dokładnie ×16 bez wygładzania (1024×1024) |
| Animacja (tylko `szklany_miecz_peka`) | pasek 256×64 = 4 klatki po 64×64, ta sama kotwica w każdej klatce |
| Nazwa | `<id>.png`, id dokładnie jak w tabelach (małe litery, bez polskich znaków) |

## 3. Jak gra skaluje ikony
- Gra pokazuje plik 64×64 w rozmiarze podanym niżej (w pikselach CSS). Telefony mają ekran ×2–×3, więc 32 px CSS = 64–96 prawdziwych pikseli – stąd siatka 64: na telefonie w rozmiarze 32 px każdy piksel rysunku to dokładnie 1 piksel ekranu.
- Powiększanie: bez wygładzania (piksele zostają ostre). Zmniejszanie poniżej 64 pikseli ekranu: uśrednianie (tak wygląda `podglad_rozmiary_gry.png`). Programista przełączy to w grze przy wdrażaniu nowych ikon (dziś gra zawsze skaluje bez wygładzania, co przy zmniejszaniu gubi piksele).
- Twój plik nie jest już przeliczany skryptem: idzie do gry bez zmian.

## 4. Rozmiary w grze
| Miejsce | Rozmiar ikony (px CSS) |
|---|---|
| Kufer – plecak i ekwipunek (komputer) | ok. 36 (⅔ komórki 54 px) |
| Kufer – telefon poziomo | 16–29 (plecak), do 42 (postać) |
| Kufer – karta przedmiotu | 34 (telefon 26) |
| Kufer – karta broni | 112 (telefon 76) |
| Kufer – Zasoby (amunicja, diament) | 24 |
| Skrzynia w domu / hotelu | ok. 37 |
| Sklep – siatka towarów | ok. 45–60 (komórka bez ramki) |
| Sklep – podgląd wybranego | 160 (telefon 72) |
| Sklep – zakładki kategorii | 30 (telefon 27) |
| Dialogi (biblioteka, sklep budowlany, warsztat) | 32 |
| Koło walki turowej – broń | 26 (przy bohaterze), 38 (przy wrogu) |
| HUD-kocioł (stary, tylko na życzenie) – okno broni | 16 (×2 na komputerze) |
| Broń w ręce przy ciosie (świat) | ok. 9 px mapy × zoom ≈ 35–70 pikseli ekranu, obrócona |

**Najważniejszy jest 32 px** – ikona musi być w nim czytelna: jedna wyraźna sylwetka, detale wspierają kształt, nie zastępują go. Sprawdzaj w `podglad_prob.html`.

## 5. Kolejność prac
1. **Próba 1:** `rycerski`, `korona`, `kijek`, `zelazny_helm` – plansza obok wzoru (jak `podglady/proba1_szablon_DZIS.png`) + 4 pliki 64×64 + `_x16`. → akceptacja właściciela.
2. **A i B:** reszta starych 16×16 i słabe 64×64.
3. **D:** przedmioty, które nie mają własnego obrazka (najpierw prolog i nagrody misji, potem zasoby).
4. **C:** ujednolicenie szczegółowych w innym stylu (C1), potem pozostałe obecne ikony do poziomu wzoru (C2: broń, tarcze, amunicja, materiały, pojazdy, zbiory).

Każdy etap po akceptacji poprzedniego. Wysyłaj w paczkach po etapie, z planszą poglądową.

`skorzana_zbroja` nie rysujesz – to wzór; programista wstawi jego wersję 64×64.

Jakości (kiepski … mistrzowski) dla mieczy i pancerzy dzielą jeden obrazek – nie rysujesz wersji; ewentualną ramkę jakości zrobi kod.

## 6. Pełna lista przedmiotów (93)
„Docelowy plik”: `<id>.png` 64×64 + `<id>_x16.png` do oceny.

### PRÓBA 1 (tylko to, potem akceptacja właściciela)

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 1 | `rycerski` | Rycerski miecz | broń | items/rycerski.png 16×16 | `rycerski.png + rycerski_x16.png` | długi miecz, krzyżowy jelec |
| 2 | `korona` | Korona | głowa | items/korona.png 16×16 | `korona.png + korona_x16.png` | złota, z kamieniami, rzadka |
| 3 | `kijek` | Kijek | broń | items/kijek.png 64×64 | `kijek.png + kijek_x16.png` | broń startowa – rzemień na uchwycie, sęk; ma się różnić od materiału kij |
| 4 | `zelazny_helm` | Żelazny hełm | głowa | items/zelazny_helm.png 64×64 | `zelazny_helm.png + zelazny_helm_x16.png` | żelazny hełm z nosalem, nity |

### A – bardzo słabe (stare 16×16)

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 5 | `swietlisty` | Świetlisty miecz | broń | items/swietlisty.png 16×16 | `swietlisty.png + swietlisty_x16.png` | mityczny, świecące ostrze |
| 6 | `gromowladny` | Gromowładny miecz | broń | items/gromowladny.png 16×16 | `gromowladny.png + gromowladny_x16.png` | mityczny, ostrze z piorunem |
| 7 | `kolczuga` | Kolczuga | zbroja | items/kolczuga.png 16×16 | `kolczuga.png + kolczuga_x16.png` | widoczne kółka |
| 8 | `ksiega` | Księga zaklęć | druga ręka | items/ksiega.png 16×16 | `ksiega.png + ksiega_x16.png` | mosiężne okucia, run/oko |
| 9 | `czapka_maga` | Magiczna czapka | głowa | items/czapka_maga.png 16×16 | `czapka_maga.png + czapka_maga_x16.png` | spiczasta, gwiazdki |
| 10 | `kapelusz` | Kapelusz Robin Hooda | głowa | items/kapelusz.png 16×16 | `kapelusz.png + kapelusz_x16.png` | zielony z piórem |

### B – słabe 64×64

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 11 | `zelazny` | Miecz treningowy | broń | items/zelazny.png 64×64 | `zelazny.png + zelazny_x16.png` | miecz treningowy – szerszy, czytelny |
| 12 | `stalowy` | Stalowy miecz | broń | items/stalowy.png 64×64 | `stalowy.png + stalowy_x16.png` | wyraźnie inny niż treningowy (zbrocze, szersze ostrze) |
| 13 | `luk` | Łuk | broń | items/luk.png 64×64 | `luk.png + luk_x16.png` | prosty łuk |
| 14 | `luk_refleksyjny` | Łuk refleksyjny | broń | items/luk_refleksyjny.png 64×64 | `luk_refleksyjny.png + luk_refleksyjny_x16.png` | podwójnie wygięty, rogowe końce |
| 15 | `dlugi_luk` | Długi łuk | broń | items/dlugi_luk.png 64×64 | `dlugi_luk.png + dlugi_luk_x16.png` | długi z oplotem |
| 16 | `rozdzka` | Różdżka | broń | items/rozdzka.png 64×64 | `rozdzka.png + rozdzka_x16.png` | grubsza, z kryształem |
| 17 | `kula` | Szklana kula | druga ręka | items/kula.png 64×64 | `kula.png + kula_x16.png` | szklana kula na podstawce |
| 18 | `zlom` | Złom | plecak/zasoby | items/zlom.png 64×64 | `zlom.png + zlom_x16.png` | trybik, rura, blacha |
| 19 | `zlom_miedziany` | Złom miedziany | plecak/zasoby | items/zlom_miedziany.png 64×64 | `zlom_miedziany.png + zlom_miedziany_x16.png` | miedziane części |

### D – brak własnego obrazka

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 20 | `miecz_rekruta` | Miecz ćwiczebny straży | broń | pożycza zelazny.png | `miecz_rekruta.png + miecz_rekruta_x16.png` | prosty miecz straży, drewniana rękojeść |
| 21 | `luk_rekruta` | Stary łuk ćwiczebny | broń | pożycza luk.png | `luk_rekruta.png + luk_rekruta_x16.png` | stary, połatany łuk |
| 22 | `rozdzka_szkolna` | Różdżka szkoleniowa | broń | pożycza rozdzka.png | `rozdzka_szkolna.png + rozdzka_szkolna_x16.png` | prosta szkolna różdżka |
| 23 | `kapelusz_szkolny` | Kapelusz szkoleniowy | głowa | pożycza czapka_maga.png | `kapelusz_szkolny.png + kapelusz_szkolny_x16.png` | prosty kapelusz ucznia |
| 24 | `karabin_trybunal` | Karabin „Trybunał” | broń | brak – emoji/ogólny znak | `karabin_trybunal.png + karabin_trybunal_x16.png` | parowy karabin wyborowy, mosiądz, luneta |
| 25 | `klasztorny_pochlaniacz` | Klasztorny pochłaniacz | zbroja | brak – emoji/ogólny znak | `klasztorny_pochlaniacz.png + klasztorny_pochlaniacz_x16.png` | habit/zbroja z filtrem na piersi |
| 26 | `plaszcz_cechmistrza` | Płaszcz Cechmistrza | zbroja | brak – emoji/ogólny znak | `plaszcz_cechmistrza.png + plaszcz_cechmistrza_x16.png` | płaszcz z naszywką zębatki |
| 27 | `buty_biegacza` | Buty biegacza | buty | brak – emoji/ogólny znak | `buty_biegacza.png + buty_biegacza_x16.png` | lekkie, mosiężne skrzydełko/sprężyna |
| 28 | `gwizdek_maszynisty` | Gwizdek Maszynisty | talizman/plecak | brak – emoji/ogólny znak | `gwizdek_maszynisty.png + gwizdek_maszynisty_x16.png` | mosiężny gwizdek parowozu |
| 29 | `kluczyk_nakrecacz` | Kluczyk Nakręcacz | talizman/plecak | brak – emoji/ogólny znak | `kluczyk_nakrecacz.png + kluczyk_nakrecacz_x16.png` | klucz z motylkiem |
| 30 | `kieszonkowy_chronometr` | Kieszonkowy Chronometr | talizman/plecak | brak – emoji/ogólny znak | `kieszonkowy_chronometr.png + kieszonkowy_chronometr_x16.png` | zegarek kieszonkowy na łańcuszku |
| 31 | `zegarek_czeladnika` | Zegarek czeladnika | talizman/plecak | brak – emoji/ogólny znak | `zegarek_czeladnika.png + zegarek_czeladnika_x16.png` | prostszy zegarek, widać trybiki |
| 32 | `filtr_aetherowy` | Filtr aetherowy | talizman/plecak | brak – emoji/ogólny znak | `filtr_aetherowy.png + filtr_aetherowy_x16.png` | puszka filtra, niebieski wkład |
| 33 | `zlota_pilka` | Złota piłka na łańcuszku | talizman/plecak | brak – emoji/ogólny znak | `zlota_pilka.png + zlota_pilka_x16.png` | złota kulka na łańcuszku |
| 34 | `paczek` | Pączek | talizman/plecak | brak – emoji/ogólny znak | `paczek.png + paczek_x16.png` | z lukrem i skórką pomarańczową |
| 35 | `hamburger` | Burger warzywny | talizman/plecak | brak – emoji/ogólny znak | `hamburger.png + hamburger_x16.png` | bez mięsa: sałata, pomidor, kotlet warzywny |
| 36 | `luska` | Łuska smocza | plecak/zasoby | rysowana kodem | `luska.png + luska_x16.png` | łuska smocza |
| 37 | `kiel` | Kieł wilka | plecak/zasoby | rysowany kodem 8×8 | `kiel.png + kiel_x16.png` | zakrzywiony kieł |
| 38 | `mikstura` | Mikstura leczenia | plecak/zasoby | emoji 🧪 | `mikstura.png + mikstura_x16.png` | czerwona flaszka leczenia |
| 39 | `esencja_dab` | Esencja dębu (flaszka) | plecak/zasoby | emoji 🌳 | `esencja_dab.png + esencja_dab_x16.png` | flaszka, zielony płyn, liść dębu |
| 40 | `esencja_mroz` | Esencja mrozu (flaszka) | plecak/zasoby | emoji ❄️ | `esencja_mroz.png + esencja_mroz_x16.png` | flaszka, błękitny płyn, szron |
| 41 | `namiot` | Namiot | plecak/zasoby | rysowany kodem | `namiot.png + namiot_x16.png` | zwinięty namiot z masztem |
| 42 | `jablko` | Jabłko | plecak/zasoby | stara tekstura 8 px | `jablko.png + jablko_x16.png` |  |
| 43 | `sliwka` | Śliwka | plecak/zasoby | stara tekstura 8 px | `sliwka.png + sliwka_x16.png` |  |
| 44 | `winogrono` | Winogrono | plecak/zasoby | stara tekstura 8 px | `winogrono.png + winogrono_x16.png` |  |
| 45 | `marchewka` | Marchewka | plecak/zasoby | stara tekstura 8 px | `marchewka.png + marchewka_x16.png` |  |
| 46 | `brokul` | Brokuł | plecak/zasoby | stara tekstura 8 px | `brokul.png + brokul_x16.png` |  |
| 47 | `salata` | Sałata | plecak/zasoby | stara tekstura 8 px | `salata.png + salata_x16.png` |  |
| 48 | `grzyb` | Grzyb | plecak/zasoby | stara tekstura 8 px | `grzyb.png + grzyb_x16.png` |  |

### C1 – szczegółowe, ale w innym stylu

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 49 | `skorzany_helm` | Skórzany hełm | głowa | sklepy/skorzany_helm.png 64×64 · stary items/skorzany_helm.png 16×16 | `skorzany_helm.png + skorzany_helm_x16.png` |  |
| 50 | `zelazne_buty` | Żelazne buty | buty | items/zelazne_buty.png 64×64 | `zelazne_buty.png + zelazne_buty_x16.png` |  |
| 51 | `skorzane_buty` | Skórzane buty | buty | items/skorzane_buty.png 64×64 | `skorzane_buty.png + skorzane_buty_x16.png` |  |
| 52 | `podkowa_szczescia` | Podkowa Szczęścia | talizman/plecak | items/podkowa_szczescia.png 64×64 | `podkowa_szczescia.png + podkowa_szczescia_x16.png` |  |
| 53 | `cukierniczy_cylinder` | Cukierniczy Cylinder | głowa | items/cukierniczy_cylinder.png 64×64 | `cukierniczy_cylinder.png + cukierniczy_cylinder_x16.png` |  |

### C2 – broń i tarcze (poprawne, do poziomu wzoru)

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 54 | `miecz_mosiezny` | Mosiężny miecz | broń | items/miecz_mosiezny.png 64×64 | `miecz_mosiezny.png + miecz_mosiezny_x16.png` |  |
| 55 | `szabla_hartowana` | Szabla hartowana | broń | items/szabla_hartowana.png 64×64 | `szabla_hartowana.png + szabla_hartowana_x16.png` |  |
| 56 | `karabela_damascenska` | Karabela damasceńska | broń | items/karabela_damascenska.png 64×64 | `karabela_damascenska.png + karabela_damascenska_x16.png` |  |
| 57 | `szklany_miecz` | Szklany miecz | broń | items/szklany_miecz.png 64×64 | `szklany_miecz.png + szklany_miecz_x16.png` |  |
| 58 | `szklany_miecz_pekniety` | Szklany miecz – pęknięty | plecak/zasoby | items/szklany_miecz_pekniety.png 64×64 | `szklany_miecz_pekniety.png + szklany_miecz_pekniety_x16.png` |  |
| 59 | `szklany_miecz_peka` | Szklany miecz – animacja pękania (4 klatki) | plecak/zasoby | items/szklany_miecz_peka.png 256×64 | `szklany_miecz_peka.png (256×64)` | 4 klatki po 64×64 w jednym pasku 256×64 |
| 60 | `siekiera` | Siekiera | broń | items/siekiera.png 64×64 | `siekiera.png + siekiera_x16.png` |  |
| 61 | `tarcza_drewniana` | Tarcza drewniana | druga ręka | items/tarcza_drewniana.png 64×64 | `tarcza_drewniana.png + tarcza_drewniana_x16.png` |  |
| 62 | `tarcza_okuta` | Tarcza okuta | druga ręka | items/tarcza_okuta.png 64×64 | `tarcza_okuta.png + tarcza_okuta_x16.png` |  |
| 63 | `kusza` | Kusza | broń | items/kusza.png 64×64 | `kusza.png + kusza_x16.png` |  |
| 64 | `pistolet_parowy` | Pistolet parowy | broń | items/pistolet_parowy.png 64×64 | `pistolet_parowy.png + pistolet_parowy_x16.png` |  |

### C2 – amunicja

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 65 | `strzaly` | Strzały | plecak/zasoby | items/strzaly.png 64×64 | `strzaly.png + strzaly_x16.png` |  |
| 66 | `belty` | Bełty | plecak/zasoby | items/belty.png 64×64 | `belty.png + belty_x16.png` |  |
| 67 | `naboje` | Naboje | plecak/zasoby | items/naboje.png 64×64 | `naboje.png + naboje_x16.png` |  |
| 68 | `ladunek_magii` | Ładunek magii (jeszcze nieużywany) | plecak/zasoby | items/ladunek_magii.png 64×64 | `ladunek_magii.png + ladunek_magii_x16.png` |  |

### C2 – materiały

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 69 | `drewno` | Drewno | plecak/zasoby | items/drewno.png 64×64 | `drewno.png + drewno_x16.png` |  |
| 70 | `chrust` | Chrust | plecak/zasoby | items/chrust.png 64×64 | `chrust.png + chrust_x16.png` |  |
| 71 | `kij` | Kij (materiał na łuk, nie broń) | plecak/zasoby | items/kij.png 64×64 | `kij.png + kij_x16.png` |  |
| 72 | `wegiel` | Węgiel | plecak/zasoby | items/wegiel.png 64×64 | `wegiel.png + wegiel_x16.png` |  |
| 73 | `ruda_zelaza` | Ruda żelaza | plecak/zasoby | items/ruda_zelaza.png 64×64 | `ruda_zelaza.png + ruda_zelaza_x16.png` |  |
| 74 | `miedz` | Miedź | plecak/zasoby | items/miedz.png 64×64 | `miedz.png + miedz_x16.png` |  |
| 75 | `piasek` | Piasek | plecak/zasoby | items/piasek.png 64×64 | `piasek.png + piasek_x16.png` |  |
| 76 | `odlamek_komety` | Odłamek komety | plecak/zasoby | items/odlamek_komety.png 64×64 | `odlamek_komety.png + odlamek_komety_x16.png` |  |
| 77 | `sztaba_zelaza` | Sztaba żelaza | plecak/zasoby | items/sztaba_zelaza.png 64×64 | `sztaba_zelaza.png + sztaba_zelaza_x16.png` |  |
| 78 | `sztaba_stali` | Sztaba stali | plecak/zasoby | items/sztaba_stali.png 64×64 | `sztaba_stali.png + sztaba_stali_x16.png` |  |
| 79 | `sztaba_mosiadzu` | Sztaba mosiądzu | plecak/zasoby | items/sztaba_mosiadzu.png 64×64 | `sztaba_mosiadzu.png + sztaba_mosiadzu_x16.png` |  |
| 80 | `szklo` | Szkło | plecak/zasoby | items/szklo.png 64×64 | `szklo.png + szklo_x16.png` |  |
| 81 | `ogniwo` | Ogniwo (pełne) | plecak/zasoby | items/ogniwo.png 64×64 | `ogniwo.png + ogniwo_x16.png` |  |
| 82 | `ogniwo_puste` | Ogniwo (puste) | plecak/zasoby | items/ogniwo_puste.png 64×64 | `ogniwo_puste.png + ogniwo_puste_x16.png` |  |
| 83 | `kilof` | Kilof | plecak/zasoby | items/kilof.png 64×64 | `kilof.png + kilof_x16.png` |  |
| 84 | `diament` | Diament | plecak/zasoby | items/diament.png 64×64 | `diament.png + diament_x16.png` |  |

### C2 – pojazdy

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 85 | `rower` | Welocyped parowy | talizman/plecak | items/rower.png 64×64 | `rower.png + rower_x16.png` |  |
| 86 | `hulajnoga_parowa` | Hulajnoga parowa | talizman/plecak | items/hulajnoga_parowa.png 64×64 | `hulajnoga_parowa.png + hulajnoga_parowa_x16.png` |  |

### C2 – zbiory i grupy plecaka

| # | ID | Nazwa w grze | Gdzie | Obecny plik | Docelowy plik | Uwagi |
|---|---|---|---|---|---|---|
| 87 | `grupa_owoce` | Grupa w plecaku: owoce | plecak/zasoby | items/grupa_owoce.png 64×64 | `grupa_owoce.png + grupa_owoce_x16.png` |  |
| 88 | `grupa_warzywa` | Grupa w plecaku: warzywa | plecak/zasoby | items/grupa_warzywa.png 64×64 | `grupa_warzywa.png + grupa_warzywa_x16.png` |  |
| 89 | `grupa_grzyby` | Grupa w plecaku: grzyby | plecak/zasoby | items/grupa_grzyby.png 64×64 | `grupa_grzyby.png + grupa_grzyby_x16.png` |  |
| 90 | `ziemniak` | Ziemniak | plecak/zasoby | roślina z pola (uprawy/) | `ziemniak.png + ziemniak_x16.png` |  |
| 91 | `kapusta` | Kapusta | plecak/zasoby | roślina z pola (uprawy/) | `kapusta.png + kapusta_x16.png` |  |
| 92 | `burak` | Burak | plecak/zasoby | roślina z pola (uprawy/) | `burak.png + burak_x16.png` |  |
| 93 | `dynia` | Dynia | plecak/zasoby | roślina z pola (uprawy/) | `dynia.png + dynia_x16.png` |  |
