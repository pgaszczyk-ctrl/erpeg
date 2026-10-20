# Exp-lore — 20 postaci, głowa + ciałko, osie v5

## Zawartość
20 głów (wraz z włosami, kapeluszem i zarostem), 20 całych ciałek, 20 masek ubrania i 20 pustych masek głowy. PNG przezroczyste, 64×64 oraz dokładne powiększenie NN 8× do 512×512. Tylko przód i bezruch, bez animacji.

## Montaż — programista
Nie nakładaj wszystkich PNG w (0,0). Nie wyznaczaj środka z granic włosów, kucyka, kapelusza ani całego ciałka. Każda część ma osobne dane.

`manifest.json`: head.eyes zawiera prostokąty oczu i ich środki; head.axis_x i head.mount.x są średnią środków oczu. head.mount.y wskazuje poziom styku pod brodą. body.neck to osobno oznaczony punkt szyi/kołnierza w ciałku. Punkty mogą mieć współrzędne połówkowe.

Położenie głowy względem ciałka:
```js
dx = Math.round(body.neck.x - head.mount.x);
dy = Math.round(body.neck.y - head.mount.y);
```
Narysuj ciałko, potem głowę z tym przesunięciem. Dla 512×512 współrzędne i przesunięcia z 64×64 pomnóż przez 8. Nie licz zaokrąglenia ponownie na innym poziomie skali. Wyłącz wygładzanie. Maksymalny błąd zaokrąglenia wynosi 0,5 piksela na osi. Początek współrzędnych to lewy górny róg obrazu; środek pierwszego piksela to (0,5; 0,5).

Broda lub warkocz może wystawać poniżej head.mount.y — to celowe. Nie używaj ostatniego nieprzezroczystego rzędu głowy jako punktu montażu. Daj postaci margines na przesunięcie głowy; nie przycinaj automatycznie całego złożenia do 64×64. Przykłady podglądu korzystają z płótna 96×96.

`developer/assemble_character.mjs` zawiera funkcję położenia i rysowania. `podglad_interaktywny.html` działa lokalnie po otwarciu w przeglądarce, bez instalacji: wybór głowy/ciałka, kolory oraz osie.

## Maski kolorów
Dokładnie czerwony #FF0000 = główne ubranie, zielony #00FF00 = drugi materiał, alpha=0 = bez zmiany. Głowy mają puste maski: skóra, włosy, zarost, czapki nie są tu kolorowane. Nie nakładaj maski jako widocznej warstwy. Podmieniaj barwę z zachowaniem jasności oryginału; przykład jest w module JS. Maski są celowo zachowawcze przy dłoniach, szyi i obrysie.

## Kontrola
Sprawdzono obliczenia przesunięć dla wszystkich 400 kombinacji; wyniki w kontroli JSON. To kontrola punktów montażowych, nie deklaracja automatycznej oceny estetyki każdego połączenia. Osie i punkty pokazano osobno w `osie_i_punkty_montazu.png`; w czystych sprite’ach nie ma oznaczeń. Różowa linia = oś oczu, żółty krzyż = punkt montażowy głowy, zielony = oś i punkt szyi ciałka.

## Pochodzenie i zakres
18 baz wygenerowano narzędziem imagegen w zaakceptowanym stylu, wynalazcę i łuczniczkę zachowano z wcześniejszej próby. Przy eksporcie wykonano podział, proporcjonalne pomniejszenie, wyrównanie wielkości oczu, maski materiałów i oznaczenia punktów. Nie zmodyfikowano repozytorium ani gry.
