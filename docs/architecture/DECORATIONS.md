# Dekoracje — sprite’y i specyfikacja

Pliki produkcyjne: `public/architecture/decorations.png`, `decorations.json`, `palette.png`. Źródło offline: `scripts/architecture/draw-decorations.py`. Nie ma proceduralnego rysowania zastępczych ozdób podczas gry w nowym wariancie.

Atlas ma 288 × 1344 px, klatki 48 × 64 px, sześć kolumn, 21 wierszy. Każda rodzina ma trzy warianty materiałowe i drobne różnice detalu. Kolejność rodzin: kocioł, Tesla, komin, wieża wodna, zbiornik, zawór, armata dekoracyjna; w każdej rodzinie warianty 0–2. Numer klatki: `(rodzina * 3 + wariant) * 6 + klatka`. Nieużywane klatki obiektów statycznych powtarzają rysunek.

| Rodzina | Kotwica geometrii | Animacja |
|---|---|---|
| Kocioł z rurą | kalenica | para, 6 klatek |
| Cewka Tesli | kalenica | iskra, 4 unikalne klatki |
| Komin | komin | dym, 6 klatek |
| Wieża wodna | kalenica / dach | statyczna |
| Zbiornik | kalenica / dach | statyczny |
| Zawór z rurą | ściana | statyczny |
| Armata dekoracyjna | kalenica / dach | statyczna |

Kotwica obrazu to `(24,54)`. Alfa wyłącznie 0 lub 255. Kontur to kolor 0 głównej palety, zgodny z drzewami; cienie/bazy/światła używają trójek z palety. Nie dodawać wygładzania, półprzezroczystego glow, gradientów, nowych odcieni ani pustych marginesów przesuwających kotwicę.

Kotwice mają pozycję 3D, normalną, rodzaj i wolną szerokość. Generator wybiera je deterministycznie, z uwzględnieniem `allowed_decorations`; poza przemysłem ogranicza dekorowane obiekty do jednej trzeciej strefy. Minimalna wolna szerokość 4 m ogranicza wystawanie sprite’a względem podstawy; odbiór granicy 30% dla wszystkich kątów i zasłaniania wymaga jeszcze testu w grze.

Funkcyjna armata transportowa, jej model, postacie, latarnie i istniejące przydrożne rury pozostają poza tą paczką. Podgląd: [artifacts/decorations-preview.png](artifacts/decorations-preview.png).
