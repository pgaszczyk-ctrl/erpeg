/** Experimental renderer only in the anonymous test2 laboratory; normal play stays unchanged. */
export function srodowiskoTest2(): boolean {
  if (typeof location === 'undefined') return false;
  return /(?:^|\/)test2(?:\/|\.html|$)/.test(location.pathname);
}
