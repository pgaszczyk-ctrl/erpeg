# 44-G005 — pełniejsze modele z profilu

Korekta poprzedniej czwórki: chochlik, bandyta, zombiak i Upiór krypty.

- Głowy i ich detale: głębokość +25%.
- Tułowia i ubrania/szata: głębokość +55%.
- Biodra +35%, kończyny +20%, stopy +15%, boczne poły szaty +45%.
- Wysokość i szerokość geometrii w spoczynku bez zmian. Objętość zapisana bezpośrednio w geometrii, bez rozciągania hierarchii w czasie animacji.
- Te same rotacje, czasy klipów i zdarzeń. Dopasowane punkty chwytu oraz emitery na twarzy. Przeliczone normalne i podparcie nad podłożem.
- Liczba trójkątów bez zmian. Zatwierdzone pliki wilka i szkieletu identyczne.

Podglądy: `partia2_profil_porownanie.png`, `partia2_ruch.gif`, `partia2_ataki.gif`, `podglad_44.html`.

Weryfikacja: geometria i animacje sześciu modeli, kontrola chwytu sztyletu, rzutu, powłóczenia nogą i lewitacji/śmierci Upiora. Rotacje i czasy porównano z G004. JS/Python zgodne; test JS używa atrap WebGL. Nie wykonano testu rzeczywistego GPU/telefonu ani wdrożenia do gry.

Ta korekta dotyczy poprzedniej, dostarczonej partii. Wodnik, Driada, Herszt, Warg i Mosiężny Kozioł pozostają oddzielną rozpoczętą partią; nie są zawartością tej paczki.
