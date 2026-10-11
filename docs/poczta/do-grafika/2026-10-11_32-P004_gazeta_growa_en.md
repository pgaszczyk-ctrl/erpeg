ID: 32-P004
Odpowiedź na: 32-G004
Od: programista
Do: grafik
Status: nowe
Akceptacja: decyzje właściciela z 11.10.2026 (cytaty niżej) – ZASTĘPUJĄ zakres z 32-P001/32-P002 tam, gdzie się różnią
Wykonanie: kod gazety przebudowany i wdrożony na serwer testowy (wygląd z kodu, czeka na grafikę); grafika z tego zlecenia jeszcze nie zrobiona
Dotyczy: zamówienie 32 – zaktualizowany, pełny zakres: gazeciarz, gazeta jako „prawdziwa gazeta”, wersja angielska

# 32-P004 — zaktualizowane zlecenie: gazeciarz + Kurier Parowy / The Steam Courier

## Decyzje właściciela (11.10.2026)
- „może stać na rogu ulic i wołać, ale fajnie jakby się odwracał w kierunku bohatera. nie musi chodzić” → **chód nie jest potrzebny** (rozstrzyga uwagę 2 z 32-G004).
- „Gazeta wygląda teraz jak okno windowsa, trzeba przerobić na widok bardziej growy” → gazeta to **zadrukowana kartka papieru leżąca na ekranie**, nie okno z ramką.
- „na pewno trzeba zmienić czcionkę na bardziej gazetową” → zrobione w kodzie (Playfair Display w tytułach, Old Standard TT w tekście).
- „wykorzystywać przede wszystkim do pisania wieści o nowych questach, zadaniach specjalnych” → pierwsza strona = wieści o zadaniach (właściciel pisze je w panelu).
- „gazeta ma być też po angielsku” → **każdy napis na grafice w dwóch wersjach: PL i EN**.
- „co któryś gazeciarz dawał questy, np. pomoc w roznoszeniu gazet … odpalenie gazeciarza ma nie zawsze włączać gazetę a najpierw dialog i wybór” → zrobione w kodzie.

## Jak to teraz wygląda w grze (test, kod – do podmiany grafiką)
Zrzuty: komputer 1440×900 i telefon 390×844 – poproś właściciela albo zajrzyj na https://exp-lore.app/test/ (gazeciarz → „📰 Poproszę Kuriera”).
- Kartka: kremowy papier z szumem kodu, postrzępione brzegi (clip-path), przybrudzone krawędzie, pionowe zagięcie na środku (komputer), lekki obrót −0,6°.
- Nagłówek: winieta PL (twoja 32-G003); dla EN – **napis z czcionki** (brak winiety EN).
- Pod winietą pasek działów między podwójnymi liniami: **Wieści · Ludzie · Z warsztatu · Zlecenie · Do redakcji** (EN: **News · People · Workshop · Assignment · Letters**), na telefonie ikona nad podpisem.
- Zamknięcie: czerwona „pieczątka” „✕ Złóż gazetę” / „✕ Fold the paper” w rogu.
- Wieści mają czerwoną „etykietę”: **Nowe zadanie / New quest**, **★ Zadanie specjalne / Special task**, **Wieści / News**.
- Przyciski akcji = czerwona pieczątka w podwójnej ramce („Biorę zlecenie”, „Wyślij list”).

## Do narysowania (kolejność = ważność)

### A. Winiety (najważniejsze – EN nie ma żadnej)
| Plik | Rozmiar | Uwagi |
|---|---|---|
| `winieta_en_poziomy.png` | 960×160 (siatka 240×40 ×4, jak PL) | „The Steam Courier”, ten sam styl, lokomotywa/smok jak w PL |
| `winieta_pl_telefon.png` | 640×192 (siatka 160×48 ×4) | „Kurier Parowy” – czytelny przy ~370 px szerokości |
| `winieta_en_telefon.png` | 640×192 | „The Steam Courier” |
Tło winiety może być przezroczyste albo papierowe – **dopasuj do papieru z punktu B**.

### B. Papier (żeby kartka nie była „z kodu”)
| Plik | Rozmiar | Uwagi |
|---|---|---|
| `papier.png` | 256×256, **bezszwowy** | kremowy (#efe3c4 ± 6 %), lekkie włókna, plamki, BEZ tekstu; będzie powtarzany pod treścią |
| `brzeg_gora.png`, `brzeg_dol.png` | 512×24, powtarzalne w poziomie | postrzępiona krawędź papieru z cieniem pod spodem (przezroczystość poza papierem) |
| `brzeg_bok.png` | 24×512, powtarzalne w pionie | lewy; prawy zrobię lustrem |
| `zagiecie.png` (opcjonalnie) | 32×512 | pionowe zagięcie gazety na środku kartki |

### C. Ikony działów – 24×24 (siatka 12×12 ×2), tusz na papierze (ciemnobrązowy #231a12 + czerwony #8e2318 dla aktywnej)
`ikona_wiesci.png` (gazeta/megafon), `ikona_ludzie.png` (puchar/medal), `ikona_warsztat.png` (zębatka + klucz), `ikona_zlecenie.png` (pióro), `ikona_list.png` (koperta z lakową pieczęcią). Każda w 2 wariantach: `_zwykla` i `_aktywna`. Bez napisów (podpisy daje kod w obu językach).

### D. Etykiety i pieczątki – BEZ TEKSTU (napisy w dwóch językach nakłada kod)
- `pieczatka_ramka.png` – 9-slice (np. 48×48, rogi 12 px), czerwony tusz, lekko nierówny – do przycisków i „Złóż gazetę”.
- `etykieta_zadanie.png`, `etykieta_specjalne.png` – małe ozdobniki 16×16 przed etykietą (np. zwój, gwiazda w kółku).
- `winieta_ozdobnik.png` – fleuron/rozdzielacz 64×12 między artykułami.

### E. Gazeciarz (stoi na rogu, odwraca się do bohatera)
Styl próby v2, klatki 64×64, stopy y=62, x≈32 (szczegóły w 32-P002):
1. `gazeciarz_gora_stoi.png` – tył (gdy bohater z północy; kod już wybiera tę klatkę).
2. `gazeciarz_dol_wola_1..3.png` – wołanie z uniesioną gazetą (pętla co kilka sekund).
3. **Gazeciarka** – front/bok/tył stoi + wołanie (imiona Mania, Zocha, Hela – dziś mają chłopięcą grafikę).
4. `znak_gazety.png` – 16×16 rulon gazety nad głową (dziś rysowany kodem).
5. (opcjonalnie) `gazeta_pod_drzwiami.png` 16×16 – gazeta wsunięta pod drzwi; pokażę ją przy domach w zadaniu „roznoszenie gazet”.

## Język
Wszystko z napisem (winiety) = **osobny plik PL i osobny EN**. Elementy B–E rysuj **bez liter**.

Paczki oznaczaj 32-G005, 32-G006…; zaczniesz od A – wstawię od razu, nie czekając na resztę.
