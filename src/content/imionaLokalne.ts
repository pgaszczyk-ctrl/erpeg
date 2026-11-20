// Imiona mieszkańców według kraju (raport 19.11.2026: w Burgas „Pani Ania”). Polska zostaje przy dawnych listach
// z „Pan/Pani” (content/mieszkancy.ts). Gdzie indziej samo imię, a starsi z lokalną formą grzecznościową, jeśli jest
// prosta. Pisownia: w polskim interfejsie polska transkrypcja (Iwan, Marija), w angielskim łacińska (Ivan, Mariya) –
// zapis „pl|en”, gdy się różnią. Bez Phasera.
import { lang } from '../i18n';

interface Region {
  kraje: string[];
  m: string[];
  k: string[];
  /** Prefiks dla starszych (np. bułgarskie „Baj”, „Baba”), osobno w obu językach. */
  starszyM?: [string, string];
  starszaK?: [string, string];
}

const REGIONY: Region[] = [
  { kraje: ['BG', 'MK'],
    m: ['Iwan|Ivan', 'Georgi', 'Dimitar', 'Nikołaj|Nikolay', 'Petyr|Petar', 'Christo|Hristo', 'Stojan|Stoyan', 'Todor', 'Wasił|Vasil', 'Atanas', 'Kalin', 'Martin', 'Bożidar|Bozhidar', 'Krasimir', 'Plamen', 'Swetosław|Svetoslav', 'Ognian|Ognyan', 'Rumen', 'Angeł|Angel', 'Stefan'],
    k: ['Marija|Maria', 'Iwanka|Ivanka', 'Elena', 'Jordanka|Yordanka', 'Penka', 'Desisława|Desislava', 'Cwetanka|Tsvetanka', 'Radka', 'Gergana', 'Neli', 'Stefka', 'Wesela|Vesela', 'Rosica|Rositsa', 'Daniela', 'Milena', 'Teodora', 'Galina', 'Snieżana|Snezhana', 'Weneta|Veneta', 'Boriana|Boryana'],
    starszyM: ['Baj ', 'Bay '], starszaK: ['Baba ', 'Baba '] },
  { kraje: ['RS', 'BA', 'ME', 'HR', 'SI', 'XK'],
    m: ['Marko', 'Nikola', 'Stefan', 'Miloš|Milos', 'Luka', 'Dragan', 'Zoran', 'Goran', 'Milan', 'Ivan', 'Petar', 'Nenad', 'Dejan', 'Vuk', 'Branko', 'Slobodan', 'Bojan', 'Duško|Dusko', 'Filip', 'Đorđe|Djordje'],
    k: ['Jelena', 'Milica', 'Ana', 'Marija', 'Ivana', 'Dragana', 'Snežana|Snezana', 'Jovana', 'Mira', 'Vesna', 'Biljana', 'Nataša|Natasa', 'Tamara', 'Gordana', 'Ljiljana', 'Danica', 'Sanja', 'Maja', 'Zorica', 'Katarina'] },
  { kraje: ['RO', 'MD'],
    m: ['Ion', 'Andrei', 'Mihai', 'Alexandru', 'Gheorghe', 'Vasile', 'Constantin', 'Dan', 'Florin', 'Cristian', 'Adrian', 'Radu', 'Ștefan|Stefan', 'Marian', 'Bogdan', 'Lucian', 'Sorin', 'Petru', 'Ilie', 'Costel'],
    k: ['Maria', 'Elena', 'Ioana', 'Ana', 'Andreea', 'Mihaela', 'Cristina', 'Gabriela', 'Daniela', 'Alina', 'Florentina', 'Rodica', 'Viorica', 'Georgeta', 'Mariana', 'Simona', 'Irina', 'Lăcrămioara|Lacramioara', 'Corina', 'Doina'],
    starszyM: ['Nea ', 'Nea '], starszaK: ['Tanti ', 'Tanti '] },
  { kraje: ['GR', 'CY'],
    m: ['Jorgos|Giorgos', 'Dimitris', 'Kostas', 'Nikos', 'Janis|Giannis', 'Panajotis|Panagiotis', 'Wasilis|Vasilis', 'Christos', 'Andreas', 'Stawros|Stavros', 'Spiros|Spyros', 'Manolis', 'Michalis', 'Petros', 'Thanasis', 'Alekos', 'Lefteris', 'Sotiris', 'Tasos', 'Jannakis|Giannakis'],
    k: ['Maria', 'Eleni', 'Katerina', 'Wasiliki|Vasiliki', 'Sofia', 'Angeliki', 'Dimitra', 'Jeorjia|Georgia', 'Ioanna', 'Despina', 'Eirini', 'Paraskewi|Paraskevi', 'Chrisa|Chrysa', 'Anastasia', 'Kiriaki|Kyriaki', 'Stella', 'Fotini', 'Zoi', 'Niki', 'Athina'],
    starszyM: ['Kir ', 'Kyr '], starszaK: ['Kira ', 'Kyra '] },
  { kraje: ['TR'],
    m: ['Mehmet', 'Mustafa', 'Ahmet', 'Ali', 'Hüseyin|Huseyin', 'Hasan', 'İbrahim|Ibrahim', 'Murat', 'Emre', 'Yusuf', 'Ömer|Omer', 'Burak', 'Can', 'Kemal', 'Osman', 'Serkan', 'Erkan', 'Selim', 'Orhan', 'Tarık|Tarik'],
    k: ['Ayşe|Ayse', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Merve', 'Özlem|Ozlem', 'Esra', 'Hülya|Hulya', 'Sevgi', 'Leyla', 'Gül|Gul', 'Nur', 'Selin', 'Deniz', 'Ebru', 'Aylin', 'Derya', 'Meltem'],
    starszyM: ['', ''], starszaK: ['', ''] },
  { kraje: ['UA', 'BY', 'RU'],
    m: ['Ołeksandr|Oleksandr', 'Andrij|Andriy', 'Dmytro', 'Serhij|Serhiy', 'Wołodymyr|Volodymyr', 'Mykoła|Mykola', 'Iwan|Ivan', 'Wasyl|Vasyl', 'Petro', 'Jurij|Yuriy', 'Taras', 'Bohdan', 'Ihor', 'Maksym', 'Ołeh|Oleh', 'Roman', 'Wiktor|Viktor', 'Pawło|Pavlo', 'Stepan', 'Hryhorij|Hryhoriy'],
    k: ['Olena', 'Natalija|Nataliya', 'Tetiana|Tetiana', 'Ołena|Olena', 'Iryna', 'Switłana|Svitlana', 'Ołeksandra|Oleksandra', 'Hałyna|Halyna', 'Oksana', 'Marija|Mariya', 'Lubow|Lyubov', 'Nadija|Nadiya', 'Julija|Yuliya', 'Anna', 'Wiktorija|Viktoriya', 'Kateryna', 'Łesia|Lesya', 'Sołomija|Solomiya', 'Daryna', 'Zoja|Zoya'],
    starszyM: ['Dziadek |', 'Grandpa |'], starszaK: ['Babcia |', 'Granny |'] },
  { kraje: ['CZ', 'SK'],
    m: ['Jan', 'Petr', 'Pavel', 'Martin', 'Tomáš|Tomas', 'Jiří|Jiri', 'Josef', 'Lukáš|Lukas', 'Jakub', 'Karel', 'Milan', 'Ondřej|Ondrej', 'Vojtěch|Vojtech', 'Zdeněk|Zdenek', 'Miroslav', 'Jaroslav', 'Michal', 'Radek', 'Vladimír|Vladimir', 'Juraj'],
    k: ['Jana', 'Marie', 'Eva', 'Hana', 'Anna', 'Lenka', 'Kateřina|Katerina', 'Petra', 'Lucie', 'Věra|Vera', 'Alena', 'Zuzana', 'Ivana', 'Markéta|Marketa', 'Tereza', 'Monika', 'Jarmila', 'Božena|Bozena', 'Klára|Klara', 'Dana'],
    starszyM: ['Pan ', 'Mr '], starszaK: ['Paní |', 'Mrs '] },
  { kraje: ['DE', 'AT', 'CH', 'LI', 'LU'],
    m: ['Thomas', 'Michael', 'Andreas', 'Stefan', 'Markus', 'Jürgen|Jurgen', 'Klaus', 'Peter', 'Wolfgang', 'Frank', 'Lukas', 'Jonas', 'Felix', 'Tobias', 'Matthias', 'Hans', 'Uwe', 'Dieter', 'Sebastian', 'Florian'],
    k: ['Sabine', 'Petra', 'Monika', 'Anna', 'Julia', 'Claudia', 'Susanne', 'Katrin', 'Ursula', 'Laura', 'Lena', 'Sophie', 'Heike', 'Birgit', 'Gisela', 'Andrea', 'Melanie', 'Nicole', 'Ingrid', 'Greta'],
    starszyM: ['Herr |', 'Herr |'], starszaK: ['Frau |', 'Frau |'] },
  { kraje: ['HU'],
    m: ['László|Laszlo', 'István|Istvan', 'József|Jozsef', 'János|Janos', 'Zoltán|Zoltan', 'Sándor|Sandor', 'Gábor|Gabor', 'Ferenc', 'Attila', 'Péter|Peter', 'Tamás|Tamas', 'Balázs|Balazs', 'Dániel|Daniel', 'Gergely', 'Imre', 'Csaba', 'Levente', 'Bence', 'Márton|Marton', 'Miklós|Miklos'],
    k: ['Mária|Maria', 'Erzsébet|Erzsebet', 'Katalin', 'Ildikó|Ildiko', 'Éva|Eva', 'Zsuzsanna', 'Anna', 'Judit', 'Andrea', 'Krisztina', 'Ágnes|Agnes', 'Eszter', 'Réka|Reka', 'Zsófia|Zsofia', 'Ilona', 'Margit', 'Edit', 'Nóra|Nora', 'Boglárka|Boglarka', 'Orsolya'],
    starszyM: ['', ''], starszaK: ['', ''] },
  { kraje: ['LT', 'LV', 'EE'],
    m: ['Jonas', 'Tomas', 'Mantas', 'Andris', 'Jānis|Janis', 'Mārtiņš|Martins', 'Lukas', 'Darius', 'Mindaugas', 'Kristaps', 'Toomas', 'Rasmus', 'Aivar', 'Edgars', 'Arvydas', 'Ignas', 'Karlis', 'Rihards', 'Tadas', 'Valdis'],
    k: ['Rūta|Ruta', 'Inga', 'Laura', 'Ieva', 'Agnė|Agne', 'Liga', 'Ilze', 'Kristīne|Kristine', 'Anna', 'Egle', 'Kadri', 'Liis', 'Dace', 'Simona', 'Gintarė|Gintare', 'Zane', 'Evelina', 'Aušra|Ausra', 'Marija', 'Sandra'] },
  { kraje: ['NO', 'SE', 'DK', 'FI', 'IS'],
    m: ['Lars', 'Erik', 'Anders', 'Johan', 'Ole', 'Magnus', 'Sven', 'Nils', 'Mikael', 'Henrik', 'Jonas', 'Oskar', 'Mats', 'Juha', 'Mikko', 'Björn|Bjorn', 'Leif', 'Gunnar', 'Kasper', 'Einar'],
    k: ['Anna', 'Ingrid', 'Karin', 'Maria', 'Kristin', 'Sofia', 'Emma', 'Astrid', 'Freja', 'Sigrid', 'Linnea', 'Elin', 'Hanna', 'Liisa', 'Aino', 'Birgitta', 'Solveig', 'Maja', 'Ida', 'Signe'] },
  { kraje: ['GB', 'IE', 'US', 'CA', 'AU', 'NZ'],
    m: ['John', 'David', 'James', 'Robert', 'Michael', 'William', 'Thomas', 'George', 'Harry', 'Jack', 'Oliver', 'Charlie', 'Daniel', 'Sean', 'Patrick', 'Liam', 'Ethan', 'Noah', 'Henry', 'Arthur'],
    k: ['Mary', 'Elizabeth', 'Sarah', 'Emma', 'Olivia', 'Sophie', 'Charlotte', 'Grace', 'Emily', 'Hannah', 'Lucy', 'Jessica', 'Margaret', 'Siobhan', 'Ava', 'Isla', 'Ruby', 'Chloe', 'Megan', 'Rose'],
    starszyM: ['Pan |', 'Mr |'], starszaK: ['Pani |', 'Mrs |'] },
  { kraje: ['FR', 'BE', 'MC'],
    m: ['Jean', 'Pierre', 'Michel', 'Philippe', 'Nicolas', 'Julien', 'Thomas', 'Antoine', 'Louis', 'Hugo', 'Lucas', 'Mathieu', 'François|Francois', 'Olivier', 'Guillaume', 'Jacques', 'Éric|Eric', 'Bernard', 'Théo|Theo', 'Luc'],
    k: ['Marie', 'Nathalie', 'Isabelle', 'Sophie', 'Camille', 'Julie', 'Claire', 'Chloé|Chloe', 'Léa|Lea', 'Manon', 'Élodie|Elodie', 'Céline|Celine', 'Anne', 'Margaux', 'Inès|Ines', 'Juliette', 'Brigitte', 'Monique', 'Sylvie', 'Amélie|Amelie'],
    starszyM: ['Monsieur |', 'Monsieur |'], starszaK: ['Madame |', 'Madame |'] },
  { kraje: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'UY', 'EC', 'BO', 'PY', 'CU'],
    m: ['José|Jose', 'Antonio', 'Manuel', 'Francisco', 'Juan', 'Javier', 'Carlos', 'Miguel', 'Alejandro', 'Pablo', 'Diego', 'Luis', 'Sergio', 'Jorge', 'Rafael', 'Pedro', 'Andrés|Andres', 'Fernando', 'Mateo', 'Santiago'],
    k: ['María|Maria', 'Carmen', 'Ana', 'Lucía|Lucia', 'Laura', 'Marta', 'Elena', 'Isabel', 'Sofía|Sofia', 'Paula', 'Cristina', 'Rosa', 'Pilar', 'Dolores', 'Valentina', 'Camila', 'Inés|Ines', 'Teresa', 'Beatriz', 'Alba'],
    starszyM: ['Don ', 'Don '], starszaK: ['Doña |', 'Doña |'] },
  { kraje: ['IT', 'SM', 'VA', 'MT'],
    m: ['Giuseppe', 'Giovanni', 'Antonio', 'Mario', 'Luigi', 'Francesco', 'Marco', 'Alessandro', 'Andrea', 'Paolo', 'Roberto', 'Stefano', 'Matteo', 'Lorenzo', 'Salvatore', 'Pietro', 'Davide', 'Enzo', 'Carlo', 'Vincenzo'],
    k: ['Maria', 'Anna', 'Giulia', 'Francesca', 'Chiara', 'Sara', 'Laura', 'Paola', 'Elena', 'Giovanna', 'Rosa', 'Lucia', 'Sofia', 'Martina', 'Alessia', 'Valentina', 'Teresa', 'Angela', 'Carla', 'Federica'],
    starszyM: ['Signor |', 'Signor |'], starszaK: ['Signora |', 'Signora |'] },
  { kraje: ['PT', 'BR'],
    m: ['João|Joao', 'José|Jose', 'António|Antonio', 'Pedro', 'Rui', 'Tiago', 'Luís|Luis', 'Paulo', 'Miguel', 'Rafael', 'Gabriel', 'Lucas', 'Bruno', 'Ricardo', 'André|Andre', 'Carlos', 'Diogo', 'Fernando', 'Mateus', 'Henrique'],
    k: ['Maria', 'Ana', 'Joana', 'Mariana', 'Beatriz', 'Inês|Ines', 'Sofia', 'Rita', 'Carla', 'Catarina', 'Francisca', 'Luísa|Luisa', 'Fernanda', 'Juliana', 'Camila', 'Larissa', 'Teresa', 'Helena', 'Leonor', 'Isabel'],
    starszyM: ['Senhor |', 'Senhor |'], starszaK: ['Dona |', 'Dona |'] },
  { kraje: ['NL'],
    m: ['Jan', 'Pieter', 'Kees', 'Willem', 'Hendrik', 'Joost', 'Bram', 'Daan', 'Sem', 'Lars', 'Ruben', 'Thijs', 'Bas', 'Jeroen', 'Maarten', 'Sander', 'Tim', 'Gert', 'Wouter', 'Luuk'],
    k: ['Anna', 'Maria', 'Emma', 'Sophie', 'Julia', 'Lotte', 'Sanne', 'Fleur', 'Eva', 'Anouk', 'Femke', 'Ingrid', 'Marieke', 'Lieke', 'Noor', 'Tess', 'Iris', 'Saskia', 'Karin', 'Lisa'] },
  { kraje: ['JP'],
    m: ['Hiroshi', 'Takeshi', 'Kenji', 'Haruto', 'Yuto', 'Sota', 'Ren', 'Daiki', 'Kaito', 'Ryo', 'Shota', 'Kazuki', 'Takumi', 'Yuki', 'Akira', 'Satoshi', 'Taro', 'Makoto', 'Kenta', 'Riku'],
    k: ['Yuki', 'Sakura', 'Hana', 'Aoi', 'Yui', 'Mio', 'Rin', 'Haruka', 'Akiko', 'Yoko', 'Keiko', 'Naomi', 'Emi', 'Mai', 'Ayaka', 'Misaki', 'Nanami', 'Kana', 'Saki', 'Hinata'],
    starszyM: ['|-san', '|-san'], starszaK: ['|-san', '|-san'] },
];

const GLOBALNE: Region = {
  kraje: [],
  m: ['Adam', 'Daniel', 'David', 'Samuel', 'Leo', 'Omar', 'Ali', 'Marco', 'Victor', 'Felix', 'Hugo', 'Elias', 'Noah', 'Amir', 'Karim', 'Yusuf', 'Diego', 'Ivan', 'Tomas', 'Rafael'],
  k: ['Maria', 'Anna', 'Sara', 'Lea', 'Mia', 'Nora', 'Layla', 'Amira', 'Elena', 'Sofia', 'Yasmin', 'Lina', 'Clara', 'Eva', 'Nadia', 'Zara', 'Lucia', 'Ines', 'Maya', 'Dana'],
};

/** One spelling in the player's language: "pl|en" → pl or en. */
const forma = (s: string) => { const [pl, en] = s.split('|'); return lang === 'pl' ? pl : (en ?? pl); };
/** A polite form: "Baj " + name, "Herr |" → "Herr Name", "|-san" → "Name-san". */
const zFormą = (pref: [string, string] | undefined, imie: string) => {
  if (!pref) return imie;
  const p = lang === 'pl' ? pref[0] : pref[1];
  return p.includes('|') ? p.replace('|', imie) : p + imie;
};

/**
 * A passer-by's name for a country (ISO 2) or null for Poland (the old lists stay). `los` = 0..1 seeded per person.
 */
export function imieLokalne(kraj: string | null, plec: 'k' | 'm', wiek: 'dziecko' | 'dorosly' | 'starszy', los: number): string | null {
  if (!kraj || kraj === 'PL') return null;
  const r = REGIONY.find((g) => g.kraje.includes(kraj)) ?? GLOBALNE;
  const lista = plec === 'k' ? r.k : r.m;
  const imie = forma(lista[Math.floor(los * lista.length) % lista.length]);
  return wiek === 'starszy' ? zFormą(plec === 'k' ? r.starszaK : r.starszyM, imie) : imie;
}
