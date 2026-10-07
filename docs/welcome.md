# Strona powitalna exp-lore.app/welcome

Strona leży w `public/welcome/`. Adresy: https://exp-lore.app/welcome/ (produkcja) i https://exp-lore.app/test/welcome/ (serwer testowy).
Gra jej nie dotyka, więc można ją podmieniać w całości.

## Zasady dla ChatGPT (wklej mu to)
- Zrób **jedną stronę HTML** (`index.html`) z CSS i JS w środku albo w osobnych plikach obok. Bez Reacta, bez budowania – zwykłe pliki.
- Obrazki, czcionki itp. kładź obok (np. `obrazki/smok.png`) i odwołuj się **ścieżkami względnymi** (`obrazki/smok.png`, nie `/obrazki/...`), bo strona działa też pod `/test/welcome/`.
- Przyciski do gry muszą prowadzić dokładnie pod te adresy:
  - `../#nowa` – tworzenie nowej postaci,
  - `../#konto` – logowanie na konto (e-mail + hasło albo Google) i lista postaci,
  - `../#wczytaj` – wczytanie postaci imieniem i kodem.
- Logowania nie robimy na samej stronie powitalnej: przycisk przenosi do gry, która ma już gotowe okno logowania (Supabase). Dzięki temu nie trzeba nigdzie wpisywać kluczy.
- Mobile first: strona ma dobrze wyglądać na telefonie.

## Jak wgrać
Wyślij Claude pliki od ChatGPT (albo wklej kod). Claude wstawi je do `public/welcome/`, sprawdzi na telefonie i wyśle na serwer testowy.
