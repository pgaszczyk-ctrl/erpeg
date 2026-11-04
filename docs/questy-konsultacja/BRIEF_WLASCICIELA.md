# Założenia właściciela i otwarte decyzje

Materiał z rozmowy „Questy”, uporządkowany 12.10.2026. To zapis wymagań i pomysłów, nie zamówienie wdrożenia całej paczki. Stan kodu sprawdzono w commicie `29d1b12f1935f31ee57b68019ae865befc4bf3c1`.

## Decyzja zmieniająca kierunek pracy

10.10.2026 właściciel odrzucił paczkę 12 przygotowanych questów: „cofnij te questy - są fatalne, muszę się na nich skupić sam a nie robić taką masówkę”. Paczka jest wyłączona. Obecne polecenie dotyczy umieszczenia danych w repo do konsultacji z projektantem i programistą. Nie jest zgodą na przywrócenie paczki, produkcję kolejnej serii ani zmianę głównego wątku.

## Cel i jakość przygody

- W świecie dzieje się zbyt mało. Większa liczba zadań ma wynikać z ciekawych czynności i historii.
- Właściciel chce unikać jednego powtarzanego schematu „zanieś, zabij, pójdź tam”.
- Początkowy pomysł: 30–50 schematów składowych, z których można zestawiać 1–5 elementów w prosty lub bardziej złożony quest. Powstało 40 propozycji; nie są zatwierdzonym generatorem.
- Po odrzuceniu paczki priorytetem jest indywidualne dopracowanie zadań przez właściciela. Liczba materiałów w archiwum nie jest celem publikacji.
- Pytanie o aktywizację co około minutę było punktem rozmowy. Traktować je jako hipotezę do sprawdzenia w tej grze, nie jako bezwarunkową zasadę projektowania.
- Mierzyć czas do sensownej czynności lub decyzji, nie samą liczbę okien dialogu. To pytanie do oceny projektu, a nie nowy mechanizm w kodzie.

## Ton i lore

Świat jest lekko steampunkowy: para, mosiądz, magia i smoki. Smoki pomagały zasilać technologię, zniknęły lub zapadły w sen, a teraz się budzą. Ton ma być pogodny, rodzinny, z odrobiną humoru i bez przesadnej pompatyczności. Lore wymaga uporządkowania; questy powinny korzystać ze wspólnego świata i jego wariantów.

Aktualny punkt odniesienia w kodzie: Pakt → Wojna o Tryby i ludzka chciwość → wygnanie/sen smoków → Kometa i przebudzenie. Część smoków cierpi na Rdzę Umysłu. Nie odwracać chronologii na podstawie wcześniejszego szkicu.

**Niespójność do uporządkowania przez autora:** sekcja 4 w `docs/swiat-dla-autora.md` opisuje wcześniejszy pomysł, w którym Kometa usypia smoki. Dopisek „Ustalone w lore v1.1” w sekcji 5 oraz `src/content/historia.ts` mówią o przebudzeniu przez Kometę. Nie przedstawiać tych wersji jako jednej zgodnej opowieści. Starszy `docs/lore-zarys.md` jest oznaczony jako opis wersji 1.006.

Pomysły właściciela, które nie są pełną specyfikacją: steampunkowe androidy i pomagierzy; nawiązanie do rozwoju AI; możliwość wskrzeszenia lub mechanicznego „poprawienia” bohatera, z RoboCopem jako luźnym skojarzeniem. Ich sposób przedstawienia, znaczenie w rozgrywce i miejsce w lore pozostają do ustalenia, z uwzględnieniem dziecięcego odbiorcy.

## Początek głównej historii

- Właściciel chce, żeby historia angażowała wcześniej; wskazał zastój przed poziomem 5.
- Początek ma działać uniwersalnie w różnych krajach. Lublin i Hongkong są przykładami z rozmowy.
- „Serce Zębatka” jest lokalną historią promocyjną Lublina; nie ma pełnić roli uniwersalnego początku świata.
- Początek może dziać się wszędzie, ale ma kierować do ośrodka ludzkiego. Właściciel nie chce rozpoczynania sensownego questa pośrodku pustyni.
- Dworzec, ratusz/urząd, świątynia, sklep i NPC to powtarzalne role miejsc, nie obowiązkowy zestaw budynków w każdym kraju. Brak danego rodzaju miejsca wymaga sensownego wariantu lub pominięcia treści.
- Pomysł startu w miastach powyżej około 40 tys. mieszkańców i przeniesienia punktu startu nowej postaci z mniejszej miejscowości do odpowiedniego miasta jest do rozstrzygnięcia. Nie ma zgody na automatyczne przenoszenie istniejących zapisów.

**Stan na 12.10.2026:** kod nadal ma `HISTORIA.mag.wymaganyPoziom = 5` i `sekundDoCienia = 60`. Nowy prolog, próg ludności i komplet nowych reguł startu nie zostały wdrożone przez tę paczkę.

## Geografia i tempo

Schematy powinny wykorzystywać rzeczywiście dostępne miejsca: miasto, pobliską wieś, zieleń, wodę, most lub szczyt, jeśli istnieją i są osiągalne. Nie zakładać, że każda okolica ma jezioro czy górę; nie wymyślać ich jako zamiennika.

W rozmowie właściciel podał około 70 km/h prędkości chodzenia awatara i rozważał 50 km/h, gdy będzie więcej treści. To dane z rozmowy, nie pomiar aktualnych ustawień ani prędkości fizycznego spaceru gracza. Przy 50 km/h awatar pokonuje około 833 m/min, przy 70 km/h około 1167 m/min. Długość rzeczywistej trasy i czas czytania/czynności trzeba ocenić osobno.

Proponowana gęstość podaży: kwadrat 1×1 km w centrum — około 4 nowe questy, sąsiednie pola — 1–2, dalsze odpowiednie pola — około 1. Właściciel zaznaczył, że liczbę ustali później. Nie ustalono harmonogramu dziennego odradzania ani docelowej siatki świata.

Historyczny planner ma kontrolę co najmniej 6 miejsc / 2 rodzajów w promieniu 1 km, budżet trasy i limit 4 ofert na pole w jednym przebiegu. To dostępność mapy, nie liczba mieszkańców. Obecnie nie planuje wycofanej paczki.

## Tożsamość questa i zapis

Ten sam jednorazowy quest przyjęty albo ukończony w Puławach nie powinien pojawić się ponownie w Lublinie. Zmiana miasta nie ma tworzyć drugiej instancji. Zmiana języka i ponowne logowanie nie mogą zmieniać punktów, etapu ani dokonanych wyborów.

Mechanizm wycofanej paczki używał stabilnych ID `quest.*`, `save.missions`, `save.gen`, `save.etap`, `questResults` i wiązania miasta/punktów. Wycofanie nie usuwa zapisanych danych. Starsze zlecenia losowe `gen-*` pozostają osobnym systemem; nie należy automatycznie nazywać ich jednorazowymi. Decyzja o powtarzalności przyszłych questów wymaga świadomej specyfikacji.

## Języki i humor

Każdy dialog ma mieć język i oznaczenie lokalnego humoru. Gdy żart jest zależny od języka, tłumacz powinien znaleźć odpowiednią puentę w języku docelowym, zamiast przekładać dosłownie. Preferencja języka nie wynika z miasta.

W archiwum są warianty PL/EN i pola `language`, `localHumor`, `text`. Edytor etapów ma język i checkbox humoru. Do oceny są również przyciski, opcje, podpowiedzi i reakcje, nie tylko główny monolog. Zachowujemy właściwe nazwy realnych miejsc. Nie należy uznawać archiwum 515 rekordów za pełne tłumaczenie interfejsu, sklepów, quizów i wszystkich danych serwera.

## Osiągnięcia i późniejsze wyprawy

- Właściciel chce ambitniejszych progów dystansu: między innymi 1 km, 100 km i diamentowy poziom „Okrążenie Ziemi” — 40 075 km.
- **Sprawdzone w kodzie:** wpis `ziemia` z celem 40075 jest w `src/content/osiagniecia.ts`; były i pozostały również progi 1, 25 i 100 km. Inne stopnie proponowane w katalogu nie są automatycznie istniejącymi odznakami.
- Odwiedzone kontynenty, Everest oraz bieguny północny i południowy to pomysły przyszłościowe. Tytuły i postacie wręczające je wymagają ustalenia. Dr Strange był hasłowym przykładem z rozmowy, a nie zatwierdzoną postacią tej gry.
- Wyprawy odnoszą się do awatara na mapie. Katalog nie włącza globalnego śledzenia kontynentów ani takich ekspedycji.

## Kolejność dalszej konsultacji

1. Właściciel i projektant wybierają jeden problem do rozwiązania i jeden quest lub fragment prologu do dopracowania.
2. Projektant opisuje sens historii, czynność gracza, wskazówki i rezultat — bez założenia, że każdy istniejący schemat jest wartościowy.
3. Programista ocenia wymagane miejsca, aktualne mechaniki, zapis/identyfikatory i rzeczywisty zakres implementacji.
4. Właściciel zatwierdza konkretną wersję przed nowym wdrożeniem. Obecna prośba kończy się przekazaniem dokumentacji.
