# 29.10.2026 — mieszkańcy i zaakceptowany pies chibi na TEST

Na polecenie właściciela podłączono 15 wyglądów mieszkańców oraz zaakceptowany model psa G010. Przechodnie, mądrale i pies korzystają ze wspólnego atlasu z przeciwnikami. Zachowano zadania i nagrody; mieszkańcy mają chód, rozmowę i parasole, pies również siad i merdanie. Pozostałe modele nie były przebudowywane.

Pełny build i testy przeglądarkowe PC/telefon przeszły, w tym całe zadanie zabawki psa oraz regresja walki przeciwników. Zakres i ograniczenia: [TEST_MIESZKANCY3D_20261029.md](TEST_MIESZKANCY3D_20261029.md).

Zbiorczego dziennika `PRZEKAZANIE_chatgpt.md` ani dużego pliku `CLAUDE.md` nie aktualizowano: automatyczna kontrola odrzuciła ponowne przesłanie pełnej historii. Ta notatka zawiera wyłącznie bieżące wdrożenie.

Automatyczna kontrola zablokowała również publikację generatora psa. Gotowy GLB jest wdrożony; aktualne źródło pozostaje w zaakceptowanej paczce G010. Stary generator w repozytorium nie powinien regenerować psa.

Właściciel potwierdził publikację kodu integracji. Wdrożenie korzysta z samodzielnego adaptera renderowania i obrazów atlasu. Główna scena `GameScene.ts` oraz pliki `FixedNpcs.ts`, `Townsfolk.ts`, `Npcs.ts` pozostają niezmienione.
