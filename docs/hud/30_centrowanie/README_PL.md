# Baniak życia na środku — 10.10.2026

Środek baniaka życia jest na środku ekranu, także po zmianie plecaka i obróceniu telefonu. Kolejność: EXP, portret, życie, aparat, jeden pojazd. Wielkości ikon i wysokość94px pozostają takie jak w poprzednim zwartym HUD-zie. Układ mieści się na320px.

Pojazd ma jedno stałe miejsce: dostępna hulajnoga, następnie rower. Bez pojazdu w plecaku widoczny jest przygaszony, nieaktywny rower. Nie ma drugiego przycisku nad pierwszym. Właściciel zostawił zużywanie baterii i ładowanie na kolejny krok: obecny transport nie ma jeszcze baterii, więc posiadana hulajnoga jest dostępna. Parametr hulajnogaGotowa w setHudVehicles pozwala później podłączyć jej dostępność bez zmiany układu.

Rurki pochodzą z istniejącego public/hud/v5/rurki.png; zębatki wokół ikon z public/swiat/ozdoby/zebatka.png. Baniak i jego rzeczywisty płyn są najpierw rysowane na siatce48×60, potem powiększone bez wygładzania. Daje to mniej gładki, pikselowy wygląd bez zmiany oryginalnego WebP. Portrety, aparat i velocyped zachowały wcześniejsze renderowanie. Leczenie, bonus życia i zatrucie zachowane.

Poprzedni układ i zrzuty są w ../29_baniak oraz w historii436fe96. Zachowane także ?hud=old i ?hud=v5. Bez zmian produkcji, danych graczy czy SQL.

Kontrola: pełny VITE_TEST=1 npm run build, osobny VITE_TEST=1 npx vite build oraz Playwright na Vite preview. Rozmiary1440×900/DPR1,390×844/DPR2,320×740/DPR2.625 i obrót telefonu. Test sprawdza środek baniaka z każdym stanem plecaka, jeden slot, pierwszeństwo hulajnogi, wyłączony i przygaszony rower, rzeczywiste wsiadanie/schodzenie, leczenie i zapasy, kufer/aparat oraz portrety. Wszystkie żądania Supabase przechwycone. Wszystkie profile przeszły; wynik w sprawdzenie.json, podglądy telefon.png, komputer.png, bez_pojazdu_320.png oraz pierwszenstwo_hulajnogi.png. Publikacja w toku.
