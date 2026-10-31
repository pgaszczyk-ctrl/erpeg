ID: 45-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel zlecił (31.10.2026: „chcę, żeby grafik je poprawił”)
Wykonanie: —
Dotyczy: ikony przedmiotów (ekwipunek, kufer, sklep, HUD)

# Zamówienie 45 – poprawa słabych ikon i brakujące przedmioty

Plansza wszystkich obecnych ikon (×2): `45_ikony/obecne_ikony_x2.png`.

## Format (jak ikony12)
- PNG 64×64 = siatka 32×32 powiększona ×2 (NEAREST), przezroczyste tło, twarda alfa (bez półprzezroczystych pikseli).
- Obrys 1 px (na siatce 32) w kolorze #1e1a24, najwyżej ~16 kolorów, światło z lewej góry.
- Wzorzec stylu (dobre, zostają): `tarcza_drewniana`, `tarcza_okuta`, `siekiera`, `kusza`, `pistolet_parowy`, `miecz_mosiezny`, `szabla_hartowana`, `karabela_damascenska`, `ogniwo`, `szklany_miecz`.
- Nazwa pliku = id przedmiotu (podane niżej), np. `korona.png`.
- Ikona musi być czytelna także w 32×32 px na telefonie – jedna wyraźna sylwetka, nie drobne detale.

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

## C. Inny styl niż reszta (dużo kolorów, wygładzenie)
Te są ładne, ale „malowane” – odstają od pikselowych. Właściciel woli szczegółowe ilustracje, jeśli są czytelne, więc proszę o propozycję: albo przerysować do stylu ikony12, albo uznać ten bardziej szczegółowy styl za docelowy i dorobić resztę w nim. Najpierw 2 próbki, decyzja właściciela.
- `zelazny_helm`, `zelazne_buty`, `skorzane_buty`, `podkowa_szczescia`, `cukierniczy_cylinder`
- nowe wersje: skórzana zbroja (`proby31/skorzana_zbroja.png`) i skórzany hełm (`sklepy/skorzany_helm.png`) – w tym samym duchu.

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
1. Próba: `rycerski`, `korona`, `kijek`, po jednej próbce stylu z części C → akceptacja właściciela.
2. Reszta A i B.
3. D (prolog i nagrody misji pierwsze), potem zasoby.
