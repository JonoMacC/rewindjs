/**
 * A collection of utilities.
 * @namespace cel
 */
const cel = {
  /**
   * Element
   */

  /**
   * Wraps an HTML Element with getters and setters for the observed properties.
   * @param {HTMLElement} element - The HTML element to wrap.
   * @param {string[]} observe - Property names to observe and wrap.
   * @returns {typeof HTMLElement} A new class that extends HTMLElement and wraps the provided element.
   */
  proxyElement(element, observe = []) {
    return class extends HTMLElement {
      #element;
      #propertyValues = new Map();
      #observers = new Map();
      #eventListeners = new Map();

      constructor() {
        super();
        this.#element = element.cloneNode(true);
        this.appendChild(this.#element);

        // Initialize attributes
        Array.from(this.attributes).forEach((attr) => {
          this.#syncAttribute(attr.name, attr.value);
        });

        // // Forward property and method calls
        // cel.forward(this, this.#element);

        this.#observeProperties(observe);
      }

      // Private helper methods
      #syncAttribute(name, value) {
        if (value === null) {
          this.#element.removeAttribute(name);
        } else {
          this.#element.setAttribute(name, value);
        }
        // Remove the attribute from the parent element
        super.removeAttribute(name);
      }

      #observeProperties(properties) {
        properties.forEach(prop => {
          this.#propertyValues.set(prop, this.#element[prop]);

          Object.defineProperty(this, prop, {
            get: () => {
              return this.#propertyValues.get(prop);
            },
            set: (newValue) => {
              this.#propertyValues.set(prop, newValue);
              this.#element[prop] = newValue;
            },
            enumerable: true,
            configurable: true
          });

          this.#observeProperty(prop);
        });
      }

      #updateProperty(prop, value) {
        if (this.#propertyValues.get(prop) !== value) {
          this.#propertyValues.set(prop, value);
          this[prop] = value;
        }
      }

      #observeProperty(prop) {
        const descriptor = cel.findDescriptor(this.#element, prop);

        // Set up setter observation if available
        if (descriptor && (descriptor.set || descriptor.get)) {
          this.#observeWithSetter(prop, descriptor);
        } else {
          this.#observeWithPolling(prop);
        }
      }

      #observeWithSetter(prop, descriptor) {
        Object.defineProperty(this.#element, prop, {
          get: descriptor.get,
          set: (value) => {
            if (this.#propertyValues.get(prop) !== value) {
              this.#propertyValues.set(prop, value);
              this[prop] = value;
            }
            descriptor.set.call(this.#element, value);
          },
          enumerable: descriptor.enumerable,
          configurable: descriptor.configurable
        });
      }

      #observeWithPolling(prop) {
        const interval = setInterval(() => this.#updateProperty(prop, this.#element[prop]), 100);
        this.#observers.set(prop, { type: 'polling', interval });
      }

      #transcludeChildren() {
        // Define target based on shadowRoot or last matching child element
        const target = this.shadowRoot
            ? this.shadowRoot.firstElementChild
            : Array.from(this.children).findLast(child => child.tagName === element.tagName);

        // If target exists, move preceding child nodes into target
        if (target) {
          const fragment = document.createDocumentFragment();
          while (this.firstChild && this.firstChild !== target) {
            fragment.appendChild(this.firstChild);
          }
          target.appendChild(fragment);
        }
      }

      #teardown() {
        this.#observers.forEach(observer => {
          observer instanceof ResizeObserver || observer instanceof MutationObserver
            ? observer.disconnect()
            : clearInterval(observer);
        });

        this.#eventListeners.forEach(({ events, handler }, _) =>
          events.forEach(event => this.removeEventListener(event, handler))
        );

        this.#propertyValues.clear();
        this.#observers.clear();
        this.#eventListeners.clear();
      }

      connectedCallback() {
        super.connectedCallback?.();
        this.#transcludeChildren();
      }

      disconnectedCallback() {
        super.disconnectedCallback?.();
        this.#teardown();
      }

      attributeChangedCallback(name, oldValue, newValue) {
        this.#syncAttribute(name, newValue);
        super.attributeChangedCallback?.(name, oldValue, newValue);
      }

      static get observedAttributes() {
        return ["*"];
      }
    };
  },

  /**
   * String
   */

  /**
   * Converts a string to kebab case.
   *
   * Words are lowercased and separated by hyphens.
   *
   * @param {string} str - The string to convert.
   * @returns {string} - The string converted to kebab case.
   */
  toKebabCase(str) {
    return (
      str &&
      str.match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
        .map((x) => x.toLowerCase())
        .join("-")
    );
  },

  /**
   * Converts a string to camel case.
   *
   * Capitalizes the first letter of each word in the string
   * except for the first word, which is converted to lowercase.
   *
   * @param {string} str - The string to convert.
   * @returns {string} - The string converted to camel case.
   */
  toCamelCase(str) {
    let s =
      str &&
      str.match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
        .map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
        .join("");
    return s.slice(0, 1).toLowerCase() + s.slice(1);
  },

  /**
   * Converts a string to title case.
   *
   * Capitalizes the first letter of each word in the string
   * and converts the rest of the letters to lowercase, where a word is
   * defined as a sequence of alphanumeric characters.
   *
   * @param {string} str - The string to convert.
   * @returns {string} - The string converted to title case.
   */
  toTitleCase(str) {
    return (
        str &&
      str
        .match(
          /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
        )
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" "));
  },

  /**
   * Generates a hash code
   *
   * @param {string} str - The string to hash
   * @returns {number} - The hash code
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  },

  /**
   * Math
   */

  /**
   * Generates a random 7-character string (excluding vowels) for use as
   * a unique identifier.
   *
   * @returns {string} - A random 7-character string, starting with an underscore.
   */
  randomId() {
    return "_" + Math.random().toString(36).substring(2, 9);
  },

  /**
   * Logic
   */

  equals(a, b) {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date)
      return a.getTime() === b.getTime();
    if (!a || !b || (typeof a !== "object" && typeof b !== "object"))
      return a === b;
    if (a.prototype !== b.prototype) return false;
    if (a instanceof Set && b instanceof Set) {
      return a.size === b.size && [...a].every((value) => b.has(value));
    }
    if (a instanceof Map && b instanceof Map) {
      return (
          a.size === b.size &&
          [...a].every(([key, value]) => b.has(key) && this.equals(value, b.get(key)))
      );
    }
    let keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((k) => this.equals(a[k], b[k]));
  },

  deepEqual(a, b, visited = new WeakSet()) {
    // Handle base case: simple values
    if (
        typeof a !== "object" ||
        typeof b !== "object" ||
        a === null ||
        b === null
    ) {
      return this.equals(a, b);
    }

    // Handle circular references
    if (visited.has(a) || visited.has(b)) {
      return true;
    }
    visited.add(a);
    visited.add(b);

    // Handle built-in objects
    const aString = Object.prototype.toString.call(a);
    const bString = Object.prototype.toString.call(b);
    if (aString !== bString) {
      return false;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (let [key, value] of a) {
        if (!b.has(key) || !this.deepEqual(value, b.get(key), visited)) {
          return false;
        }
      }
      return true;
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (let item of a) {
        if (!b.has(item)) {
          return false;
        }
      }
      return true;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index], visited));
    }

    if (a.constructor === Object && b.constructor === Object) {
      const keys1 = Object.keys(a);
      const keys2 = Object.keys(b);
      if (keys1.length !== keys2.length) return false;
      return keys1.every((key) => this.deepEqual(a[key], b[key], visited));
    }

    // Handle functions
    if (typeof a === "function" && typeof b === "function") {
      return a.toString() === b.toString();
    }

    return false; // If none of the above match, they are not equal
  },

  isMapOrSet(value) { return value instanceof Map || value instanceof Set },

  isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === "object") {
      if (this.isMapOrSet(obj)) return obj.size === 0;
      if (Array.isArray(obj)) return obj.length === 0;
      return Object.keys(obj).length === 0;
    }
    return false;
  },

  /**
   * Functions
   */

  /**
   * Debounces a function call.
   *
   * This function returns a new function that wraps the original function and
   * prevents it from being called more than once in a given time period.
   *
   * @param {function} fn - The function to debounce.
   * @param {number} delay - The time in milliseconds to delay the function call.
   * @returns {function} - A new function that wraps the original function and debounces it.
   *
   * @example
   * const debouncedClick = document.getElementById("click").addEventListener(
   *   "click",
   *   myFunction.debounce(500)
   * );
   */
  debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(context, args);
      }, delay);
    };
  },

  /**
   * Events
   */

  /**
   * Returns a string for the pressed key combination, combining all modifiers
   * with '+' in order: Ctrl (^), Alt (⌥), Shift (⇧), Meta (⌘)
   *
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {string} The key combination
   */
  keyCombo(event) {
    const modifiers = [
      event.ctrlKey ? "Ctrl" : null,
      event.altKey ? "Alt" : null,
      event.shiftKey ? "Shift" : null,
      event.metaKey ? "Meta" : null,
    ].filter((value) => value);
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;

    return modifiers.length > 0 ? modifiers.join("+") + `+${key}` : key;
  },

  /**
   * Objects
   */

  /**
   * @typedef KeyMap
   * @type {Object<string, string[]>}
   */

  /**
   * @typedef MergeStrategy
   * @type {"override" | "union"}
   */

  /**
   * Merges two key maps for arbitrary actions
   *
   * @param {KeyMap} a - Default key mappings object where each property is an array of keys
   * @param {KeyMap} b - Custom key mappings object that may override defaults
   * @param {MergeStrategy} [strategy="override"] - The merge strategy to use
   * @returns {KeyMap} Merged key mappings
   */
  mergeKeyMaps(a, b, strategy = "override") {
    const strategyMap = {
      override: () => ({ ...a, ...b }),
      union: () => {
        const merged = { ...a };
        for (const action in b) {
          merged[action] = merged[action]
              ? [...new Set([...merged[action], ...b[action]])]
              : b[action];
        }
        return merged;
      }
    };

    return strategyMap[strategy]();
  },

  /**
   * Reconciles two divergent histories
   *
   * @param {any[]} a - First history
   * @param {any[]} b - Second history
   * @returns {any[]} Merged history
   */
  reconcile(a, b) {
    if (b === undefined || b === null) return a;
    // Find the last common state between the two histories
    const lastCommonIndex =
        a.findIndex((state, index) => !this.deepEqual(state, b[index])) - 1;

    // Merge the histories, keeping all states after the last common one
    return [
      ...a.slice(0, lastCommonIndex + 1),
      ...b.slice(lastCommonIndex + 1),
    ];
  },

  /**
   * Finds a property descriptor in the prototype chain of an object
   * @param {Object} target - The object to search
   * @param {string} prop - The property to find
   * @returns {null|PropertyDescriptor} The descriptor, or null if not found
   */
  findDescriptor(target, prop) {
    // First try to get descriptor from the instance itself
    let descriptor = Object.getOwnPropertyDescriptor(target, prop);
    if (descriptor) return descriptor;

    // Walk up the prototype chain
    let prototype = Object.getPrototypeOf(target);
    while (prototype) {
      descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
      if (descriptor) return descriptor;
      prototype = Object.getPrototypeOf(prototype);
    }

    return null;
  },

  /**
   * Wraps the properties of an object with a callback that is called after the property is updated.
   * @param {Object} target - The object to wrap the properties of.
   * @param {Set<string>} properties - The properties to wrap.
   * @param {Function} set - The callback to call after the property is updated.
   */
  interceptProperties(target, properties, set) {
    for (const prop of properties) {
      const descriptor = cel.findDescriptor(target, prop);

      // Define the property on the object
      // The setter will call the callback after updating the property
      if (descriptor) {
        Object.defineProperty(target, prop, {
          get: descriptor.get
              ? function () {
                return descriptor.get.call(this);
              }
              : function () {
                return descriptor.value;
              },
          set: function (value) {
            if (descriptor.set) {
              descriptor.set.call(this, value);
            } else if (descriptor.writable) {
              descriptor.value = value;
            }
            set(prop);
          },
          configurable: true,
          enumerable: descriptor.enumerable,
        });
      }
    }
  },

  /**
   * Wraps the methods of an object with a wrapper function.
   * @param {Object} target - The object to wrap the methods of.
   * @param {Set<string>} methods - The methods to wrap.
   * @param {Function} wrap - The wrapper function to call before the original method.
   */
  interceptMethods(target, methods, wrap) {
    methods.forEach((name) => {
      const method = target[name];
      target[name] = function (...args) {
        return wrap.call(this, () => method.apply(this, args));
      };
    });
  },

  /**
   * Modifies the given object, allowing interception of property
   * accesses and modifications.
   *
   * @param {Object} target - The target object to wrap.
   * @param {Object} options - Options for the interceptor.
   * @param {Set<string>} [options.properties=new Set()] - Properties to observe for changes.
   * @param {Set<string>} [options.methods=new Set()] - Methods to wrap with a custom behavior.
   * @param {Function} [options.set] - Callback to invoke when a property in the observed set is changed.
   * @param {Function} [options.wrap] - Function to wrap around observed methods.
   */
  intercept(
      target,
      { properties = new Set(), methods = new Set(), set, wrap } = {}
  ) {
    this.interceptProperties(target, properties, set);
    this.interceptMethods(target, methods, wrap);
  },

  /**
   * Forwards property and method calls on a host object to a target object.
   *
   * @param {Object} host - The host object that will delegate property calls.
   * @param {Object} target - The target (hosted) object that will handle the property calls.
   */
  forward(host, target) {
    // Start at the target object and traverse the entire prototype chain
    let obj = target;
    while (obj && obj !== Object.prototype) {
      const properties = Object.getOwnPropertyDescriptors(obj);

      for (const [name, descriptor] of Object.entries(properties)) {
        // Skip constructor, already defined methods, and private methods
        if (name === 'constructor' ||
          name in host ||
          name.startsWith('#')) continue;

        // Handle getter/setter pairs
        if (descriptor.get || descriptor.set) {
          Object.defineProperty(host, name, {
            get: descriptor.get ? () => descriptor.get.call(target) : undefined,
            set: descriptor.set ? (value) => descriptor.set.call(target, value) : undefined,
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable
          });
        }
        // Handle methods explicitly
        else if (typeof descriptor.value === 'function') {
          host[name] = (...args) => {
            // Call the method on the target, preserving its original context
            return descriptor.value.call(target, ...args);
          };
        }
        // Handle regular properties
        else if (descriptor.value !== undefined) {
          Object.defineProperty(host, name, {
            get: () => target[name],
            set: (value) => { target[name] = value; },
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable
          });
        }
      }

      // Move up the prototype chain
      obj = Object.getPrototypeOf(obj);
    }
  }
};

export default cel;
