(function () {
  /**
   * Extensions to native JavaScript prototypes for improved DX
   */

  /**
   * Element
   */

  /**
   * Selects the first element that matches the specified selector within the Element.
   * @param {string} selector - A CSS selector string.
   */
  Element.prototype.select = function (selector) {
    return this.querySelector(selector);
  };

  /**
   * Selects all elements that match the specified selector within the Element.
   * @param {string} selector - A CSS selector string.
   */
  Element.prototype.selectAll = function (selector) {
    return this.querySelectorAll(selector);
  };

  /**
   * Adds an event listener to the element.
   * @param {string} event - The event type to listen for.
   * @param {function} handler - The event handler function.
   */
  Element.prototype.on = function (event, handler) {
    this.addEventListener(event, handler);
  };

  /**
   * Removes an event listener from the element.
   * @param {string} event - The event type to stop listening for.
   * @param {function} handler - The event handler function.
   */
  Element.prototype.off = function (event, handler) {
    this.removeEventListener(event, handler);
  };

  /**
   * String
   */

  /**
   * Converts a string to kebab case.
   *
   * Converts the string to lowercase and separates words with a hyphen.
   *
   * @returns {string} - The string converted to kebab case.
   */
  String.prototype.toKebabCase = function () {
    return (
      this &&
      this.match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
        .map((x) => x.toLowerCase())
        .join("-")
    );
  };

  /**
   * Converts a string to camel case.
   *
   * Capitalizes the first letter of each word in the string
   * except for the first word, which is converted to lowercase.
   *
   * @returns {string} - The string converted to camel case.
   */
  String.prototype.toCamelCase = function () {
    let s =
      this &&
      this.match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
        .map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
        .join("");
    return s.slice(0, 1).toLowerCase() + s.slice(1);
  };

  /**
   * Converts a string to title case.
   *
   * Capitalizes the first letter of each word in the string
   * and converts the rest of the letters to lowercase, where a word is
   * defined as a sequence of alphanumeric characters.
   *
   * @returns {string} - The string converted to title case.
   */
  String.prototype.toTitleCase = function () {
    str &&
      str
        .match(
          /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
        )
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" ");
  };

  /**
   * Math
   */

  /**
   * Clamps a value between a minimum and maximum value.
   *
   * @param {number} value - The value to be clamped.
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} - The clamped value.
   */
  Math.clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  /**
   * Generates a random integer between a minimum and maximum value.
   *
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} - A random integer between min and max (inclusive).
   */
  Math.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  /**
   * Generates a random 7-character string (excluding vowels) for use as
   * a unique identifier.
   *
   * @returns {string} - A random 7-character string, starting with an underscore.
   */
  Math.randomId = function () {
    return "_" + Math.random().toString(36).substring(2, 9);
  };

  /**
   * Linearly interpolates between two numbers.
   *
   * @param {number} a - The starting value.
   * @param {number} b - The ending value.
   * @param {number} t - The interpolation value (between 0 and 1).
   * @returns {number} - The interpolated value.
   */
  Math.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  /**
   * Wraps a value around a minimum and maximum value.
   * Useful for dealing with angles or cyclic values.
   *
   * @param {number} value - The value to wrap.
   * @param {number} min - The minimum value.
   * @param {number} max - The maximum value.
   * @returns {number} - The wrapped value.
   */
  Math.wrap = function (value, min, max) {
    return ((value - min) % (max - min)) + min;
  };

  /**
   * Rounds a value to the nearest step.
   *
   * @param {number} value - The value to round.
   * @param {number} [step=1] - The step to round to.
   * @returns {number} - The rounded value.
   */
  Math.round = function (value, step = 1) {
    return Math.round(value / step) * step;
  };

  /**
   * Functions
   */

  /**
   * Debounces a function call.
   *
   * This function returns a new function that wraps the original function and
   * prevents it from being called more than once in a given time period.
   *
   * @param {number} delay - The time in milliseconds to delay the function call.
   * @returns {function} - A new function that wraps the original function and debounces it.
   *
   * @example
   * const debouncedClick = document.getElementById("click").addEventListener(
   *   "click",
   *   myFunction.debounce(500)
   * );
   */
  Function.prototype.debounce = function (delay) {
    let timer = null;
    const fn = this;
    return function (...args) {
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(context, args);
      }, delay);
    };
  };

  /**
   * Throttles a function call.
   *
   * This function returns a new function that wraps the original function and
   * prevents it from being called more than once in a given time period.
   *
   * @param {number} delay - The time in milliseconds to delay the function call.
   * @returns {function} - A new function that wraps the original function and throttles it.
   *
   * @example
   * const throttledClick = document.getElementById("click").addEventListener(
   *   "click",
   *   myFunction.throttle(500)
   * );
   */
  Function.prototype.throttle = function (delay) {
    let lastCall = 0;
    const fn = this;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  };

  /**
   * Events
   */

  /**
   * Returns a string for the pressed key combination, combining all modifiers
   * with '+' in order: Ctrl (^), Alt (⌥), Shift (⇧), Meta (⌘)
   *
   * @returns {string} The key combination
   */
  KeyboardEvent.prototype.keyCombo = function () {
    const modifiers = [
      this.ctrlKey ? "Ctrl" : null,
      this.altKey ? "Alt" : null,
      this.shiftKey ? "Shift" : null,
      this.metaKey ? "Meta" : null,
    ].filter((value) => value);
    const key = this.key.length === 1 ? this.key.toUpperCase() : this.key;

    return modifiers.length > 0 ? modifiers.join("+") + `+${key}` : key;
  };

  /**
   * Delegates an event to the closest matching selector.
   * @param {string} selector - A CSS selector string.
   * @param {function} handler - The event handler function.
   * @example
   * const event = new MouseEvent("click", {
   *   bubbles: true,
   *   cancelable: true,
   *   view: window,
   * });
   *
   * event.delegate(".my-selector", function (event) {
   *   // Handle the event
   * });
   */
  Event.prototype.delegate = function (selector, handler) {
    this.target.addEventListener(this.type, function (event) {
      const targetElement = event.target.closest(selector);
      if (targetElement) {
        handler.call(targetElement, event);
      }
    });
  };

  /**
   * Logs the event details.
   */
  Event.prototype.log = function () {
    console.log(`Event: ${this.type}`, this);
  };
})();
