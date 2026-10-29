# HUD A — ciosany mosiądz, 29.10.2026

Zakres zaakceptowany przez właściciela: wariant A z makiety, joystick ruchu i celowania, grube mosiężne ramy, rurki przy portrecie, komiksowe dymki trafień/pudeł. Awatary pozostają obecne. Kolumna Menu / Plecak / Aparat / Transport nadal rozwija się po kliknięciu portretu.

Włączenie: tylko kompilacja TEST i zwykła walka live. Arena oraz demo QR zachowują dotychczasowy interfejs. Nie zmieniono PRODUKCJA, numeru wydania ani łatek produkcyjnych.

## Umiejętności

Pod przyciskiem umiejętności jest selektor z suwakiem. Pojawia się dopiero przy co najmniej dwóch dostępnych umiejętnościach aktualnej broni. Dotknięcie dużego przycisku używa umiejętności; suwak wyłącznie wybiera. Działa także z klawiaturą (strzałki, Home/End). Nazwa i ikona od razu pokazują wybór. Umiejętności i progi pozostają z `content/umiejetnosci.ts`: miecz Mocny cios / Zamach (poziom 3), analogicznie łuk i magia. Lista powstaje z danych, więc mieści kolejne opcje.

Decyzja z tego zlecenia zastępuje na TEST wcześniejsze ograniczenie zmiany wyłącznie w ośrodku treningowym. Ośrodki nadal działają. Nie ma osobnych skrótów do każdej umiejętności; Q uruchamia wybraną. Zmiana nie płaci kosztu i nie zeruje wspólnego odnowienia. Poza walką wybór zapisuje się cicho istniejącym zapisem; podczas walki pozostaje w sesji do zwykłego zapisu (bez tworzenia nowego punktu zapisu w walce). Produkcja zachowuje dotychczasową zasadę do osobnego wydania.

## Grafika i wydajność

`comicHud.ts`: rodzime SVG i jedna tekstura Canvas joysticka (240×250), wspólna geometria mosiężnej płyty. Własne wektorowe ikony umiejętności i leczenia działają bez fontów emoji. EXP i twarz pozostają istniejącymi warstwami; gruby rant nakłada się na obecną oprawę. Teleskop zachowuje animację i dotychczasowe akcje.

`comicBurst.ts`: wspólny punkt `Slime.hit` pokazuje faktyczne odjęte HP (w tym ułamki i ograniczenie do pozostałego HP przy śmiertelnym ciosie). Pudło używa osobnego jasnego dymku. Napis trzyma rozmiar ekranowy niezależnie od zoomu. Maksymalnie 12 dymków na scenę, usuwane po 740 ms, bez tekstur tworzonych przy trafieniu. Uwzględniono ograniczenie animacji. Dymki dotyczą obrażeń zadawanych przeciwnikom; nie dodano dźwięków.

## Weryfikacja

`VITE_TEST=1 npx vite build`, `npx tsc --noEmit` i `scripts/tests/browser-comic-hud.mjs`. Test uruchamia zbudowaną grę przez vite preview, makietę mapy oraz izolowane odpowiedzi logowania/zapisu — nie zmienia prawdziwych postaci. Rozmiary: komputer 1280×800, telefon 844×390, pionowy 390×844 z obrotem strony. Sprawdza rozwijanie portretu, odblokowanie i zapis wyboru, brak kosztu od suwaka, wspólne odnowienie, celowanie i powrót drążka, rzeczywisty dotyk ruchu i puszczenie, trafienie 2,5 HP, pudło, śmiertelny cios i usunięcie dymków. Wyniki i zrzuty w artefakcie CI „comic-hud-desktop-and-phone”.

Pełny `npm run build` generuje dodatkowo wszystkie mapy OSM; wynik odnotowany w przekazaniu i CI.
