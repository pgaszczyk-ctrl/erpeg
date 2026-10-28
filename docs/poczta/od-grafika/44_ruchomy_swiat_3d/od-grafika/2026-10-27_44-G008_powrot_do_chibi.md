# 44-G008 — powrót do proporcji i postawy chibi

Właściciel odrzucił sylwetki mieszkańców G007 jako zbyt odległe od chibi Strażnika i zlecił sprawdzenie zombie. Porównanie z aktualnym Strażnikiem 16 potwierdziło: nogi były za długie i cienkie, stopy i dłonie za małe, sylwetka zbyt smukła. Poprzedni podgląd używał starszego Strażnika.

Właściwy wzorzec pochodzi z aktualnej paczki `EXP-LORE_szesc_modeli_pakiet.zip`: `referencja/straznik_chibi_16_oryginal.glb`. Do podglądu służy `straznik_chibi_wzorzec.glb`, jednolicie przeskalowany do wysokości 1,25 i ustawiony na podłożu, bez zmiany proporcji i klipów. Stary model zachowano archiwalnie, nie jako wzorzec stylu.

## Zmiany

- 15 mieszkańców: sześć baz przebudowanych na krótkie, grubsze nogi, szerokie stopy i stabilny rozstaw, większe dłonie i głowy, zwarty tułów. Trajektorie stóp przeliczono. Dzieci są niższe, seniorzy zachowują spokojniejszy chód.
- Zombie, Bandyta, Chochlik, Wodnik, Driada, Herszt, Mosiężny Kozioł: długość kości nóg 52% poprzedniej, szersza postawa, mocniejsze kończyny, większe stopy, dłonie i głowa. Zachowano głębokość brył z G005.
- Zombie zachowuje pochyloną głowę, szurający nierówny chód i brak gore. Poprawiono proporcje, zachowując jego charakter.
- Herszt: dopasowano tor uderzenia pałką do krótszych kończyn; stopy pozostają na podłożu przy trafieniu.
- Szkielet i Wilk bez zmian, zgodnie z akceptacją. Warg, pies, blob i unoszący się Upiór także zachowane.

Czasy klipów, momenty trafień, emisji i rzutów oraz odległości ruchu korzenia pozostają zgodne z poprzednimi opisami. Zmieniono geometrię i pozycje stawów; nie spłaszczono całej postaci. Chwyty broni i rekwizytów zachowano. `chibi_style.py` stosuje końcową korektę dokładnie raz, po zbudowaniu siedmiu humanoidów. Mieszkańcy mają nową bazę w `build_batch4.py`.

## Stała zasada

Przed KAŻDĄ nową partią lub poprawką przeczytać `AGENTS.md` i `referencja/STYL_CHIBI.md`, obejrzeć aktualny wzorzec i porównać jedną nową sylwetkę z przodu/boku/tyłu oraz w ruchu, w tej samej skali. Same testy techniczne nie oznaczają zgodności stylu.

## Podglądy i kontrola

`G008_porownanie_chibi.png`: Strażnik obok zombie i mieszkańca przed/po, dodatkowo przód/bok/tył. `G008_chibi_ruch.gif`: aktualne modele w ruchu obok statycznego wzorca. `podglad_44.html`: wszystkie modele z aktualnym Strażnikiem.

Aktualne GLB w `44_ruchome_3d/modele/`; nazwy i klipy pozostają zgodne. Opisy G004–G007 są historyczne, a G008 określa bieżące bryły. Stare sumy kontrolne siedmiu humanoidów celowo zmieniono; kontrola nadal chroni nieobjęte poprawką modele. Ponownie wygenerowano plansze i GIF-y zmienionych partii.

Kontrole geometrii, normalnych, podłoża i zapętleń, gripów i proporcji oraz porównanie samplerów JS/Python. PNG/GIF są renderowane z rzeczywistych GLB. Nie wykonano rzeczywistego testu GPU ani fizycznego telefonu i nie wdrożono do gry.
