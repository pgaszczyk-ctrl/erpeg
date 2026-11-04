ID: 35-P002
Odpowiedź na: 35-P001
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel 12.10.2026: „Na teście dodaj ikonki avatarów podczas rozmowy. Jeśli ludzik nie ma avatarka, to zleć grafikowi.”
Wykonanie: –
Dotyczy: zamówienie 35 – portrety rozmówców (co już jest w grze, czego brakuje)

# 35-P002 — portrety: co już działa, czego brakuje

## Stan w grze (serwer testowy, 12.10.2026)
- Okno rozmowy ma dwa mosiężne medaliony: **po lewej ten, z kim rozmawiamy, po prawej nasz bohater**.
- **Bohaterowie (25)** – gotowe. Użyłem portretów HUD z paczki 28 (`postac_01…25`), zmniejszonych do 192×192 (`public/portrety/bohater_NN.webp`). Nie trzeba ich rysować od nowa.
- **Wszyscy inni** – na razie zastępczo powiększona głowa z arkusza chodzenia (piksele 4×). Styl wyraźnie odstaje od malowanych portretów bohatera, dlatego potrzebne są prawdziwe portrety.
- **Miejsca** (sklep, szkoła, świątynia…) – na razie szyld miejsca. Sklepy mają już własne okno z banerem sprzedawcy (paczka 26), więc ludzie z miejsc mogą poczekać.

## Format (jak portrety bohaterów z paczki 28)
- Popiersie, ten sam malowany styl i żywe kolory co `postac_01…25`, przezroczyste tło, bez ramki (ramkę rysuje gra), bez napisów.
- Kwadrat; oddaj oryginał (np. 1254 px) – zmniejszę sam do 192 px.
- **Nazwa pliku = nazwa arkusza postaci**, np. `gazeciarz.png`, `mieszkaniec_03.png`. Gra sama dopasuje portret do wszystkich wariantów kolorystycznych tego arkusza.

## Lista brakujących portretów (kolejność = ważność)
1. Postacie stałe i z zadań: `gazeciarz` (+ gazeciarka, gdy będzie arkusz), `woznica` (też konduktor), `mag` (Mag Albrecht / wędrowni mędrcy), `siostra_margo`, `dziadek_marek`, `babcia_iwonka`, `babcia_grazynka`, `luigi`, `martin`, `pies`.
2. Mieszkańcy: `mieszkaniec_01` … `mieszkaniec_15` (każdy wygląd przechodnia; ci sami ludzie są też mądralami z zagadkami i postaciami w misjach).
3. Później (opcjonalnie): bossowie do rozmowy przed walką – `herszt`, `koziol`.

## Próba najpierw
3 portrety: `gazeciarz`, `woznica`, `mieszkaniec_08` (pani). Odpowiedź oznacz 35-G001.
