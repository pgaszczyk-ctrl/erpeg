# Notatka na rano 12.10.2026 – avatary w oknie rozmowy (właściciel, 11.10 wieczorem)

Właściciel: „przy przyjmowaniu questów chciałbym też widzieć z kim rozmawiam … przygotuj miejsce w oknie rozmowy, na razie wstawiając placeholder u góry okienka z rozmową lub po lewej stronie (a po prawej »nasz« avatar). Tę zmianę potraktuj jak notatkę, możemy wrócić do jutro rano.”

Do zrobienia (po rozmowie z właścicielem):
- UIScene.showDialog: miejsce na portret po lewej (rozmówca) i po prawej (bohater – jego głowa jak w HUD, `setHudAvatar`), na telefonie mniejsze lub nad tytułem.
- DialogRequest: nowe pole `kto?: { portret?: string; imie: string }`; GameScene podaje je w missionDialog, sklepach, urzędach, rozmowach z mieszkańcami, gazeciarzu.
- Placeholder do czasu grafiki: sylwetka/monogram w mosiężnym medalionie albo powiększona głowa z arkusza chodzenia postaci (już mamy dla bohaterów i mieszkańców).
- Grafika: zlecenie 35-P001 (docs/poczta/do-grafika/2026-10-11_35-P001_avatary_rozmow.md).
