
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

  set rewindState(newState) {
    this.#state = newState;
    this.#history.push(newState);
    this.#index = this.#history.length - 1;
  }

  get rewindState() {
    return this.#state;
  }

  set rewindHistory(newHistory) {
    this.#history = newHistory;
  }

  get rewindHistory() {
    return this.#history;
  }

  get rewindIndex() {
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