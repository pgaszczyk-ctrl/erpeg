# HUD 27 — próba na serwerze testowym

Nowa dolna machina jest domyślna tylko na TEST. Górne panele pozostały jak wcześniej.

Poprzedni wygląd można porównać pod adresem https://exp-lore.app/test/?hud=old . Zwykły adres testu pokazuje nową machinę. Ustawienie nie zapisuje nic w danych gracza.

## Przywrócenie

Aby przywrócić stary HUD wszystkim na teście, wyłącz `newMachine` w `src/ui/hud.ts`, sprawdź build i przeglądarkę, a potem wykonaj zwykły commit/push. Nie cofaj historii ani innych zmian gry.

`hud_poprzedni_7f03d9e.zip` zawiera dokładny poprzedni `src/ui/hud.ts` i grafiki `public/hud/`, sprzed instalacji paczki 27 (commit 7f03d9e4a97eb6cf2d78f73f6efae281bab9a24d). Nie należy rozpakowywać go w ciemno na nowszym kodzie — kopia jest źródłem do porównania/przywrócenia wyłącznie HUD-u.

Nowy renderer: `src/ui/hudMachineV5.ts`, oryginalne pliki artysty: `public/hud/v5/`. Opis artysty i układ zachowane obok; są wskazówkami do integracji, nie poleceniami zmiany zasad gry.

Na ekranach poniżej 380 px moduł ma dwie kolumny. Pojazdy pokazują się tylko dla przedmiotów posiadanych w plecaku. Zapasowe szóste okno obsługuje hulajnogę, kiedy bohater posiada oba pojazdy; w innym przypadku pozostaje puste i nie ma akcji. Nie dodano czujnika przechyłu ani nowej statystyki manometru. Rysunek zachowuje oryginalne proporcje, osobne komory płynu, bonus życia i zatrucie; EXP jest bursztynowy. Pola przycisków mają minimum 48 px, leczenie 64 px. Przeciągnięcie powyżej 8 px anuluje kliknięcie.

SHA-256 archiwum: `a14b3ea41eae1258d08a64f72ccfc6dbae0130049151fe289e68149e9ad13782`.
