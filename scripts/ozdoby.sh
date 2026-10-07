#!/bin/sh
# Ozdoby steampunkowe od grafika (zamówienie 15) → public/swiat/ozdoby/, w rozmiarze naszych budynków:
# rozmiary ×1,25 pierwszej tabeli zamówienia (nasze poziomy budynków to ~0,56 makiety; ×1 gubiło rysunek, ×1,5 nie mieści się na ścianie).
# Źródła (duże rysunki na magencie) i skrypt grafika z paletą świata: scripts/ozdoby-zrodla/.
set -e
cd "$(dirname "$0")/ozdoby-zrodla"
O=../../public/swiat/ozdoby
mkdir -p $O
w() { python3 wyrownaj_klatki.py "ozdoba_$1.png" "$O/$1.png" $2 $3 $4; }
w manometr 10 12
w zawor 11 11
w lampa_scienna 9 12 2
w zegar 12 12
w zebatka 13 13
w bulaj 10 10
w wentylator 13 13 3
