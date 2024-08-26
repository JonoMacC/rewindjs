import { deepEqual, isEmpty } from "../util/math.js";

// TODO: Evaluate and select an UndoModel and set it, removing the option
export const UndoModel = {
  LINEAR: "linear",
  HISTORY: "history",
};

/**
 * RewindCore
 *
 * Manages the undo/redo functionality for a component.
 *
 * @class
 * @property {Array} history - The history of recorded states.
 * @property {number} currentIndex - The current index in the history.
 * @property {string} model - The undo model being used (linear or history).
 *
 * @example
 * const rewind = new RewindCore(UndoModel.LINEAR);
 * rewind.record({ content: 'Hello' });
 * rewind.record({ content: 'Hello World' });
 * const previousState = rewind.undo(); // Returns { content: 'Hello' }
 * const nextState = rewind.redo(); // Returns { content: 'Hello World' }
 */
export class RewindCore {
  #history = [];
  #index = -1;
  #model;

  constructor(model = UndoModel.LINEAR) {
    this.#model = model;
  }

  get currentIndex() {
    return this.#index;
  }

  get currentState() {
    return this.#index >= 0 ? this.#history[this.currentIndex] : null;
  }

  get history() {
    return this.#history;
  }

  set history(newHistory) {
    this.#history = newHistory;

    // Reset index if the new history is shorter
    if (this.#index >= newHistory.length) {
      this.#index = newHistory.length - 1;
    }
  }

  get model() {
    return this.#model;
  }

  set model(newModel) {
    if (!Object.values(UndoModel).includes(newModel)) {
      throw new Error(`Invalid undo model: ${newModel}`);
    }
    this.#model = newModel;
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

    const historyHandlers = {
      [UndoModel.LINEAR]: () => {
        /**
         * Linear Undo Model
         *
         * Future states are overwritten when recording from a position backwards
         * in the history.
         */
        this.#history = this.#history.slice(0, this.#index + 1);
      },
      [UndoModel.HISTORY]: () => {
        /**
         * History Undo Model
         *
         * Future states are preserved by always recording a new state to the
         * end of history.
         */
        // If we're not at the end of the history, append the current state
        if (this.#index < this.#history.length - 1) {
          this.#history.push(this.currentState);
          this.#index = this.#history.length - 1;
        }
      },
    };

    const handler = historyHandlers[this.#model];
    if (!handler) {
      throw new Error(`Invalid undo model: ${this.#model}`);
    }
    handler();

    this.#history.push(state);
    this.#index++;

    console.group("Recorded state to history: ");
    console.table(this.#history);
    console.groupEnd();
  }

  travel(index) {
    console.info({
      index,
      length: this.#history.length,
      history: this.#history,
    });
    if (index < -1 || index >= this.#history.length) {
      throw new Error(`Invalid index ${index}. Unable to travel to state.`);
    }

    this.#index = index;
    return this.currentState;
  }

  drop(index) {
    if (index < 0 || index >= this.#history.length) {
      throw new Error(
        `Invalid index ${index}. Unable to drop state from history.`
      );
    }

    this.#history.splice(index, 1);

    if (this.#index > index) {
      this.#index--;
    }
  }

  undo() {
    if (this.#index <= 0) return null;
    return this.travel(this.#index - 1);
  }

  redo() {
    if (this.#index >= this.#history.length - 1) return null;
    return this.travel(this.#index + 1);
  }
}

export default RewindCore;
