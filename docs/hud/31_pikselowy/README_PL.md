# Pikselowy HUD — 10.10.2026

Korekta po uwagach właściciela: wcześniejszy wariant30 był zbyt dosłowny i portrety nie pasowały do ludzików. Baniak i oprawa są rysowane w małej siatce pikseli, z ograniczoną mosiężną paletą. Nie zmieniano plików ilustracji. Życie zawsze na środku ekranu, największy przycisk; mniejszy zachodzący zbiornik wskazuje zapas do leczenia. Po lewej EXP i zwykła główka wybranego ludzika. Po prawej zaakceptowany aparat i jeden pojazd.

Komputer:400.5×141 pikseli ekranu, telefon:267×94. Obszary kliknięcia przynajmniej44×44. Posiadana hulajnoga ma pierwszeństwo (baterię odłożono na później), potem rower, a przy braku pojazdu rower przygaszony/nieaktywny. Numerowane nazwy zastąpiono opisami bez zmiany numerów zapisanych postaci.

Zrzuty z prawdziwej gry na lokalnym Vite preview: komputer1440×900, telefon390×844/DPR2 oraz mały telefon320×740/DPR2.625. JSON opisuje wyniki działania, nie tylko wygląd. Sprawdzono leczenie i zużycie zapasów, bonus zdrowia, blokadę podczas przeciągania, pojedynczy pojazd i wsiadanie/schodzenie, kamerę, kartę postaci,25 różnych główek zgodnych ze sprite'ami oraz obrót telefonu. Supabase w testach przechwycony — żadnych prawdziwych zapisów graczy.

Starsze wersje: docs/hud/29_baniak i30_centrowanie; oryginalne ilustracje w28_awatary pozostają do ewentualnego powrotu. W grze można porównać ?hud=old / ?hud=v5.

Nałęczowska16: osobny skrypt browser-building-presence.mjs sprawdza zwykłą postać, pierwszy odsłonięty widok i4 strony/powrót na komputerze i telefonie. Publiczna produkcja e0a27d0 również pokazała eLeader/id30667 z6 piętrami; osobne zrzuty produkcja*.png. Nie odtworzono braku zgłoszonego przez właściciela; nie zmieniano mapy bez potwierdzonej przyczyny.
