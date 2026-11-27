import { lang } from '../i18n';

const IMIONA_POLSKIE = {
  m: [
    'Zbyszko', 'Mściwój', 'Bogumił', 'Jaropełk', 'Sędziwój', 'Gniewomir', 'Siemowit', 'Lubomir',
    'Sambor', 'Przemysł', 'Borzywój', 'Czcibor', 'Krzesisław', 'Uniemysł', 'Wszebor', 'Radomir',
    'Ziemowit', 'Warzisław', 'Sulimir', 'Leszek',
  ],
  k: [
    'Dobrawa', 'Świętosława', 'Jagna', 'Wanda', 'Kalina', 'Nawojka', 'Rzepicha', 'Miłosława',
    'Dąbrówka', 'Aldona', 'Wisława', 'Jagoda', 'Malina', 'Ludmiła', 'Sława', 'Bogna',
    'Marzanna', 'Koryna', 'Radosława', 'Otylia',
  ],
};

const IMIONA_ANGIELSKIE = {
  m: [
    'Arthur', 'Gideon', 'Barnaby', 'Percival', 'Silas', 'Kenji', 'Haruto', 'Jin-Ho',
    'Akira', 'Tenzin', 'Bao', 'Lucien', 'Mateo', 'Cassian', 'Lorenzo', 'Thiago',
    'Kwame', 'Kofi', 'Tariq', 'Vaelen', 'Thalor', 'Orin', 'Draven', 'Torin',
    'Aarav', 'Nanuq', 'Tama', 'Alistair', 'Thaddeus', 'Cornelius', 'Reginald', 'Oswald',
    'Edmund', 'Bertram', 'Ambrose', 'Phineas', 'Jasper', 'Renjiro', 'Daiki', 'Min-Jun',
    'Wei-Liang', 'Kaito', 'Ryuji', 'Seung-Hoon', 'Chen-Bo', 'Hiroshi', 'Takeshi', 'Bastian',
    'Sebastien', 'Rafael', 'Dante', 'Emiliano', 'Gaspard', 'Salvador', 'Fabian', 'Matteo',
    'Joaquin', 'Sekou', 'Jabari', 'Chidi', 'Malik', 'Tendai', 'Kaelen', 'Zephyr',
    'Malakor', 'Darian', 'Xander', 'Fenris', 'Corvus', 'Bram', 'Vane', 'Kael',
    'Rohan', 'Vikram', 'Qimmiq', 'Wiremu', 'Bjorn',
  ],
  k: [
    'Beatrice', 'Eleanor', 'Clara', 'Millicent', 'Tabitha', 'Mei-Ling', 'Sora', 'Yuki',
    'Hana', 'Celeste', 'Valeria', 'Aurelia', 'Seraphina', 'Isolde', 'Zuri', 'Amara',
    'Kaelith', 'Sylvara', 'Zephira', 'Nyxara', 'Lyra', 'Ananya', 'Siku', 'Florence',
    'Evangeline', 'Genevieve', 'Cordelia', 'Rosalind', 'Winifred', 'Henrietta', 'Lavinia', 'Matilda',
    'Adelaide', 'Sakura', 'Ayaka', 'Ji-Yeon', 'Xiu-Ying', 'Natsuki', 'Kasumi', 'Eun-Bi',
    'Mei-Xue', 'Chiyo', 'Aoi', 'Camille', 'Octavia', 'Estelle', 'Camila', 'Bianca',
    'Solange', 'Ines', 'Clarisse', 'Paloma', 'Lucia', 'Nia', 'Amina', 'Zola',
    'Eshe', 'Makena', 'Seren', 'Elowen', 'Vespera', 'Calista', 'Mirella', 'Thalia',
    'Freya', 'Isola', 'Astrid', 'Elara', 'Kavita', 'Priya', 'Panuk', 'Aroha',
    'Sigrid',
  ],
};

export function losoweImie(plec?: 'k' | 'm'): string {
  const imiona = lang === 'pl' ? IMIONA_POLSKIE : IMIONA_ANGIELSKIE;
  const lista = plec ? imiona[plec] : [...imiona.m, ...imiona.k];
  return lista[Math.floor(Math.random() * lista.length)];
}
