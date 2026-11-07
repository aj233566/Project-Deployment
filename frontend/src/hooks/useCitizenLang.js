import { translate } from '../utils/citizenLang';

// The text of the newer citizen cards. English only for now; kept behind one function so another language can be added later.
export function useCitizenLang() {
  return { t: translate };
}
