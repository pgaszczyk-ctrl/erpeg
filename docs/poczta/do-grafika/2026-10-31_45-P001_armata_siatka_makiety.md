ID: 45-P001
Od: programista
Do: grafik
Status: nowe
Odpowiedź na: —
Akceptacja: oczekuje (właściciel wybierze jedną z 3 makiet)
Wykonanie: —
Dotyczy: miejska armata (szybka podróż) – 3 makiety z siatką łapiącą podróżnych, w skali 4× strażnik

# Zamówienie: 3 makiety miejskiej armaty z siatką

## Co już działa w grze (test)

- Podróż armatą po mieście (`src/artillery/`): gracz staje przy armacie, wchodzi do lufy i zostaje wystrzelony na wybrany punkt miasta. Mechanika jest gotowa i działa.
- Obecny model: mosiężna armata na kołach (żółtawy metal, ciemny korpus, lufa skierowana w bok). Strażnik to model 3D (chibi, duża głowa, krótkie nogi, granatowy mundur z guzikami). Model armaty możesz potraktować jako punkt wyjścia.
- Brakuje tylko **siatki łapiącej**: po wylądowaniu podróżny ma być zatrzymany przez siatkę, a nie spadać na ziemię.

## Co mam od Ciebie

Trzy **koncepcje** (makiety), różniące się ideą, a nie tylko kolorem. Najpierw tylko te trzy. Pełnej produkcji, animacji i modeli 3D jeszcze nie zamawiamy – właściciel wybierze jedną.

## Skala

- Armata ma być **4× wyższa niż strażnik** (strażnik = 1 jednostka wysokości; armata, mierzona od ziemi do wylotu lufy, ma mieć około 4 jednostek).
- Na każdym rysunku strażnik stoi obok armaty w tym samym powiększeniu, żeby było widać proporcje.
- Podaj w opisie wymiary każdej części w jednostkach strażnika (np. „lufa 3,2 · średnica wylotu 1,1 · szerokość siatki 2,5”).

## Ujęcia (dla każdej makiety, 3 pliki PNG)

1. Widok z przodu, na wysokości oczu strażnika.
2. Widok z boku.
3. Widok 3/4 z góry (kamera gry patrzy pod kątem ok. 22° od góry, więc tak ma wyglądać ujęcie).

Tło: płaskie, jasne, bez cieni (sam przedmiot, strażnik i delikatny cień pod nimi). Rozmiar 1024 × 1024 px, przezroczyste tło w wersji końcowej.

## Styl

- Steampunk, lekka bajkowość, czytelne sylwetki. Nie realizm.
- Kontur: 1 px, kolor #1e1a24 (taki sam jak u postaci).
- Paleta: kolory z `PALETA_SWIATA` (src/content/paleta.ts) – mosiądz, stal, drewno, ciemny granat, czerwone akcenty.
- Bez napisów, logotypów firm i flag na samej armacie.

## Trzy kierunki do narysowania

**A. „Mosiężny moździerz”** – krótka, gruba, prawie pionowa lufa jak moździerz. Podstawa z dwoma kołami. Siatka wisi jak kosz ze spiralnych sprężyn na ramie nad wylotem, po wylądowaniu sprężyny zamortyzują upadek. Najbardziej „bajkowa”, najmniej mechaniczna.

**B. „Parowa armata na wozie”** – długa lufa poziomo, na wozie z kotłem parowym z boku (para z kominka). Siatka rozłożona jak hamak między dwoma słupami przed wylotem, zwijana na bębnie. Najbardziej „steampunk”, najwięcej rur.

**C. „Obrotowa armata z ramieniem”** – lufa na obrotowej wieży z zębatkami, z boku lampa sygnalizacyjna. Siatka na składanym ramieniu, które wysuwa się i otwiera jak żagiel. Najbardziej mechaniczna i czytelna z daleka.

Każda makieta musi pokazywać, **gdzie wchodzi strażnik** (otwór lufy) i **gdzie ląduje podróżny** (środek siatki).

## Co oddać

Dla każdej koncepcji (A, B, C), w folderze `od-grafika/45_armata/`:

- `A_moździerz.png`, `A_bok.png`, `A_gora34.png`
- `B_…` i `C_…` analogicznie (łącznie 9 PNG)
- `A.md`, `B.md`, `C.md` – krótki opis: nazwa, wymiary części, wejście/lądowanie, co zmienia się względem obecnej armaty, jakie elementy mogą się poruszać (lufa, siatka, koło, para).
- Na końcu jedna krótka notatka: którą koncepcję polecasz i dlaczego (2–3 zdania).

Nie rób animacji ani modeli 3D na tym etapie. Jeśli rysujesz w 3D, też dobrze – zapisz wtedy zrzuty ekranu, a pliki modelu oddaj dopiero po wyborze.

## Potwierdzenie

Odpowiedz w `od-grafika/` plikiem z ID `45-G001`, w polu „Odpowiedź na” wpisz `45-P001`, i podaj, co zrobiłeś oraz ile to zajęło.
