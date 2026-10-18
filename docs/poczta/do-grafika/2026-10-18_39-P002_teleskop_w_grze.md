ID: 39-P002
Odpowiedź na: 39-G002 (teleskop_v2, layout.json); 39-G001 (próba v1)
Od: programista
Do: grafik
Status: nowe
Akceptacja: właściciel przekazał teleskop_v2 do wdrożenia (18.10.2026: „Tutaj masz opis i pliki do huda. Próbna animacja grafika wyszła kiepsko, ty zrobisz to lepiej.”)
Wykonanie: wdrożone na serwerze testowym (tylko z walką turową); produkcja bez zmian
Dotyczy: menu teleskopowe w grze

# Teleskop w grze

Odbieram 39-G002, czyli `hud39/teleskop_v2/grafiki` (18 warstw) i `layout.json`.
Warstwy są skopiowane bez zmian do `public/hud/teleskop/`. Gra niczego w nich
nie przelicza: rysuje je 1:1 na telefonie i ×2 na komputerze, ostro (pixelated).

## Co gdzie trafiło

| Warstwa | Gdzie w grze | Jak sprawdzone |
|---------|--------------|----------------|
| A_portret_oprawa | medalion w lewym górnym rogu; twarz bohatera w oknie 36×36 rysuje gra | zrzuty pc / telefon 390 / 320 |
| A_exp_obudowa + A_exp_wypelnienie | rurka EXP obok medalionu; wypełnienie gra obcina szerokością | EXP 400 → widoczny udział |
| A_poziom_pusty | tabliczka pod rurką; cyfrę rysuje gra | poziom 3 na zrzutach |
| A_awans_1–3 | błysk przy awansie, 2 przejścia | ręcznie w przeglądarce |
| C_normalny / C_wcisniety / C_aktywny / C_niedostepny | gniazda 4 przycisków; aktywne = jedziesz pojazdem, niedostępne = brak pojazdu | test + zrzuty |
| D_menu, D_dziennik, D_aparat, D_welocyped, D_hulajnoga | ikony w gniazdach; pojazd pokazuje to, co bohater ma | test |
| E_lacznik_12x8, E_zaslepka_12x6 | rurka teleskopu między gniazdami i zaślepka pod medalionem | zrzut „w ruchu” |
| (wypełnienie EXP przebarwione na czerwono) | rurka życia pod EXP, **tylko gdy bohater jest ranny**; dotknięcie leczy | test: hp 3 → dotknięcie → pełne |

## Animacja

Animację robi kod, nie GIF. Przyciski wysuwają się jeden po drugim
(co 55 ms, każdy przez 120 ms, z łagodnym hamowaniem na końcu). Każdy wychodzi
spod poprzedniego, a łącznik rośnie razem z nim. Całość trwa ok. 0,3 s,
pozycje zaokrąglamy do pełnych pikseli. Ruch można odwrócić w połowie.
Przy zwijaniu przyciski wracają w odwrotnej kolejności.

- Pierwsze dotknięcie portretu rozwija kolumnę. Przycisk działa dopiero
  wtedy, gdy kolumna jest rozwinięta (nie w trakcie ruchu).
- Kolumna zwija się po wyborze i sama po 4 s.
- Kufer otwiera pierwsza pozycja menu z kołem zębatym
  („🧳 Kufer – postać, ekwipunek, zasoby”). Dziennik otwiera Kufer na zadaniach.
- W walce turowej teleskop chowa się, bo walka ma własny panel.

## Testy

`scripts/tests/browser-hud-teleskop.mjs`: komputer 1280×800 oraz telefon 390
i 320 px. Wszystkie przechodzą. Testy walki turowej i areny też przechodzą.
Na 320 px tabliczka mapy schodzi pod rurki, bo obok się nie mieści.
Zrzuty: `39_hud/w_grze/`.

## Otwarte

- Herszt v4 z 39-G001 nie jest jeszcze w grze (osobna sprawa, czeka).
- Brakuje ikony leczenia F2 (flaszka/jabłko) i małego kotła F. Na razie
  życie to czerwona rurka z licznikiem leczeń. Jeśli właściciel zechce kocioł,
  proszę o F i F2 z 39-P001.
