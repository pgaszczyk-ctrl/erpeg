ID: POSTACIE3D-20261027-G001
Odpowiedź na: polecenie właściciela z 27.10.2026 — dodanie modeli do gita; scenariusz PR #21
Od: grafik
Do: programista
Status: nowe
Akceptacja: zaakceptowane 27.10.2026 — właściciel przekazał ZIP i polecił dodać go do repozytorium.
Wykonanie: dodano sześć dostarczonych GLB, oryginalny podgląd, instrukcję i sumy kontrolne. Integracja z grą i prologiem nie jest częścią tego przekazania.
Dotyczy: modele strażników, łuczników i magów do prologu rekruta

Źródło: EXP-LORE_szesc_modeli_pakiet.zip dostarczony przez właściciela.
Scenariusz: https://github.com/pgaszczyk-ctrl/erpeg/pull/21

| Plik w public/modele/postacie3d/ | Postać |
|---|---|
| 16.glb | Strażnik |
| 01.glb | Strażniczka |
| 12.glb | Łucznik |
| 18.glb | Łuczniczka |
| 11.glb | Młody mag bez brody i wąsów |
| mage_f.glb | Magini |

Każdy plik zawiera klipy idle, walk i attack oraz grupę Weapon. GLB są samodzielne, bez zewnętrznych buforów i obrazów.
Instrukcja dostawcy: scripts/model3d/postacie3d/CZYTAJ_NAJPIERW.txt.
Podgląd dostawcy: scripts/model3d/postacie3d/podglad.html.
Sumy SHA-256: scripts/model3d/postacie3d/SHA256.txt; ścieżki liczone od katalogu głównego repozytorium.

Przy integracji:
- Obsłużyć Weapon z fallbackiem do Sword_at_hand_grip; zastosować wskazówki materiału głowy i przestrzeni barw z oryginalnej instrukcji.
- Atak łukiem/różdżką ma wyzwalać animację także w GameScene.fireShot.
- Zachować twarz i mundur rekruta przy zmianie broni. Gotowe modele są wariantami sylwetek; nie rozwiązują jeszcze dynamicznej wymiany broni/animacji w tym samym mundurze.
- W służbie obowiązuje mundur; odblokowanie swobodnych skinów po questach i odejściu ze straży wymaga osobnego wdrożenia stanów fabularnych.
- Nie podmieniać automatycznie public/modele/straznik.glb ani aktualnego loadera w ramach odbioru tej paczki.

Kontrola tego przekazania: sześć sum SHA-256 zgodnych z manifestem, poprawne nagłówki GLB 2.0 i długości plików, klipy idle/walk/attack i Weapon w każdym pliku, brak zewnętrznych zasobów. Sumy Git przesyłanych plików porównano z lokalną paczką.
Nie uruchamiano gry ani pełnego buildu: brak zmian kodu runtime. Nie powtarzano wcześniejszych testów opisanych przez dostawcę. Nie oznaczać modeli jako wdrożonych w grze.
