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

export function ustawTrzesienie(on: boolean) {
  try {
    localStorage.setItem(KLUCZ_TRZESIENIA, on ? '1' : '0');
  } catch {
    /* bez zapamiętania */
  }
}
