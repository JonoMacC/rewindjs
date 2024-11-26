// Type definitions
import './types.js';

export class StateManager {
  #target;
  #observe;
  #accessor;

  /**
   * A utility class for managing the state of a target object. Use options.observe to specify the properties
   * to observe automatically on the target. Alternatively, provide custom getter and setter functions using
   * options.accessor.
   *
   * @param {Object} target - The target object to manage.
   * @param {Object} options - Options.
   * @param {string[]} options.observe - Properties to observe on the target.
   * @param {Accessor} options.accessor - An accessor that returns the state of the target.
   */
  constructor(target, options) {
    this.#target = target;
    this.#observe = new Set(options.observe);
    this.#accessor = options.accessor;
  }

  get state() {
    if (this.#observe.size === 0) {
      return this.#accessor.get(this.#target);
    }

    return Array.from(this.#observe).reduce((state, prop) => {
      state[prop] = this.#target[prop];
      return state;
    }, {});
  }

  set state(newState) {
    if (this.#observe.size === 0) {
      this.#accessor.set(this.#target, newState);
      return;
    }

    Object.entries(newState).forEach(([key, value]) => {
      if (this.#observe.has(key)) {
        this.#target[key] = value;
      }
    });
  }
}
