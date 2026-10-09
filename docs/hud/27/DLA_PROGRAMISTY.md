# Exp-lore — machina HUD v5

Zastąpić dolną machinę. Górne panele bez zmian. Ta wersja ma zbiorniki blisko bulaja, bursztynowy EXP, zaworek i sześć mniejszych okienek po prawej.

## Układ

Arkusz machina.png: 390×120 px. Zbiorniki: 73×30 px, pozycja [76,48]. Bulaj: 64×77 px, pozycja [163,25], jabłko/mikstura 32×32. Prawy moduł: 144×106 px, pozycja [229,0]. Każda ramka 32×33 px, ikonki wyświetlać w 22×22. Pliki ikon 24×24 można skalować nearest-neighbour. Zaworek 10×10, subtelna mosiężna dekoracja na łączniku między zbiornikami a bulajem; manometr 16×16, dekoracja przy bulaju. Wszystkie współrzędne z layout.json są lokalne dla arkusza, od zera.

Prawe okienka, kolejność czytania:

| Pozycja | Zawartość | Akcja |
|---|---|---|
| Góra lewa | Awatar gracza | Jak obecny awatar |
| Góra środek | Aparat | Jak obecny aparat |
| Góra prawa | Questy | Jak obecne questy |
| Dół lewa | Welocyped | Dotychczasowa akcja pojazdu |
| Dół środek | Miecz | Dotychczasowa akcja broni; 98% pobierać z obecnego stanu |
| Dół prawa | Puste ciemne okienko | Rezerwa; bez przycisku, fokusu i akcji |

Usunąć osobny duży miecz nad zbiornikami. Jego ikonę i procent przenieść do piątego okienka; procent może być małym napisem pod ramką. Okrągły element to dekoracyjny manometr, nie zegar ani przycisk. Liczba 418 oznaczała liczbę jabłek: przywrócić licznik pod bulajem, pobierany z faktycznej liczby aktywnego przedmiotu leczenia. 418 w podglądzie jest przykładem, nie stałą. Przy miksturze wyświetlać liczbę mikstur. Manometr nie przedstawia nowej statystyki i nie przechwytuje dotyku.

## Składanie

W assets są machina.png (cała pusta ramka) i osobne części: zbiorniki, leczenie_ramka, menu_ramka, rurki, sześć menu_socket_0..5. Wybrać jeden sposób składania, nie rysować pełnej ramki i części jednocześnie. Płyn osobną warstwą w maskach hp_maska.png / xp_maska.png, ikony nad nią, teksty osobno. W podglądzie płyn jest renderowany w prostokątnych obszarach wewnątrz szkła; docelowo zachować klipy komór. Nie rozciągać ramek ani zmieniać rozmiaru komór, dopasowywać tylko łączniki.

Awatar dynamicznie z obecnej postaci. avatar_przyklad.png tylko do demonstracji. Jabłko/mikstura wg aktywnego przedmiotu leczenia. Bursztynowy płyn EXP: #d79a32, światło #f3c465, cień #9b5b20. Nie używać niebieskiego lub turkusowego płynu. Zaworek i manometr dekoracyjne, nie klikalne.

Kotwiczyć do dołu widoku GRY, 8 px + env(safe-area-inset-bottom). Bulaj na x=50% ekranu. Przy 390 CSS px arkusz można użyć 1:1. Pola dotyku 48×48 CSS px: leczenie 64×64 CSS px, środek [195,63]; pozostałe pola 48×48 CSS px i środki z layout.json. Odstępy między prawymi środkami: 52 px poziomo, 50 px pionowo. Zostawić odstępy między polami. Na wąskim ekranie nie skalować całej machiny razem z polami dotyku: ułożyć prawy moduł w 2 kolumnach ×3 wierszach, kolejność zachować, zbiorniki nadal obok leczenia. Na komputerze można 6 prawe okienka ułożyć w jednym rzędzie i dodać skrót leczenia.

## Dotyk

Cała dekoracyjna machina, rurki, zaworek, zbiorniki i puste okno: pointer-events:none. Tylko leczenie i pięć aktywnych okienek dostają osobne elementy button. Puste przestrzenie przepuszczają przesuwanie mapy. Akcja po pointerup we właściwym przycisku; ruch ponad 8 CSS px lub pointercancel anuluje kliknięcie. Nie dublować touchend i click. Zachować obecne cooldowny, blokady, logikę broni i leczenia. aria-label, fokus, licznik 0 i stan nieaktywny przy braku leczenia.

## Płyn

HP 5 szczelnych komór, EXP 4. Dla wartości p∈[0,1]: fill[i]=clamp(p*N-i,0,1). HP70% → [1,1,1,0.5,0]. EXP jest postępem do następnego poziomu. Nie zmieniać jednostek życia.

Pełne i puste komory nieruchome. Tylko częściowo pełna komora przechyla powierzchnię; objętość stała, bez przepływu przez przegrody. Nachylenie maksymalnie ±8°, wygładzenie 150–250 ms. Zmieniać wysokość bazową tak, by przy klipowaniu pole cieczy pozostało stałe. Przy bardzo małym poziomie ograniczać falowanie.

Czujnik orientacji opcjonalny. HTTPS, kalibracja neutralnej pozycji i orientacji ekranu, obsługa odmowy/braku API. Ewentualne requestPermission wyłącznie po świadomym działaniu gracza. Bez czujnika i przy prefers-reduced-motion powierzchnia pozioma. Zatrzymać animację w ukrytej karcie. Podgląd HTML używa suwaka, nie czujnika.

## Nadpisanie i kontrola

Podmienić machina.png, menu_ramka.png, rurki.png, hp_maska.png, xp_maska.png i layout.json; dodać miecz.png, zawor.png, manometr.png oraz menu_socket_4..5. Nowy layout przestawia także istniejące ikony. Nie korzystać ze starych masek i współrzędnych. makieta_telefon.png to obraz poglądowy; dokładne pozycje zapisane w layout.json i podglądzie eksportu.

Sprawdzić 320/360/390/430 px, safe-area, przeciąganie przez rurki, pojedyncze użycie przedmiotu, pełne komory przy przechyle, zmianę awatara, wszystkie 5 akcji prawego modułu oraz brak akcji w szóstym oknie. Grafiki i współrzędne kontrolowane na plikach; integracja w grze pozostaje do sprawdzenia.

API: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static

## Proporcje v5

Bulaj powiększony o około 33% w szerokości względem v4. Moduł zbiorników ma wysokość 30 px, bulaj 77 px. Prawe okienka zwiększone z 24×25 do 32×33, ikonki z 16 do 22 px: czytelne, ale połowa szerokości bulaja. Usunięto czerwony zawór na końcu zbiornika. Nowy zawór jest mosiężny, mały i umieszczony na rurce prowadzącej do bulaja. Maski mają teraz rozmiar 390×120.
