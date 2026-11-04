Od: grafik
Status: nowe
Dotyczy: perspektywa dekoracji dachów i placów
ID: 49-G001
Odpowiedź na: dyspozycję właściciela w rozmowie 2026-11-02
Do: programista
Akceptacja: zaakceptowane 2026-11-02 — podmiana płaskich grafik i lista zmian generatora
Wykonanie: patrz osobne stany poniżej; bez publikacji na produkcję

# Ustalenie widoku

Dekoracje stojące na powierzchniach mają pokazywać górę, boczną ścianę i głębokość podstawy. Docelowy wzorzec plastyczny tej paczki: rzut ortograficzny, około 50° nad horyzontem; światło z lewego górnego rogu, obrys #1e1a24, ograniczona miedziano-mosiężna paleta. Dla poziomego koła h/w ≈ sin(50°) = 0,766. Pionowa tarcza zegara nie powinna być spłaszczana jak pozioma pokrywa.

Uwaga: 50° jest wprost ustawione w ARMATA_3D.pochylenie (src/artillery/armata3d.ts). Generator budynków ma umowny rzut, a src/architecture/raster.ts używa sy = y * projection - z. Nie ma jednej kamery 50° dla całego świata! Nie zmieniać projekcji mapy ani kamer postaci w ramach tej poprawki. Najpierw porównać dekoracje z konkretnym dachem w obu rendererach.

# Elementy generowane — do wykonania przez programistę

| Priorytet | Miejsce / funkcja | Co poprawić |
|---|---|---|
| 1 | src/gen/budynki.ts: antena → antena_tesli | Eliptyczne zwoje widziane z góry, przestrzenny izolator i stopa. Zachować kulę/iskry i punkt osadzenia. |
| 1 | src/gen/budynki.ts: kociol | Zamiast płaskiego prostokąta: cylinder/bryła z górną pokrywą, bokiem i podporami. Manometr na pionowej ścianie. Zachować przyłącze rurka i ujście pary. |
| 1 | src/gen/budynki.ts: blok op.komin && maxD > 6 | Komin ceglany: górny otwór, obrzeże, widoczny bok. Powiązać pozycję pary z nowym wylotem (obecnie miejsce wyszukiwane ponownie niżej). |
| 1 | src/gen/budynki.ts: kominZel → komin_zelazny | Eliptyczny wylot, kołnierz i stopa; dopasować para.push do wylotu. |
| 2 | src/gen/budynki.ts: zbiornikWody → zbiornik_wody | Pokrywa z góry i rozstaw podpór w dwóch osiach; zróżnicować tył/przód. |
| 2 | src/gen/budynki.ts: kopula → kopula_obserwatorium | Eliptyczny cokół, przestrzenna kopuła i szczelina zgodna z krzywizną. |
| 2 | src/gen/budynki.ts: luneta | Widoczna góra tubusu, przekroje końców, trzy nogi na płaszczyźnie dachu. Nie mylić z plac_teleskop.png — to osobny rysunek. |
| 2 | src/gen/budynki.ts: anemometr | Ramiona rozłożone w poziomie, czasze i stopa z góry. |
| 2 | src/gen/budynki.ts: swietlik → swietlik_zebaty | Obręcz i szkło w płaszczyźnie danego dachu; uwzględnić pochyły dach zamiast bezwarunkowo koła. |
| 2 | src/gen/budynki.ts: wentylator | Ścieżka PNG wentylator#0..2 i awaryjne rysowanie kolo: obie muszą przedstawiać tę samą przestrzenną obudowę. Generator dobiera klatkę przez seed % 3; nie jest to samo w sobie animacja czasowa. |
| 3 | src/map/kociol09.ts: malujKociol | Zwiększyć widoczność pokrywy (obecnie rx=12, ry=5), dać podstawie głębokość. Zachować rurociagWzdluz, pozycję i poprawić punkt zwracany dla pary przy zmianie komina. |
| 3 | src/map/dworzec09.ts: luneta, zegar, latarnia | Przestrzenne stopy, obudowy i górne powierzchnie. Zachować kierunek lunety, oś peronu oraz sygnałowe soczewki. |

Nie ruszać: rurociągów przy drogach, orurowania wzdłuż konturów domów ani funkcji rozmieszczających je. Zbiornik przy ścianie (zbiornik) to osobny element: ocenić pokrywę i mocowanie, nie zmieniać przebiegu przyłączy.

# Gotowe grafiki

Podmiany dotyczą public/swiat/ozdoby/: plac_pompa_parowa (23×23), plac_teleskop (22×28), plac_donica_miedziana (18×18), plac_zegar_uliczny (18×45), plac_gablota_ogloszen (24×28), wentylator (39×13, trzy komórki 13×13). Zachować nazwy, format RGBA i zaczepienie u dołu. Ławka, publiczny duży kocioł i fontanna nie wymagają w tej partii podmiany. komin_para.png nie naprawi komina rysowanego w budynki.ts.

src/map/rysunki09.ts pobiera ozdoby przez import.meta.glob i dołącza bajty do pakietu, więc podmiana pliku wymaga przebudowania gry; nie wystarczy upload PNG na serwer. Dla wentylatora skontrolować trzy klatki osobno i brak przeskakiwania obudowy.

# Odbiór i wdrożenie

Sprawdzić gotowe PNG w skali 1:1 i na mapie, na tle jasnego i ciemnego dachu, na telefonie 390×844 oraz komputerze. Kontrolować: punkt podstawy, brak obcinania, parę nad wylotem, spójny rozmiar piksela i kontrast. Wykonać npm run build i preview + screenshot. W tej sesji dostęp do repo jest przez connector; pełny checkout i lokalny build nie zostały wykonane. Nie uznawać samego podglądu sprite'ów za sprawdzenie gry. Test przed scaleniem na claude/bold-gauss-peehzd; PRODUKCJA bez zmian.
