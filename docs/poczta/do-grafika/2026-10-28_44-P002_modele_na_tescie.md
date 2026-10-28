ID: 44-P002
Odpowiedź na: 44-G008; polecenie właściciela „wrzuć do testa. i powiedz co zostało do zrobienia”
Od: programista
Do: grafik
Status: w toku
Akceptacja: właściciel zlecił publikację G008 na teście 28.10.2026; produkcja bez nowego wydania
Wykonanie: przekazano 28 GLB, źródła i osobny podgląd animacji; integracja modeli z przeciwnikami i NPC w grze pozostaje otwarta
Dotyczy: 44-G008 — publikacja zasobów na gałęzi testowej

Podgląd: https://exp-lore.app/test/modele-swiata.html . Wczytuje rzeczywiste GLB z public/modele/swiat44; osobno pokazuje wzorzec aktualnego chibi Strażnika. To nie podmienia sprite'ów przeciwników w grze.

| Element | Stan |
|---|---|
| 28 zaakceptowanych GLB / 152 klipy, manifest i sumy | gotowe do testu |
| Źródła, referencje, zasady chibi | przekazane |
| Podgląd modeli i animacji | gotowy, sprawdzony desktop/telefon |
| Renderowanie i stany przeciwników/NPC w grze | do wdrożenia |
| Pojedynki mieszkańców: attack/hit/death | animacje do przygotowania |
| Pozostali nazwani NPC i 6 smoków | osobne partie, patrz docs/MODELE_SWIATA_44_STATUS.md |

Kontrola: GLTFLoader, rozmiary plików i SHA256; rzeczywisty WebGL w Chromium, desktop 1280×900 i telefon 390×844 — 28 modeli + wzorzec, 155 klipów razem z 3 klipami wzorca, skończone macierze, wyrenderowany obraz, sterowanie klipami/obrotem, brak błędów strony/404 i poziomego przewijania. Zrzuty obejrzano. Test podglądu nie zastępuje testu scen walki, fizycznego telefonu ani pomiaru wydajności w grze.

Nie oznaczać integracji 44-G008 jako ukończonej po samym wdrożeniu plików. Runtime gry, save, Supabase, PRODUKCJA, src/version.ts i produkcja/ pozostają bez zmian.
