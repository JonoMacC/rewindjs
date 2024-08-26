import { deepEqual, isEmpty } from "../util/math-util.js";

export class UndoRedo {
  #stack = {
    history: [],
    index: -1,
  };

  constructor(initialState = null) {
    if (initialState !== null && !isEmpty(initialState)) {
      this.record(initialState);
    }
  }

  get currentIndex() {
    return this.#stack.index;
  }

  get currentState() {
    return this.#stack.index >= 0
      ? this.#stack.history[this.currentIndex]
      : null;
  }

  get history() {
    return this.#stack.history;
  }

  set history(newHistory) {
    this.#stack.history = newHistory;

    // Reset index if the new history is shorter
    if (this.#stack.index >= newHistory.length) {
      this.#stack.index = newHistory.length - 1;
    }
  }

  record(state) {
    if (isEmpty(state)) {
      console.info("State is empty, not recording.");
      return;
    }

    if (deepEqual(state, this.currentState)) {
      console.info("State unchanged, not recording.");
      return;
    }

    this.#stack.history = this.#stack.history.slice(0, this.#stack.index + 1);
    this.#stack.history.push(state);
    this.#stack.index++;

    console.group("Recorded state to history: ");
    console.table(this.#stack.history);
    console.groupEnd();
  }

  travel(index) {
    console.info({
      index,
      length: this.#stack.history.length,
      history: this.#stack.history,
    });
    if (index < -1 || index >= this.#stack.history.length) {
      console.error(`Invalid index ${index}. Unable to travel to state.`);
      return null;
    }

    this.#stack.index = index;
    return this.currentState;
  }

  drop(index) {
    if (index < 0 || index >= this.#stack.history.length) {
      console.error(
        `Invalid index ${index}. Unable to drop state from history.`
      );
      return;
    }

    this.#stack.history.splice(index, 1);

    if (this.#stack.index > index) {
      this.#stack.index--;
    }
  }

  undo() {
    if (this.#stack.index <= 0) return null;
    return this.travel(this.#stack.index - 1);
  }

  redo() {
    if (this.#stack.index >= this.#stack.history.length - 1) return null;
    return this.travel(this.#stack.index + 1);
  }
}

export default UndoRedo;
