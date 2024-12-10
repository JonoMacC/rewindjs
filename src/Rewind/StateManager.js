export class StateManager {
  #target;
  #observe;

  /**
   * A utility class for managing the state of a target object. Use observe to specify the properties
   * to observe automatically on the target.
   *
   * @param {Object} target - The target object to manage.
   * @param {string[]} observe - Properties to observe on the target.
   */
  constructor(target, observe) {
    this.#target = target;
    this.#observe = new Set(observe);
  }

  get state() {
    const state = {};
    for (const prop of this.#observe) {
      state[prop] = Reflect.get(this.#target, prop);
    }
    return state;
  }

  set state(newState) {
    Object.entries(newState).forEach(([key, value]) => {
      if (this.#observe.has(key)) {
        this.#target[key] = value;
      }
    });
  }
}
