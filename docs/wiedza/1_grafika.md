# Exp-lore – wiedza dla czatu 🎨 Grafika

## Kierunek artystyczny (decyzje właściciela)
- **Nie robimy pixel-artu świata.** Wzorem jest malarski wygląd kukieł treningowych. Najpierw zbieramy, czego potrzebuje grafik, zamiast budować to w kodzie (ZAMOWIENIE_08_malarski_swiat).
- Jeden styl: punktem odniesienia są postacie i stonowane tekstury ziemi oraz dachów. Obrysy w kolorze postaci (#1e1a24), cienkie; właściciel chce **obrysów nieczarnych**, także u ludzików.
- Perspektywa obiektów: prawie z góry (zbyt boczny „garniec” nie pasował). Cienie jako osobne pliki `_cien.png`; cień pod wozem nie może leżeć pod jednym kołem.
- Lekki, bajkowy steampunk jako ozdoba (para, mosiądz, latarnie). Opis świata dla grafika: `docs/paczka-dla-artysty/STYL_SWIATA_steampunk.md`.
- Odrzucone: modułowe postacie 24×30 („fatalnie wyglądają”), zbyt wygładzone wozy (zmniejszone do „grubszego piksela”).
- Ściany budynków mają tylko 3 wysokości (parter / 2 piętra / 3+), żeby nic nie zasłaniało ulic. Wielkie gmachy (galerie, dworce) gra dzieli na 2–5 części; zamki, pałace i kościoły zostają w całości. **Zamek z własną grafiką** (może inny w każdym kraju) czeka na zamówienie.

## Paczka dla grafika
- Jedna paczka: `docs/paczka-dla-artysty/` (CZYTAJ_MNIE.md/.html = wszystkie wytyczne, wzory arkuszy, obecne grafiki ×4, ikony przedmiotów, zrzuty z gry). Po każdym odświeżeniu **zip wysyłamy właścicielowi**.
- Metoda, która działa: grafik robi podgląd → właściciel akceptuje → pliki produkcyjne są wycinane z podglądu (nigdy przerysowywane skryptem).
- Zamówienia po kolei: swiat_01, swiat_02, 03 (duża partia), 04 (mgła i dekoracje), 05 (miejsca i postacie), 06 (chodzenie i reszta), 07 (trening i reszta świata), **08 (malarski świat + część G: śnieg, kałuże, parasole, blob, wodnik, smoki ognisty i wodny)**. Zamówienie 08 czekało na akceptację właściciela przed spakowaniem.

## Postacie
- Arkusze grafika: 192×192 = 3×3 klatki po 64 px (rzędy: dół / bok w lewo / góra; kolumny: krok A / stoi / krok B; stopy na 62 px) + maska ubrań (czerwony = ubranie, zielony = drugi kolor), z której gra robi warianty kolorów.
- Bohaterowie: 10 (wędrowiec, rycerz, łuczniczka + bohater_04–10). Mieszkańcy: mieszkaniec_01–15 × kolory strojów. Wrogowie: chochlik, driada, zombie, szkielet, bandyta, herszt (pakiet „wrogowie v1”). Postacie stałe: mag, siostra Margo, dziadek Marek, babcia Iwonka, babcia Grażynka, Luigi, Martin, woźnica.
- Znane problemy do poprawy przez grafika: kroki A i B zbyt podobne (postacie „lewitują”), stojąca klatka przesunięta względem kroków, spódnice „ucięte” w krokach (mieszkańcy 11 i 15 wyłączeni), za szczegółowe zabytki (kocioł, fontanna, wieża – prosimy o 8–12 kolorów), spłaszczona wieża zegarowa.
- Wzór stylu postaci (od właściciela): `1_format/wzor_stylu_postaci_trener_biegaczka.png` (klatki 192 px). Postacie trenera i biegaczki są wyłączone, bo nie pasowały do klimatu.

## Świat (obrazki już w grze, `public/swiat/`)
- Ziemia: trawa, bruk, plac, park, las, woda, pole, zarośla, droga. Dachy: dachówka czerwona i brązowa, łupek. Ściany frontowe (gładka / okno / drzwi).
- Latarnie gazowe (dzień/noc), kominy parowe, ławki, kosze, kratki z parą, hydranty, słupy ogłoszeniowe, zegar, donice, skrzynki, bicykle, słupy poczty pneumatycznej.
- Drzewa, krzewy, grzyby, kłody, sosny. Kukły treningowe, tarcza, kryształ magii (3 klatki).
- Zabytki: wieża zegarowa, smocza fontanna, smoczy kocioł (świeci po zadaniu Martina). Drogowskaz.
- Wozy konne: 3 ładunki × 3 maści, 2 klatki. Szyldy miejsc: 12 rodzajów (sklep, szkoła, kościół, urząd, szpital, policja, biblioteka, hotel, bank, alchemik, sklep sportowy, kemping).
- Mgła wojny: nieznany teren to stary pergamin grafika; teren znany, ale niewidoczny, przykrywa jasna mgiełka.

## Czego jeszcze brakuje (rysowane przez kod, do przerysowania)
- Plansza wszystkich obrazków rysowanych przez kod: `5_zrzuty_z_gry/do_przerysowania_grafiki_z_programu.png`.
- Wóz kupca i jego szyld, przedmioty do podniesienia, smok i jego cień, pies, świnka, ikony HUD, efekty (iskry, czary), parasole, wodny blob, wodnik (dziś to zielony zombie przebarwiony na niebiesko), śnieg na ziemi, kałuże, ogródki działkowe (dziś płaska zieleń), płoty (są, ale nieużywane), ikony pól z warzywami.
- Planowany wygląd ekranu (zgłoszenia 25 i 28, czekają): twarz bohatera i serca w łuku w prawym dolnym rogu, przyciski w łuku, gwiazdki EXP poziomo, owoce i serca w lewym dolnym rogu.
- Ikony przedmiotów: 16×16 px, obrys 1 px #1e1a24, przezroczyste tło, bez wygładzania (`public/items/<id>.png`).
