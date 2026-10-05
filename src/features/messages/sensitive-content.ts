const CARD_NUMBER = /(?:^|\D)(?:\d[ -]?){13,19}(?:\D|$)/;
const SSN = /\b(?:ssn|social[ -]?security)(?:\s*(?:number|no\.?))?\s*[:#-]?\s*\d{3}[ -]?\d{2}[ -]?\d{4}\b/i;
const CVV = /\b(?:cvv|cvc|security\s+code)\s*[:#=-]?\s*\d{3,4}\b/i;
const LOGIN = /\b(?:password|passcode|issuer\s+login|bank\s+login)\s*[:=-]+\s*\S+/i;
const BANK = /\b(?:routing|bank\s+account)(?:\s*(?:number|no\.?))?\s*[:#-]?\s*\d{6,17}\b/i;

export function containsSensitiveContent(content: string) {
  return CARD_NUMBER.test(content) || SSN.test(content) || CVV.test(content) || LOGIN.test(content) || BANK.test(content);
}
