ID: 45-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel zlecił (31.10.2026: „chcę, żeby grafik je poprawił”)
Wykonanie: —
Dotyczy: ikony przedmiotów (ekwipunek, kufer, sklep, HUD)
Wersja: 2 (31.10.2026 – wzór jakości: skórzana zbroja z paczki 31)

# Zamówienie 45 – poprawa słabych ikon i brakujące przedmioty

Plansza wszystkich obecnych ikon (×2): `45_ikony/obecne_ikony_x2.png`.

## Wzór jakości (decyzja właściciela, 31.10.2026)
**Wszystkie ikony mają dorównać skórzanej zbroi z paczki 31** – plik `45_ikony/WZOR_skorzana_zbroja_proby31.png` (w grze `public/proby31/skorzana_zbroja.png`).

Co w niej jest dobre i ma się powtórzyć w każdej ikonie:
- przedmiot wypełnia prawie cały kadr, pełna, masywna sylwetka (nie cienka kreska),
- pikselowy wygląd z dużymi, wyraźnymi pikselami (siatka ok. 45–50 px na szerokość ikony, nie 32 i nie 16),
- każdy materiał w 3–4 tonach (skóra: cień / środek / światło / odblask), światło z lewej góry,
- wyraźne detale, które mówią czym rzecz jest: klamry, nity, szwy, okucia – złoto/mosiądz jako akcent,
- gruby ciemny obrys (#1e1a24 albo bardzo ciemny brąz/fiolet), czytelny także w 32 px na telefonie,
- przezroczyste tło, bez ramki i cienia pod spodem.

## Format dostawy
- Oryginał w dużym rozmiarze jak wzór (kwadrat ok. 1024–1254 px), PNG z przezroczystością. Nie zmniejszamy go skryptem – gra pokazuje plik tak, jak przyjdzie.
- Jeśli możesz, dołącz też wersję „na siatce” (każdy duży piksel = 1 px), żeby dało się sprawdzić równość pikseli.
- Nazwa pliku = id przedmiotu (podane niżej), np. `korona.png`.
- Wszystkie ikony jednym stylem i w tej samej skali przedmiotu: miecz i hełm mają wyglądać jak z jednej gry.

## A. Bardzo słabe – stare 16×16 (najpilniejsze)
Rozmazane klocki, inny styl niż reszta.

| id | nazwa w grze | uwagi |
|---|---|---|
| `rycerski` | Rycerski miecz | dziś czarno-żółty pasek; długi miecz z krzyżowym jelcem |
| `swietlisty` | Świetlisty miecz (mityczny) | świecące ostrze, mocna poświata wewnątrz obrysu |
| `gromowladny` | Gromowładny miecz (mityczny) | ostrze z piorunem / iskrami |
| `kolczuga` | Kolczuga | dziś szara plama; widoczne kółka kolczugi |
| `korona` | Korona | dziś płaska żółta; złota, z kamieniami, rzadki przedmiot |
| `ksiega` | Księga zaklęć | dziś czerwony prostokąt; okładka z mosiężnymi okuciami, run/oko |
| `czapka_maga` | Magiczna czapka | spiczasta, gwiazdki, steampunkowe gogle opcjonalnie |
| `kapelusz` | Kapelusz Robin Hooda | zielony z piórem |

## B. Słabe – 64×64, ale do poprawy

| id | nazwa | co nie tak |
|---|---|---|
| `kijek` | Kijek (broń startowa) | wygląda jak zwykły patyk i jak materiał `kij`; ma być broń: owinięty rzemieniem uchwyt, sęk |
| `zelazny` | Miecz treningowy | cienki, płaski, mało detalu – wygląda słabiej niż mosiężny, choć to ten sam poziom drabiny |
| `stalowy` | Stalowy miecz | cienki, prawie identyczny z `zelazny`; ma się wyraźnie różnić (szersze ostrze, zbrocze) |
| `luk` / `luk_refleksyjny` / `dlugi_luk` | trzy łuki | prawie nie do odróżnienia, bardzo cienkie linie; każdy inna sylwetka (prosty / podwójnie wygięty z rogowymi końcami / długi z oplotem) |
| `rozdzka` | Różdżka | mała, drobna i z wieloma kolorami (wygładzona); grubsza, czytelna różdżka z kryształem |
| `kula` | Szklana kula | wygładzona, ~400 kolorów, inny styl; przerysować w pikselach |
| `zlom`, `zlom_miedziany` | złom | szum, nieczytelne – kilka wyraźnych części (trybik, rura, blacha) |

## C. Szczegółowe, ale do ujednolicenia ze wzorem
Te są bliżej wzoru niż reszta, ale wygładzone/„malowane” i w małym rozmiarze. Przerysować w stylu i rozmiarze zbroi z paczki 31:
- `zelazny_helm`, `zelazne_buty`, `skorzane_buty`, `podkowa_szczescia`, `cukierniczy_cylinder`
- `skorzany_helm` (dziś `sklepy/skorzany_helm.png`, 64 px) – zrobić jako komplet do skórzanej zbroi.

Tak samo dotyczy to ikon, które w pierwszej wersji listy uznałem za dobre (`tarcza_drewniana`, `siekiera`, `kusza`, `pistolet_parowy`, `miecz_mosiezny`, `szabla_hartowana`, `karabela_damascenska`, `szklany_miecz` + pęknięty i animacja pękania, amunicja, materiały, pojazdy). Są poprawne, ale słabsze od wzoru – idą na koniec kolejki, po częściach A, B i D.

## D. Przedmioty bez obrazka (dziś emoji albo pożyczony obrazek)

**Broń i wyposażenie z prologu (dziś pożyczają cudze obrazki):**
| id | nazwa | dziś używa |
|---|---|---|
| `miecz_rekruta` | Miecz ćwiczebny straży | `zelazny` |
| `luk_rekruta` | Stary łuk ćwiczebny | `luk` |
| `rozdzka_szkolna` | Różdżka szkoleniowa | `rozdzka` |
| `kapelusz_szkolny` | Kapelusz szkoleniowy | `czapka_maga` |

**Nagrody z misji (brak obrazka – w kufrze emoji):**
| id | nazwa | opis do rysunku |
|---|---|---|
| `karabin_trybunal` | Karabin „Trybunał” | parowy karabin wyborowy, mosiądz, luneta |
| `klasztorny_pochlaniacz` | Klasztorny pochłaniacz | zbroja/habit dominikański z filtrem na piersi |
| `plaszcz_cechmistrza` | Płaszcz Cechmistrza | płaszcz z naszywką cechu (zębatka) |
| `buty_biegacza` | Buty biegacza | lekkie buty z mosiężnym skrzydełkiem/sprężyną |
| `gwizdek_maszynisty` | Gwizdek Maszynisty | mosiężny gwizdek parowozu |
| `kluczyk_nakrecacz` | Kluczyk Nakręcacz | klucz do nakręcania z motylkiem |
| `kieszonkowy_chronometr` | Kieszonkowy Chronometr | zegarek kieszonkowy na łańcuszku |
| `zegarek_czeladnika` | Zegarek czeladnika | prostszy zegarek, widoczne trybiki |
| `filtr_aetherowy` | Filtr aetherowy | puszka filtra ze świecącym niebieskim wkładem |
| `zlota_pilka` | Złota piłka na łańcuszku | złota kulka na łańcuszku |
| `paczek` | Pączek | pączek z lukrem i skórką pomarańczową |
| `hamburger` | Burger warzywny | burger bez mięsa (sałata, pomidor, kotlet warzywny) |

**Zasoby i mikstury (dziś emoji albo rysowane kodem):**
| id | nazwa | dziś |
|---|---|---|
| `luska` | Łuska smocza | rysowana kodem |
| `kiel` | Kieł wilka | rysowany kodem, 8×8 |
| `mikstura` | Mikstura leczenia (Kufer → Zasoby) | emoji 🧪 (HUD ma swoją) |
| `esencja_dab` | Esencja dębu (flaszka) | emoji 🌳 |
| `esencja_mroz` | Esencja mrozu (flaszka) | emoji ❄️ |
| `namiot` | Namiot (sklep sportowy, kufer) | rysowany kodem |
| `grzyb`, `jablko`, `sliwka`, `winogrono`, `marchewka`, `brokul`, `salata` | pojedyncze zbiory w sklepie | stare małe tekstury / emoji |

## E. Opcjonalnie – jakości
Kijek, miecz treningowy, stalowy miecz i pancerze mają po 5 jakości (kiepski … mistrzowski), dziś z jednym obrazkiem. Wystarczy, jeśli zaproponujesz 5 kolorów ramki/poświaty jakości (rysujemy ją kodem), nie trzeba 5 wersji każdej ikony.

## Kolejność
1. Próba: `rycerski`, `korona`, `kijek`, `zelazny_helm` w stylu wzoru → akceptacja właściciela.
2. Reszta A, B i C.
3. D (prolog i nagrody misji pierwsze), potem zasoby.
4. Na koniec przerysowanie pozostałych obecnych ikon do poziomu wzoru (patrz koniec części C).
