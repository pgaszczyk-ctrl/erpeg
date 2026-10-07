// Ustawienia gracza na tym urządzeniu (localStorage, każdy zapis/odczyt w try – w trybie prywatnym może nie działać).

const KLUCZ_TRZESIENIA = 'exp-trzesienie';

/** Trzęsienie ekranu i wibracja (upadek smoka górskiego): domyślnie włączone, wyłączalne w menu gry (osoby wrażliwe na ruch). */
export function trzesienieWlaczone(): boolean {
  try {
    return localStorage.getItem(KLUCZ_TRZESIENIA) !== '0';
  } catch {
    return true;
  }
}

const KLUCZ_GOR = 'exp-efekt-gor';

/** Efekt gór (rozmycie i mgła niżej położonego terenu, paralaksa): domyślnie włączony, wyłączalny w menu gry. */
export function efektGorWlaczony(): boolean {
  try {
    return localStorage.getItem(KLUCZ_GOR) !== '0';
  } catch {
    return true;
  }
}

export function ustawEfektGor(on: boolean) {
  try {
    localStorage.setItem(KLUCZ_GOR, on ? '1' : '0');
  } catch {
    /* bez zapamiętania */
  }
}

export function ustawTrzesienie(on: boolean) {
  try {
    localStorage.setItem(KLUCZ_TRZESIENIA, on ? '1' : '0');
  } catch {
    /* bez zapamiętania */
  }
}
