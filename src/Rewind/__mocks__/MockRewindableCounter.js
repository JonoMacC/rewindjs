
export class MockRewindableCounter {
  static targetClass = { name: 'Counter' };
  static rewindOptions = { observe: ['value'] };

  #state;
  #history;
  #index;

  constructor(...args) {
    this.#state = args[1] || { value: 0 };
    this.#history = args[0].history;
    this.#index = args[0].index;
  }

  set state(newState) {
    this.#state = newState;
    this.#history.push(newState);
    this.#index = this.#history.length - 1;
  }

  get state() {
    return this.#state;
  }

  set history(newHistory) {
    this.#history = newHistory;
  }

  get history() {
    return this.#history;
  }

  get index() {
    return this.#index;
  }

  get value() {
    return this.#state.value;
  }

  set value(newValue) {
    this.state = { ...this.#state, value: newValue };
  }

  suspend() {
    return this;
  }

  resume() {
    return this;
  }

  record() {
    return this;
  }

  travel(index) {
    return this;
  }
}