// Password policy shared by signup, password change and the admin helper.
// The server is the authority; auth/login.html mirrors these rules only so the
// user gets instant feedback.
//
// Rules (length matters more than "special character" tricks, per NIST SP 800-63B):
//  - 10 to 72 bytes. bcrypt silently ignores everything after 72 bytes, so a
//    longer password would give a false sense of security. We reject it instead.
//  - at least one letter and one digit
//  - not a well-known password (even with digits/symbols added at the end)
//  - must not contain the part of the email before "@" or equal the user's name
const MIN_LENGTH = 10;
const MAX_BYTES = 72;

const COMMON = new Set([
  "password", "passw0rd", "p@ssw0rd", "letmein", "welcome", "admin", "administrator", "qwerty",
  "qwertyuiop", "azerty", "asdfghjkl", "zxcvbnm", "iloveyou", "monkey", "dragon", "football",
  "baseball", "basketball", "superman", "batman", "sunshine", "princess", "shadow", "master",
  "abc", "abcdef", "abcdefgh", "abcd", "login", "changeme", "default", "secret", "trustno",
  "freedom", "whatever", "hello", "helloworld", "charlie", "michael", "jennifer", "jordan",
  "mustang", "starwars", "pokemon", "computer", "internet", "foodhub", "foodhubs", "food",
  "southafrica", "capetown", "johannesburg", "pretoria", "wethinkcode", "student", "test",
  "testing", "guest", "user", "root", "toor", "pass", "passwd", "qazwsx", "1q2w3e4r",
]);

function stripTail(value) {
  // "Password123!" -> "password": drop trailing digits/symbols before the lookup.
  return value.toLowerCase().replace(/[^a-z]+$/g, "");
}

function validatePassword(password, { email = "", name = "" } = {}) {
  if (typeof password !== "string") return "Enter a password.";
  if (password.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  if (Buffer.byteLength(password, "utf8") > MAX_BYTES) {
    return `Password is too long (maximum ${MAX_BYTES} bytes).`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  if (new Set(password).size < 5) return "Password is too simple (use more different characters).";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || COMMON.has(stripTail(password)) || /^(?:1234|qwer|abcd|0000)/.test(lower)) {
    return "That password is too common. Choose something less guessable.";
  }
  const local = String(email).split("@")[0].toLowerCase();
  if (local.length >= 3 && lower.includes(local)) return "Password must not contain your email name.";
  const cleanName = String(name).trim().toLowerCase();
  if (cleanName.length >= 3 && lower.includes(cleanName.replace(/\s+/g, ""))) {
    return "Password must not contain your name.";
  }
  return null;
}

module.exports = { validatePassword, MIN_LENGTH, MAX_BYTES };
