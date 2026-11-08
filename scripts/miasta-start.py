"""Cities a new character may name as the start (owner, 8 Nov 2026: „zezwól na start w dowolnym miejscu”).
Writes public/miasta-start.json = [[names joined by '|', lat, lon, population], ...] from the world artillery list
(cities >= 100k) and the Polish towns of the city boards (>= 1500 people), plus Polish names of big foreign cities.
Run: python3 -I scripts/miasta-start.py"""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
PO_POLSKU = {
  'Paris': 'Paryż', 'London': 'Londyn', 'Rome': 'Rzym', 'Vienna': 'Wiedeń', 'Madrid': 'Madryt', 'Lisbon': 'Lizbona',
  'Athens': 'Ateny', 'Copenhagen': 'Kopenhaga', 'Stockholm': 'Sztokholm', 'New York City': 'Nowy Jork',
  'Washington': 'Waszyngton', 'Beijing': 'Pekin', 'Tokyo': 'Tokio', 'Moscow': 'Moskwa', 'Vilnius': 'Wilno',
  'Milan': 'Mediolan', 'Naples': 'Neapol', 'Munich': 'Monachium', 'Cologne': 'Kolonia', 'Brussels': 'Bruksela',
  'Geneva': 'Genewa', 'Zurich': 'Zurych', 'Prague': 'Praga', 'Budapest': 'Budapeszt', 'Bucharest': 'Bukareszt',
  'Kyiv': 'Kijów', 'Lviv': 'Lwów', 'Minsk': 'Mińsk', 'Riga': 'Ryga', 'Tallinn': 'Tallin', 'Helsinki': 'Helsinki',
  'Oslo': 'Oslo', 'Dublin': 'Dublin', 'Edinburgh': 'Edynburg', 'Venice': 'Wenecja', 'Florence': 'Florencja',
  'Turin': 'Turyn', 'Genoa': 'Genua', 'Barcelona': 'Barcelona', 'Seville': 'Sewilla', 'Marseille': 'Marsylia',
  'Lyon': 'Lyon', 'Nice': 'Nicea', 'Hamburg': 'Hamburg', 'Frankfurt am Main': 'Frankfurt', 'Dresden': 'Drezno',
  'Leipzig': 'Lipsk', 'Istanbul': 'Stambuł', 'Jerusalem': 'Jerozolima', 'Cairo': 'Kair', 'Mexico City': 'Meksyk',
  'Saint Petersburg': 'Petersburg', 'Belgrade': 'Belgrad', 'Bratislava': 'Bratysława', 'Sofia': 'Sofia',
  'Zagreb': 'Zagrzeb', 'Ljubljana': 'Lublana', 'The Hague': 'Haga', 'Antwerpen': 'Antwerpia', 'Bern': 'Berno',
  'Delhi': 'Delhi', 'Seoul': 'Seul', 'Bangkok': 'Bangkok', 'Rio de Janeiro': 'Rio de Janeiro', 'Havana': 'Hawana',
  'Hanoi': 'Hanoi', 'Tbilisi': 'Tbilisi', 'Yerevan': 'Erywań', 'Baku': 'Baku', 'Odesa': 'Odessa',
}
out, seen = [], set()
def add(names, lat, lon, pop):
  names = [n for i, n in enumerate(names) if n and n not in names[:i]]
  key = (names[0].lower(), round(lat, 1), round(lon, 1))
  if key in seen: return
  seen.add(key)
  out.append(['|'.join(names), round(lat, 4), round(lon, 4), int(pop)])
for c in json.load(open(R / 'public/artillery/swiat.json'))['miasta']:
  add([c[1], PO_POLSKU.get(c[1])], c[3], c[4], c[5])
for t in json.load(open(R / 'data/tablice-miejscowosci.json')):
  add([t[0], t[1], PO_POLSKU.get(t[1])], t[3], t[4], t[5])
out.sort(key=lambda x: -x[3])
(R / 'public/miasta-start.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(len(out), 'cities')
