# Portrety bohaterów i uproszczony HUD — propozycja, 10.10.2026

25 nowych portretów odpowiada 25 postaciom wybieranym obecnie w grze. Numer `postac_01` odpowiada `lista25_01`, a numer 25 — `lista25_25`. W zapisie gry indeksy wynoszą 0–24. To portrety do interfejsu, nie nowe animacje chodzenia. Postacie stałe i przechodnie nie należą do tego zamówienia.

W `portrety/` są oryginalne PNG z przezroczystością. Zachowano fryzury, stroje i wyróżniki obecnych bohaterów; cel to żywsze twarze i czytelne oczy w stylu zaakceptowanego szkicu. Nie zmniejszano plików skryptem, nie nakładano palety świata ani filtrów spritów. Kolory skóry i włosów są stałe, jak w obecnym katalogu; nie dodano masek.

`ikony/aparat.png` to aparat z mosiężną oprawą. `ikony/velocyped.png` przedstawia właściwy pojazd z dużym przednim i małym tylnym kołem oraz miedzianym kociołkiem; zastępuje błędny pomysł zwykłego roweru z wcześniejszego szkicu.

`hud_uproszczony_szkic.png` pokazuje dwa krótkie zbiorniki, przycisk leczenia oraz avatar, aparat i pojazd, połączone cienkimi rurkami. To szkic wyglądu. Nie należy go wklejać jako jednolitego nieruchomego HUD-u: poziomy płynów, portret wybranej postaci, ikona posiadanego pojazdu i liczniki wymagają osobnych elementów. Jabłko/mikstura musi nadal odpowiadać faktycznie dostępnemu leczeniu; bonus niebieskiego życia, zatrucie i stan broni/amunicji muszą pozostać czytelne.

Otwórz `podglad.html`, aby porównać oryginalne ludziki i nowe portrety, także w małym rozmiarze. Przegląd działa bez internetu po rozpakowaniu całego katalogu. Manifest opisuje przyporządkowanie plików i sumy kontrolne.

Materiały nie zastępują jeszcze opublikowanego HUD-u. Układ zadań i obsługa obu posiadanych pojazdów wymagają ostatecznej decyzji przy integracji. Każdy przycisk powinien zachować pole dotyku minimum44px; dekoracyjny rysunek może być mniejszy. Grafiki wczytywać dla aktualnie wybranej postaci, bez pobierania wszystkich25 przy starcie. Stary HUD i jego kopia pozostają dostępne. Produkcja i dane graczy są nietknięte.
