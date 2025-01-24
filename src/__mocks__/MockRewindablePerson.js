export class MockRewindablePerson {
  static targetClass = { name: 'Person' };
  static rewindOptions = { observe: ['name', 'age'] };

  #state;
  #history;
  #index;

  constructor(initialState) {
    this.#state = initialState;
    this.#history = [initialState];
    this.#index = 0;
  }

  set rewindState(newState) {
    this.#state = newState;
    this.#history.push(newState);
    this.#index = this.#history.length - 1;
  }

  get rewindState() {
    return this.#state;
  }

  get rewindHistory() {
    return this.#history;
  }

  get rewindIndex() {
    return this.#index;
  }
}
