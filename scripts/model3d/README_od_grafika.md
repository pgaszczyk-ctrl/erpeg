# EXP-LORE — Strażnik: spójny model 3D i płaskorzeźba

To nowa próba na jednej postaci: oryginalnym strażniku 16 z erpeg. Celem jest usunięcie deformacji i mieszania detali przy obrocie między przodem a profilem.

Otwórz output/EXP-LORE_straznik_pelny_model.html. Zawiera wszystkie zasoby, działa offline w przeglądarce z WebGL. Przełączniki: pełne 3D / płaskorzeźba, spoczynek / atak / chód / garda, obrót automatyczny, pauza ruchu. Kierunek można ustawić przyciskami, suwakiem lub przeciągnięciem. Kąty wyświetlane są w zakresie -180–180 stopni.

## Poprawka ramion — wersja 2

Barki obniżono o 3 jednostki modelu i zwężono ich rozstaw o 15%. Łokcie, nadgarstki i punkty chwytu zostały ponownie dopasowane; rękawy są smuklejsze, a dłonie nieco mniejsze. Podczas chodu ręce pozostają blisko boków i wahają się głównie do przodu oraz do tyłu. Poprawka obejmuje siatkę, kinematykę, podgląd, GIF-y i ponownie zapisane animacje GLB.

Podgląd otwiera się teraz na chodzie od przodu. Obrót automatyczny można włączyć przyciskiem. Porównanie wcześniejszej i poprawionej pozy jest w EXP-LORE_straznik_ramiona_przed_po.gif.

Kontrola aktualizacji: 960 póz wszystkich czterech trybów ruchu, brak niefinitywnych transformacji, zachowane długości kości i połączenia dłoni z przedramieniem. GLB: 0 błędów i 0 ostrzeżeń. Raport shoulder_validation.json.

## Kolejne postacie

Docelowo wspólny szkielet i wspólne animacje bazowe, z osobnym dopasowaniem proporcji oraz punktów chwytu każdej postaci. Głowy, fryzury, stroje i dodatki powstają według jej oryginalnego sprite'a. Animacje broni dzielimy na miecz, łuk i różdżkę; ich dopasowanie uwzględnia długość ręki i budowę konkretnego modelu. To umożliwia ponowne użycie pracy bez automatycznego nadawania wszystkim postaciom identycznej sylwetki.

Następne reprezentatywne próby: łuczniczka i mag, następnie pozostałe warianty płciowe. Obecna paczka nadal zawiera jeden ukończony wariant strażnika, bez wdrożenia do repozytorium gry.

## Zmiana konstrukcji

Głowa, korpus, ręce, całe dłonie, nogi i buty zostały wymodelowane jako ciągłe powierzchnie 3D. Hełm ma przestrzenną czaszę, obręcz i wypukłe centralne żebro. Twarz i włosy mają kolory na stałe przypisane do powierzchni. Nie zmieniają się w zależności od kierunku patrzenia. Profil powstaje przez obrót tej samej geometrii. Nie ma zmiany sprite'a ani mieszania kolorów przodu, profilu i tyłu podczas ruchu.

Proporcje, paleta, oczy, włosy i wzór munduru pochodzą z oryginalnego strażnika. Trójwymiarowe powierzchnie oraz grubości są interpretacją rysunków. Wersja ta ma gładszy obrys i uproszczone wykończenie hełmu. Nie jest kopią piksel w piksel każdego rzutu oryginału. Do dalszej oceny pozostają modelowanie fryzury, detale hełmu i dopasowanie sylwetki.

Płaskorzeźba korzysta z tej samej bryły spłaszczonej do 35% głębokości. Jest to porównanie kompromisu stylistycznego. Nie jest billboardem automatycznie zwracanym w stronę kamery.

## Pliki

- HTML: interaktywny podgląd jednego strażnika.
- EXP-LORE_straznik_3D_vs_plaskorzezba.gif: pełny obrót, w spoczynku, obok oryginalnego rysunku.
- EXP-LORE_straznik_walka_3D.gif: atak w czasie pełnego obrotu.
- EXP-LORE_straznik_3D.glb: edytowalna geometria, stałe kolory wierzchołków, materiał KHR_materials_unlit, klipy attack i walk. 14 części postaci i osobny miecz jako dziecko węzła dłoni. Ruch jest zapisany jako animacje transformacji sztywnych części, bez deformacji skórnej i bez osobnych kości palców. Miecz można usunąć lub zastąpić węzłem własnej broni. W GLB jest obecny także podczas chodu. Podgląd HTML dorysowuje obrys; obrys ten nie jest dodatkową geometrią w GLB.

Model w GLB ma korzeń w skali 0,025: postać ma ok. 1,25 jednostki wysokości. Siatka jest demonstracyjna, około 32 tys. trójkątów. Przed użyciem wielu takich postaci w grze należy uprościć siatkę i ustalić docelowy budżet renderowania.

## Kontrola

- 240 renderowanych klatek obejmujących pełny obrót, spoczynek i atak, dwa warianty głębokości.
- Brak błędów JavaScript i WebGL; mierzone połączenie miecza z punktem chwytu: 0.
- Układ 390 × 844 bez przewijania poziomego; przełączniki wariantu, ataku i kierunku działają.
- Walidator glTF: 0 błędów, 0 ostrzeżeń. Raporty w work/solid.
- W nowych siatkach trzy pola koloru odziedziczonego formatu mają identyczne wartości, a renderer używa wyłącznie stałego koloru. Tym samym wygląd powierzchni nie jest przełączany przez kąt postaci.

## Źródła i odbudowa

Źródło rysunków: pgaszczyk-ctrl/erpeg, commit c98bf4a0b224c1e6245a9007d502c7118078eafb. Dołączony individual_assets.json zawiera źródłowe moduły i oznaczenia anatomii z wcześniejszego etapu. Nowy model buduje work/solid/build_solid.py. Skrypty wymagają Python, numpy, scipy, Pillow.

    python3 work/solid/build_solid.py
    python3 work/solid/build_page.py

solid_rig.js zawiera kinematykę oraz renderer. export_glb.py odczytuje guard_model.json i baked_animation.json. Klipy zapisano z tej samej kinematyki co w HTML. Eksport klatek export.cjs wymaga Playwright oraz lokalnego Chromium; ścieżki przeglądarki trzeba dostosować do środowiska. build_gifs.py składa wyeksportowane klatki.

Bez wdrożenia do gry. Pozostałe postacie nadal są w poprzednim prototypie; ta paczka służy ocenie nowej konstrukcji strażnika.
