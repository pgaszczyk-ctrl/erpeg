ID: 44-G003
Odpowiedź na: uwagi po 44-G002 — prostszy wilk jak w Exp-Lore, większa głowa, bardzo krótka szyja, zachowanie chodu, dodanie skoku jako ataku
Status: szkielet zaakceptowany bez zmian; chód wilka zaakceptowany i zachowany; nowa sylwetka oraz skok do oceny

# Wilk — krótka szyja i skok atakujący

Bieżąca wersja ma pierwszeństwo przed opisem wilka w 44-G001 i 44-G002. Szkielet pozostaje identyczny bajt w bajt; nie zmieniano jego proporcji, geometrii ani klipów.

## Odniesienie do Exp-Lore

Sprawdzono repozytorium **pgaszczyk-ctrl/exp-lore**, gałąź **main**, funkcję `wolf()` w [src/combat3d/models.ts](https://github.com/pgaszczyk-ctrl/exp-lore/blob/main/src/combat3d/models.ts). Odczytany blob pliku: `f82f6af16cbc6aeb940f6ee1c4f09999604d6625`. Wzorzec ma jeden tułów, głowę przyczepioną bezpośrednio do barków, krótki prostokątny pysk, trójkątne uszy i prostą kolorystykę szarozieloną. To z niego pochodzi kierunek uproszczenia. Nie zmieniano kodu tego repozytorium i nie wdrażano do gry nowych modeli.

Nowa geometria jest interpretacją wzorca z zachowaniem zaakceptowanego w tej rozmowie chodu i stawów. Nie skopiowano dawnej animacji wahadłowej prostych nóg.

## Zmiana sylwetki

- Usunięta osobna bryła grubej szyi. Węzeł `neck` pozostał jako niewidoczny punkt obrotu wewnątrz barków.
- Głowa, uszy, pysk i szczęka powiększone razem o 20% wobec 44-G002. Głowa jest niżej, blisko tułowia, zamiast na długiej pionowej szyi.
- Jeden tułów, duża głowa, prosty pysk, nos i uszy. Bez wewnętrznych płatów uszu, kępek sierści, oddzielnych palców i wielu nakładanych powierzchni futra.
- Paleta oparta na szarozielonym wilku z Exp-Lore, z jaśniejszą głową i pyskiem.
- **696 trójkąty**, wcześniej 1268 w G002 i 2330 w G001. To uproszczenie geometrii i wyglądu, nie deklaracja zmierzonego przyrostu FPS.

Zachowano hierarchię kończyn `quadruped_canid_v2`, czterofazowy cykl 0,95 s i 68% fazy podparcia. Kolana i tylne stawy skokowe nie wracają do pierwotnego „ludzkiego” wahadła.

## Prawdziwy skok

Oba nowe ataki mają przysiad, wybicie tylnych łap, krótki lot całego zwierzęcia, ugryzienie i amortyzację lądowania. W locie wszystkie cztery łapy są nad ziemią; nie jest to tylko obrót korpusu.

| Zdarzenie | Czas |
|---|---:|
| Koniec przygotowania | 0,46 s |
| Oderwanie od ziemi | 0,50 s |
| Ugryzienie / sugerowane trafienie | 0,70 s |
| Lądowanie | 0,90 s |
| Koniec amortyzacji i powrotu do postawy | 1,25 s |

Maksymalny wznios całej geometrii wynosi około 0,23 jednostki ponad poziom podparcia. Przednie łapy wyciągają się do przodu, tylne podkurczają; szczęka otwiera się przed kontaktem i zamyka podczas ugryzienia. Późniejszy przysiad amortyzuje lądowanie.

| Klip | Długość | Ruch korzenia |
|---|---:|---|
| `idle` | 2,40 s | brak ruchu po mapie |
| `walk` | 0,95 s | zaakceptowany chód w miejscu |
| `attack` | 1,25 s | pionowy skok; przesunięcie do celu może prowadzić gra |
| `lunge` | 1,25 s | pionowy skok i **0,44 jednostki do przodu po +Z** |
| `hit` | 0,26 s | reakcja na trafienie |
| `death` | 1,25 s | upadek, zatrzymanie na ostatniej klatce |

`lunge` nie jest już aliasem `attack` bez ruchu. Jego końcowe przesunięcie +0,44 pozostaje w klipie — wilk nie cofa się magicznie po lądowaniu. `attack` i `lunge` są jednorazowe. Podgląd pokazuje domyślnie wilka i jego skok do przodu; można przełączyć na chód lub porównać go ze Strażnikiem i szkieletem.

## Podłączenie w grze

To dostawa modelu i klipów, nie wdrożenie nowej umiejętności do kodu walki. Gra nadal rozstrzyga zasięg, legalne miejsce lądowania, kolizje i obrażenia.

Dwie poprawne drogi integracji:

1. **Gra prowadzi aktora**: użyć `attack`, który zawiera ruch pionowy i pozy skoku, a przemieszczenie po ziemi wyznaczyć ścieżką walki. To pozwala dopasować dystans do dozwolonego celu bez zmiany sylwetki.
2. **Ruch z klipu**: użyć `lunge`, odczytywać przyrost translacji +Z korzenia, przeliczać go przez kierunek aktora i przepuszczać przez kolizje. Zużyty ruch odjąć od wizualnego korzenia, aby nie przesunąć wilka dwukrotnie. Po zakończeniu zachować nową pozycję aktora przed przejściem do kolejnego klipu. Pionowy wznios może pozostać ruchem grafiki nad płaszczyzną mapy.

Nie należy jednocześnie odtwarzać pełnego przesunięcia `lunge` i dodawać drugiego doskoku o 0,44 w sterowaniu. Nie wolno też użyć starego zdarzenia trafienia 0,64 s: nowe ugryzienie przypada na **0,70 s**. Dane zdarzeń są w `extras.attackEvents` GLB.

## Pliki i sprawdzenia

- `44_ruchome_3d/wilk_skok_atak.gif` — nowa sylwetka i skok, równolegle bok i kamera mapy.
- `44_ruchome_3d/wilk_poprawiony_krok.gif` — zaakceptowany chód na nowej sylwetce.
- `44_ruchome_3d/podglad_44.html` — samodzielny podgląd obu rodzajów skoku, chodzenia i pozostałych klipów. Dla doskoku kadr jest szerszy, aby nie obciąć pyska.
- `44_ruchome_3d/modele/wilk.glb` — aktualny model z sześcioma klipami.
- `44_ruchome_3d/manifest.json`, `kontrola_modeli.json` — parametry i kontrola.

Po zmianie wykonywane są sprawdzenia struktury i geometrii, próbkowanie wszystkich klipów, kontrola podparcia w chodzie oraz osobne sprawdzenie lotu i lądowania. Kontrola skoku wymaga odrywania wszystkich czterech łap, zachowania kierunku doskoku i osadzenia na ziemi na końcu.

PNG/GIF powstają bezpośrednio z GLB. Nadal nie wykonano rzeczywistego testu GPU/WebGL, pomiaru na telefonie ani integracji z aktualną grą. Otwarta pozostaje ocena wyglądu; akceptacja chodu i szkieletu nie jest automatyczną akceptacją nowego pyska i skoku.
