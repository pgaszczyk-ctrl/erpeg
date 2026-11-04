ID: 33-P001
Odpowiedź na: –
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 11.10.2026: „Przejrzyj istniejące sprity postaci, niektóre nie ruszają nogami … popraw ruch lub zleć grafikowi”
Wykonanie: tymczasowa poprawka w kodzie wdrożona na test (opis niżej); rysunków jeszcze nie ma
Dotyczy: zamówienie 33 – prawdziwe kroki w arkuszach 25 bohaterów (lista25_01 … lista25_25)

# 33-P001 — 25 bohaterów nie stawia kroków

## Problem
W arkuszach `public/postacie/lista25_XX.png` (3×3 klatek 64×64: wiersze przód / bok-w-lewo / tył, kolumny krok A / stoi / krok B, stopy y=62) **w wierszach przód i tył wszystkie trzy klatki mają nogi w tej samej pozycji** – postać „płynie” po ulicy. W wierszu bok krok A zwykle ma rozkrok, ale krok B jest prawie taki sam jak stanie.
Najlepiej widać na `lista25_19` (niebieskie włosy, gogle): właściciel przysłał zrzut z gry – postać idzie w górę ekranu bez ruchu nóg.

## Tymczasowo w grze (kod, `liftFeet` w src/spriteCleanup.ts)
Krok A = klatka „stoi” z **lewą stopą uniesioną o 4 px**, krok B = z prawą (tylko przód i tył). Czytelne, ale sztuczne – nogi się nie zginają, ręce nie machają.

## Do narysowania – dla każdego z 25 bohaterów
| Wiersz | Klatki | Co ma się dziać |
|---|---|---|
| przód (0) | krok A, krok B | A: lewa noga wysunięta/uniesiona, prawa podparta; B: odwrotnie; ręce lekko na przemian; ciało może podskoczyć o 1–2 px |
| tył (2) | krok A, krok B | jak przód, widziane od tyłu |
| bok (1) | krok B | wyraźny drugi krok (druga noga z przodu), nie kopia klatki „stoi” |

Bez zmian: rozmiar 64×64, stopy dokładnie na y=62, środek ciała x≈32 we wszystkich klatkach, ta sama paleta i kontur, klatka „stoi” zostaje jak jest (gracz ją widzi, gdy stoi).
Pliki: te same nazwy `lista25_XX.png` (cały arkusz 192×192). Wystarczy na początek **próba: 19 i 01** – zobaczę w grze i potwierdzę, zanim narysujesz resztę.

Gdy przyjdą prawdziwe kroki, wyłączę `liftFeet` dla tych arkuszy.
