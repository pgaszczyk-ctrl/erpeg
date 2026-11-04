# TEST — mieszkańcy G008 i pies chibi G010

Polecenie właściciela 29.10.2026: zaakceptowany pies oraz pozostałe przygotowane modele mają trafić na test. Produkcyjna wersja/pin i baza danych pozostają bez zmian.

## Działanie

15 wyglądów przechodniów, z zachowaniem płci i wieku dotychczasowej postaci. Mądrale korzystają z tych samych modeli dorosłych/seniorów. Pies na Guliwera/Cyda korzysta z zaakceptowanych bajtów G010: SHA256 `a5e6727a48084472645272ef1f8a77d68fdbc8def6b4848be486d8290c6ad9b4`. Plik publiczny i źródłowa paczka grafika są identyczne z zaakceptowanym ZIP-em.

Oryginalni właściciele (`Townsfolk`, `Npcs`, `FixedNpcs`) nadal obsługują pozycje, widoczność, drogi i zadania. Adapter odczytuje ich istniejące kolekcje; `GameScene.ts`, `Townsfolk.ts`, `Npcs.ts` i `FixedNpcs.ts` pozostają niezmienione. Oryginalny obraz jest kadrowany, a model wyświetla osobny obraz atlasu śledzący pozycję, widoczność i przezroczystość postaci. Metody wyboru rozmówcy zachowują wynik, adapter zapisuje tylko wskazany sprite; przy sprzątaniu przywraca oryginalne metody i obraz. `mieszkancy3d.ts` odczytuje faktyczny ruch i dobiera klip. Wspólny `Stwory3D` renderuje przeciwników i mieszkańców w jednym kontekście/atlasie 32 miejsc (2 MiB koloru; dodatkowo bufor obrazu i głębokości). Przeciwnicy mają pierwszeństwo. Nadmiar aktorów, błędy zasobu lub utrata kontekstu zachowują/przywracają sprite’y.

Mieszkańcy: idle/walk/talk/rain; w deszczu parasol z GLB, bez dublowania kodową czaszą. Postój z parasolem zatrzymuje chód. Podczas dialogu animuje się tylko rozmówca; symulacja walki i ruchu jest zatrzymana. Pies: walk/idle, po chwili postoju held sit, wag podczas rozmowy. Zadanie zabawki i jednorazowa nagroda 100 EXP bez zmian. Pojedynki zachowują dotychczasowego wojownika 2D, ponieważ mieszkańcy nie mają klipów walki. Gazeciarz i nazwani NPC pozostają przy swoich wcześniejszych wyglądach.

## Sprawdzenie

- Pełny `VITE_TEST=1 npm run build` (Lublin i 124 mapy miast, TypeScript, Vite); osobny `npx vite build` i Vite preview.
- `browser-residents3d.mjs`: rzeczywiste GLB w zbudowanej grze, PC 1280×800 i telefon 844×390; wszystkie 15 wyglądów + pies + szkielet we wspólnym kontekście (17 modeli); celowy błąd 503 i ponowienie; ruch przez właściciela, deszcz, rozmowa w zatrzymanej symulacji, siad/merdanie psa; przyjęcie zadania, znalezienie zabawki, dokładnie +100 EXP i odejście psa; zniknięcie/powrót przy pojedynku; usunięcie aktorów powierzchni z atlasu, limit 32 przy 45 mieszkańcach; przywracanie obrazów przy wyłączeniu i sprzątanie zasobów.
- Regresja `browser-creatures3d.mjs`: 12 modeli / 14 typów, 73 próbki animacji, paleta bez dodatkowej korekcji gamma, korzeń ruchu, AI, emisja pocisku z dłoni, trafienie/śmierć przez rzeczywisty atak, limit 40 aktorów, restart sceny i wyłącznik. Zmiana URL testu wyłącza mieszkańców dla izolacji regresji przeciwników.
- Kontrola wszystkich 28 SHA256 z manifestu oraz porównanie psa z zatwierdzonym ZIP-em.
- Automatyczne RPC i mapa są zastępowane lokalnymi odpowiedziami. Nie odczytywano/zapisywano postaci graczy ani SQL. Test na fizycznym telefonie oraz FPS na jego GPU pozostają do sprawdzenia; programowy WebGL w kontenerze nie jest miarą telefonu.

Porównanie: `?mieszkancy3d=0` wyłącza mieszkańców i psa, `?stwory3d=0` tylko przeciwników, oba razem cały atlas. Funkcje są domyślnie włączone tylko w buildzie TEST. To wdrożenie nie zawiera osobnych, niezaakceptowanych portretów/modeli nazwanych NPC ani nowych smoków.
