# Asynchroniczne PvP – plan (do akceptacji)

Ustalenia właściciela (18.10.2026): walki na stadionach, ranking i liczba wygranych, **wpisowe 100 monet, 150 za zwycięstwo**, przeciwnikami są „duchy” innych postaci na poziomie **±1**. Dodatkowo sztuczne miejsce walki poza mapą.

Wszystko oparte na obecnej walce turowej (`src/walka/`): duch walczy jak dziś wrogowie, tylko ma zdolności bohatera.

## 1. Jak to wygląda dla gracza

1. Na stadionie stoi **Sędzia Areny** (Cech Zbrojmistrzów – steampunkowy organizator turniejów). Rozmowa: „Walka rankingowa (100 💰)”, „Ranking”, „Moje walki”.
2. Gra losuje rywala: zapisany obraz innej postaci (poziom ±1, jej broń, zbroja, umiejętności, życie, wygląd). Pokazuje imię, poziom i liczbę wygranych – zanim zapłacisz.
3. Walka turowa na płycie stadionu (albo na arenie poza mapą, p. 3). Duch rusza się i bije sam, jak potwory.
4. Wygrana: **150 monet** (czyli +50 na czysto), punkty rankingu, +1 do licznika wygranych. Przegrana: przepada wpisowe, nic więcej (bez utraty serc, bez śmierci – jak pojedynek z mieszkańcem).
5. Po walce bohater ma pełne życie (jak po każdej walce turowej). Mikstury użyte w walce PvP **nie znikają** z plecaka – w PvP każdy dostaje ten sam zestaw: 1 leczenie na walkę. Inaczej bogatszy wygrywa zapasem mikstur, nie umiejętnością.

## 2. Rywale („duchy”)

- Duch = migawka postaci zapisywana przy każdym zapisie gry: poziom, życie, broń/zbroja/hełm/buty/tarcza, umiejętności, wygląd, imię. Nowa tabela `arena_duchy` (jeden wiersz na postać, nadpisywany).
- Dobór: poziom ±1, nie ta sama postać, nie postacie testowe (Arceus, Jam), nie umarłe, ostatnio grane (np. 30 dni). Losowo, ale bez tego samego rywala dwa razy z rzędu.
- Brak rywala na tym poziomie (na początku będzie mało graczy): **Mechaniczny Gladiator** – automat Cechu, zbudowany jak przeciętna postać na tym poziomie. Dzięki temu PvP działa od pierwszego dnia.
- **Obrona ducha** (propozycja): gdy twój duch wygra, dostajesz 30 monet z wpisowego przegranego i wiadomość w Kurierze („Twój duch obronił się 3 razy”). Gdy przegra – nic nie tracisz. To daje powód, żeby się rozwijać, nawet nie grając na arenie.

## 3. Gdzie walczyć

| Miejsce | Skąd | Uwagi |
|---|---|---|
| **Stadiony** (główne) | OSM `leisure=stadium` + duże boiska (już wykrywane, `Training`) | Walka na prawdziwej płycie. Arena Lublin, stadiony w każdym mieście świata. |
| **Hale sportowe** | OSM `sports_centre` | Ten sam Sędzia, mniejsze pole walki. |
| **Arena Cechu (poza mapą)** | sztuczna, jedna na całą grę | Wejście przez dowolnego Sędziego. Okrągła płyta z mosiężnymi barierkami, parą, trybunami. Ten sam układ dla wszystkich = uczciwe warunki (na prawdziwej mapie raz trafi się drzewo, raz ściana). Polecam ją jako **domyślne pole walk rankingowych**, a stadion na mapie jako wejście. |
| Tawerna magicownia.pl (Guliwera) | stała postać | Później: towarzyskie walki bez wpisowego i bez rankingu. |

Arena poza mapą technicznie: mała stała mapa (jak mapy miasteczek), ładowana na czas walki; bohater wraca potem dokładnie tam, gdzie stał przy Sędzim.

## 4. Ranking i liczniki

- Punkty jak w szachach (ELO): wygrana z silniejszym daje więcej, z słabszym mniej. Start 1000.
- Licznik wygranych i przegranych w Księdze osiągnięć + pieczęcie: 10 / 50 / 100 / 500 wygranych.
- **Ranking tygodniowy** w Kurierze Parowym (strona „Ludzie” już istnieje): top 5 świata / kraju / miasta, jak spacerowicze. Sezon co tydzień od nowa, ranking ogólny zostaje.
- Postacie testowe nigdy w rankingu.

## 5. Ekonomia (sprawdzone z resztą gry)

- Wpisowe 100 / nagroda 150: przy 50% wygranych gracz traci średnio 25 monet na walkę → arena **wyciąga złoto z gry** (dobrze, bo dziś złoto się tylko gromadzi). Dobry gracz zarabia.
- Ryzyko: duch sterowany przez grę jest słabszy niż człowiek, więc gracze mogą wygrywać 70–80% walk i „farmić” złoto. Zabezpieczenie: **limit 10 płatnych walk dziennie** (potem walki tylko o ranking, bez nagrody) i duch walczący trochę mądrzej niż zwykły potwór (leczy się przy niskim życiu, używa mocnego ciosu).
- Liczby (100/150/30/limit) w jednym miejscu, jako pokrętła w panelu admina.

## 6. Uczciwość

Dziś wynik walki liczy telefon. Przy nagrodach w złocie ktoś mógłby wysłać „wygrałem” bez walki.
- Etap 1 (wystarczy na start): serwer wydaje „bilet walki” (rywal + ziarno losowania), przyjmuje wynik tylko z ważnym biletem, pilnuje limitu dziennego i czasu walki, zapisuje podejrzane serie (np. 30 wygranych z rzędu) do panelu admina.
- Etap 2: serwer sam odtwarza walkę z zapisu ruchów (ten sam kod walki uruchomiony na serwerze) – dopiero wtedy wynik jest w 100% pewny.

## 7. Kolejność prac

1. **Etap 1 (TEST, ~kilka dni):** tabela duchów + zapis migawki, Sędzia na stadionach, dobór rywala ±1, walka z duchem w turach (wróg z broniami i zdolnościami bohatera), wpisowe/nagroda/limit, licznik wygranych, prosty ranking w Kurierze.
2. **Etap 2:** Arena Cechu poza mapą, obrona ducha + wiadomości, sezony tygodniowe, pieczęcie.
3. **Etap 3:** weryfikacja na serwerze, walki towarzyskie w tawernie, a potem ewentualnie PvP na żywo (zaproszenie znajomego kodem, tura po turze).

## 8. Do decyzji właściciela

1. Domyślne pole walki: Arena Cechu poza mapą (polecam) czy płyta prawdziwego stadionu?
2. Obrona ducha (30 monet dla właściciela ducha za wygraną) – tak/nie?
3. Limit 10 płatnych walk dziennie – tak/inna liczba?
4. Wspólny zestaw w PvP (1 leczenie, bez zużywania mikstur z plecaka) – tak?
