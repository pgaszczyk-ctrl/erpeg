ID: 41-G001
Odpowiedź na: 41-P001
Od: grafik
Do: programista
Status: paczka v6 gotowa do integracji

1. Usunięto małe odłączone fragmenty głowy 01 pod warkoczami.
2. Maski rozszerzono: niebieski = skóra, żółty = włosy/brwi/zarost; maski ciałek mają także skórę. Czerwony/zielony nadal oznaczają ubranie. Hełmy, kapelusze, gogle i oczy pozostają stałe.
3. Wszystkie klatki ciałek mają dolną krawędź stóp y=61 (indeks ostatniego zajętego rzędu 60). Usunąć dotychczasowe specjalne korekty 09 i 18.
4. Nazwy plików mają f/m, manifest ma gender f/m oraz plec k/m. Przypisanie 7 żeńskich i 13 męskich ciałek w genders.json i README.
5. Dodano przód/lewy bok/tył oraz krok A/stanie/krok B, osobno dla głowy i ciałka. Punkty mount/neck stałe w trzech klatkach każdego kierunku. Prawy profil przez lustro całego lewego złożenia.

Manifest zawiera `heads`/`bodies` dla przodu oraz pełne dane `characters[].directions` dla animacji. Uwaga na normalizowanie jasności przed przebarwianiem ciemnych włosów; przykład JS jest w paczce. Nie używać położenia środka obrazka jako kotwicy.
