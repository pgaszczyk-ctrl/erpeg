ID: 41-G004
Od: grafik
Do: programista / właściciel
Status: poprawka przygotowana, bez wdrożenia
Dotyczy: nienaturalne przejście głowy w szyję, v6.2 → v6.3

Poprzednia ocena „łączenie jest poprawne” dotyczyła wzoru i zgodności danych między repozytorium a paczką. Była zbyt kategoryczna w odniesieniu do wyglądu: wybrane miejsce połączenia pozostawiało pod głową wąski, obrysowany fragment szyi. Brak pustego piksela na osi nie sprawdza naturalności całego przejścia pod brodą.

## Poprawka

Punkt `neck.y` ciałka jest przesunięty o +1 px względem v6.2, do granicy przy kołnierzu, zamiast środka dwupikselowego fragmentu skóry. Dotyczy wszystkich 20 ciałek, trzech kierunków i trzech klatek: 60 punktów kierunkowych / 180 kotwic klatek. Przy tym samym wzorze montażu głowa schodzi o 1 px i przykrywa wystającą szyję. Oś X oraz wszystkie punkty `head_mount` głów są zachowane. Nie zmieniono pikseli, wymiarów ani proporcji części; stopy pozostają na y=61.

To korekta danych przygotowanych przez grafika. Programista poprawnie stosował poprzednie punkty — nie ma podstaw, by przypisywać mu błąd wzoru składania.

## Pliki gotowe do wgrania

W `dla_programisty/` są gotowe pliki o strukturze repozytorium:

- `src/content/modulDane.ts` — komplet nowych kotwic i aktualnych kolorów referencyjnych.
- `public/postacie/modul/glowy.png`, `glowy_maska.png`, `ciala.png`, `ciala_maska.png` — komplet pasków z poprawkami masek v6.2.

Można podmienić te pliki razem. Alternatywnie podmienić źródła paczki w `scripts/modul-zrodla/` i uruchomić dotychczasowy `scripts/postacie-modul.py` — odczytuje `neck` z nowego manifestu i uzyska te same dane.

Ważne: użyć nowego manifestu / `modulDane.ts`. Same obrazy są takie same jak w v6.2 i ich podmiana bez danych nie zmieni szyi. NIE dodawać kolejnego `dy += 1` w kodzie — korekta jest już w kotwicach. Pozostawić `dx = Math.round(neck.x - mount.x)` oraz `dy = Math.round(neck.y - mount.y)`. Dotychczasowy `DOL` przesuwający całą postać zostaje bez zmian.

Do ponownego sprawdzenia przeładować stronę, aby nie korzystała z zapamiętanego arkusza złożonego przed podmianą. Filtr sepii i pikselowe wyświetlanie są osobnym zagadnieniem opisanym w 41-G003; dołączona tam poprawka CSS nadal obowiązuje.

## Podgląd i kontrola

`preview/41-G004_szyja_przed_po.png` pokazuje tę samą parę części przed i po korekcie, bez różnic kolorów. `podglad_interaktywny.html`, główne podglądy postaci i GIF-y korzystają z nowego montażu. Starsze podglądy z numerami 41-P002 i 41-G003 są dokumentacją wcześniejszych poprawek, nie podglądem v6.3.

`kontrola_41-G004.json`: 1600 plików części, masek i arkuszy identycznych bajtowo z v6.2; brak zmian osi X i głów; neck.y zwiększony dokładnie o 1; 3600 połączeń bez przerwy na osi; wszystkie stopy bez zmian. Oceniono wizualnie sześć reprezentatywnych połączeń przodem i komplet 20 własnych postaci. Test numeryczny wszystkich par nie zastępuje przeglądu każdej kombinacji w grze.

W paczce pozostają trzy ikony kreatora w `ui_icons/`.
