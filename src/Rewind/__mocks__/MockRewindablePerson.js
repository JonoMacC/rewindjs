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

  set state(newState) {
    this.#state = newState;
    this.#history.push(newState);
    this.#index = this.#history.length - 1;
  }

  get state() {
    return this.#state;
  }

  get history() {
    return this.#history;
  }

  get index() {
    return this.#index;
  }
}
