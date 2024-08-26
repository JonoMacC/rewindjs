const hexToRGB = (hex) => {
  let alpha = false,
    h = hex.slice(hex.startsWith("#") ? 1 : 0);
  if (h.length === 3) h = [...h].map((x) => x + x).join("");
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return (
    "rgb" +
    (alpha ? "a" : "") +
    "(" +
    (h >>> (alpha ? 24 : 16)) +
    ", " +
    ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)) +
    ", " +
    ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) +
    (alpha ? `, ${h & 0x000000ff}` : "") +
    ")"
  );
};

const toCamelCase = (str) => {
  let s =
    str &&
    str
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      .map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
      .join("");
  return s.slice(0, 1).toLowerCase() + s.slice(1);
};

const toKebabCase = (str) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join("-");

const toTitleCase = (str) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");

/**
 * @typedef {string} KeyCombo - A `+` delimited key combination (e.g. `Ctrl+Home`)
 */
/**
 * Returns a string for the pressed key combination, combining all modifiers
 * with '+' in order: Ctrl (^), Alt (⌥), Shift (⇧), Meta (⌘)
 *
 * @param {KeyboardEvent} e The keyboard event
 * @returns {KeyCombo} The key combination
 */
const keyCombo = (e) => {
  const modifiers = [
    e.ctrlKey ? "Ctrl" : null,
    e.altKey ? "Alt" : null,
    e.shiftKey ? "Shift" : null,
    e.metaKey ? "Meta" : null,
  ].filter(Boolean);
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;

  return modifiers.length > 0 ? modifiers.join("+") + `+${key}` : key;
};

/**
 *
 * Generates an alphabetic label from an index in the format a-z, aa-zz, etc.
 * Can be used for column headers in tables
 *
 * @param {number} index - The index for the label (e.g. column number)
 * @returns {string} - The label for the index
 */
const alphaLabel = (index) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let result = "";

  // Handle the case where index is 0 or negative
  if (index <= 0) return "a";

  index--; // Adjust index to start at 0

  while (index >= 0) {
    result = alphabet[index % 26] + result;
    index = Math.floor(index / 26) - 1;
  }

  return result;
};

export {
  hexToRGB,
  toCamelCase,
  toKebabCase,
  toTitleCase,
  keyCombo,
  alphaLabel,
};
