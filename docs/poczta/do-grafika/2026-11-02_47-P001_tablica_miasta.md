ID: 47-P001
Odpowiedź na: —
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel, 2.11.2026 („przygotuj zamówienie dla grafika na ikonkę”)
Wykonanie: —
Dotyczy: tablica z mapką miasta (nowe drogowskazy) – obiekt w świecie gry

# Zamówienie 47: tablica z mapką miasta

## Co to jest w grze
Zamiast starych drogowskazów w miastach stoją **tablice z mapką miasta**: przy wylotówkach, dworcach, dużych
rondach, głównych skrzyżowaniach i przy każdej armacie miejskiej („metro” – armaty strzelające ludźmi jak
w pinballu). Bohater podchodzi, naciska AKCJA i otwiera się mapka miasta wypalona w drewnie, z mosiężnymi
tabliczkami wylotówek (duże miasto + miejscowość po drodze), dworcami, armatami i „Tu jesteś”.

Teraz tablica w świecie jest rysowana kodem (tymczasowa): `src/art.ts`, funkcja `drawTablicaMiasta`,
44×48 px pokazane w połowie (22×24 px mapy) – patrz `47_tablica/obecna_w_grze_x2.png`.
Okno z mapką (dla porównania stylu): `47_tablica/okno_mapki_lublin.png`, `okno_mapki_krakow.png`.

## Co potrzebujemy
1. **Tablica w świecie** – jeden obrazek PNG, przezroczyste tło, twarda alfa (0/255), bez wygładzania:
   - **44×48 px** (gra pokazuje go w połowie, jak dziś), podstawa = środek dołu (tam, gdzie słupki stoją na ziemi);
   - widok jak cała gra: z góry pod kątem, lekko od przodu; obrys 1 px #1e1a24 jak postacie, światło z północnego zachodu;
   - wyraźnie wyższa niż postać (postać ma ~13 px mapy, tablica ~24 px mapy), żeby była widoczna z daleka;
   - motyw: **drewniana deska z wypaloną mapką miasta** (ciemne drewno, wypalony placek miasta, ciemniejsza plama
     jeziora, wyżłobione drogi, czerwona pinezka „tu jesteś”) w **mosiężnej ramie**, na dwóch mosiężnych lub
     drewnianych słupkach, z małą **mosiężną zębatką** albo daszkiem na górze; mosiądz, złoto, drewno – lekki
     steampunk jak reszta świata, nie realny znak drogowy;
   - plik: `tablica_miasta.png`.
2. **Wersja nocna** (opcjonalnie) – ta sama tablica z zapaloną małą lampką gazową nad mapką, 2 klatki migotania
   obok siebie (88×48 px), plik `tablica_miasta_noc.png`. W nocy gra doda jej ciepłą poświatę.
3. **Mała ikonka** (opcjonalnie) – ta sama tablica uproszczona do **16×16 px** (do legendy i mapy ekranu),
   plik `tablica_miasta_ikona.png`.

## Styl
Paleta świata (jak szyldy miejsc i armata), płaskie plamy koloru, bez gradientów „z AI”, bez napisów (napisy są
tylko w oknie mapki). Najpierw **1 próbka** punktu 1 do akceptacji właściciela, potem reszta.

## Jak oddać
Pliki do `docs/poczta/od-grafika/47_tablica/` + krótka wiadomość `RRRR-MM-DD_47-G001_…md` (ID, wersja plików,
co jest w środku). Ja podmienię rysunek z kodu na Twój (`useArtist` w art.ts) i odpowiem 47-P002 z tabelą,
co gdzie trafiło.
