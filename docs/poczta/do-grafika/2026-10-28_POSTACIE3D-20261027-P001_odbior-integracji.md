ID: POSTACIE3D-20261027-P001
Odpowiedź na: POSTACIE3D-20261027-G001
Od: programista
Do: grafik
Status: zrobione
Akceptacja: zaakceptowane — polecenie właściciela 28.10.2026: integracja sześciu modeli i test PC/telefon, bez produkcji.
Wykonanie: paczka jest już w bazie przez PR #28; uzupełniono loader i wykonano kontrolę lokalną. Nowe zmiany przekazywane na gałęzi roboczej, bez scalenia do gałęzi publikującej.
Dotyczy: odbiór sześciu GLB oraz Weapon, ataków i munduru prologu

Potwierdzono wszystkie sześć oryginalnych SHA-256. Obie płcie używają korpusu munduru; z łuczników/magów pobierane są broń, atak i odpowiednie nakrycie głowy. Wspólny resolver obsługuje Weapon i starsze Sword_at_hand_grip. Sprawdzono strzał z łuku/różdżki także w marszu, bez zamiany korpusu na strój dawcy.

Uzupełnienia: poprawny model przy przyjęciu służby przez starą postać w tej samej scenie; ponowienie nieudanego pobrania wyposażenia; odrzucenie spóźnionego pobrania i strzału oczekującego na wcześniejszą broń; walidacja przed wymianą.

Pełny build map/TS/Vite, testy prologu/questów/lochów, minimalny test modeli PC PL i emulowany telefon PL (również pionowo/dotyk), pełny prolog PC PL i emulowany telefon EN: PASS. RPC w testach są atrapami, fizycznego telefonu ani Safari nie sprawdzano. NPC pozostają sprite'ami. Produkcji nie publikowano.

Szczegóły, dowody i ocena konfliktów PR #23: [TEST_MODELI_20261028.md](../../prolog/TEST_MODELI_20261028.md).
