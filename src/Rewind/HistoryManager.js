// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './types.js';

export const UndoModel = {
  LINEAR: "linear",
  HISTORY: "history",
};

/**
 * HistoryManager
 *
 * Manages the undo/redo functionality for a component.
 *
 * @class
 * @property {Object[]} history - The history of recorded states.
 * @property {UndoModel} model - The undo model being used.
 *
 * @example
 * const rewind = new RewindCore(UndoModel.LINEAR);
 * rewind.record({ content: 'Hello' });
 * rewind.record({ content: 'Hello World' });
 * const previousState = rewind.previousState; // Returns { content: 'Hello' }
 * rewind.undo();
 * const nextState = rewind.nextState; // Returns { content: 'Hello World' }
 */
export class HistoryManager {
  #history = [];
  #index = -1;
  #model;

  constructor(model = UndoModel.LINEAR) {
    this.#model = model;
  }

  get index() {
    return this.#index;
  }

  get previousState() {
    return this.#index > 0 ? this.#history[this.#index - 1] : null;
  }

  get nextState() {
    return this.#index + 1 < this.#history.length
      ? this.#history[this.#index + 1]
      : null;
  }

  get state() {
    return this.#index >= 0 ? this.#history[this.#index] : null;
  }

  get history() {
    return this.#history;
  }

  set history(newHistory) {
    this.#history = [...newHistory];
    this.#index = Math.min(this.#index, newHistory.length - 1);
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

  /**
   * Records a new state in the history
   * @param {Object} state - The state to record
   * @returns {boolean} - Whether the state was recorded
   */
  record(state) {
    if (cel.isEmpty(state)) {
      console.info("State is empty, not recording.");
      return false;
    }

    if (cel.deepEqual(state, this.state)) {
      console.info("State unchanged, not recording.");
      return false;
    }

    const historyHandlers = {
      [UndoModel.LINEAR]: () => {
        /**
         * Linear Undo Model
         *
         * Future states are overwritten when recording from a position backwards
         * in the history.
         */
        return [...this.#history.slice(0, this.#index + 1)];
      },
      [UndoModel.HISTORY]: () => {
        /**
         * History Undo Model
         *
         * Future states are preserved by always recording a new state to the
         * end of history.
         */
        const newHistory = [...this.#history];
        // If we're not at the end of the history, append the current state
        if (this.#index < this.#history.length - 1) {
          newHistory.push(this.state);
        }
        return newHistory;
      },
    };

    const handler = historyHandlers[this.model];
    if (!handler) {
      throw new Error(`Invalid undo model: ${this.model}`);
    }
    const newHistory = handler();

    newHistory.push(state);
    this.history = newHistory;
    this.#index++;

    console.group("Recorded state to history: ");
    console.table(this.history);
    console.groupEnd();

    return true;
  }

  /**
   * Travels to a specific point in history
   * @param {number} index - The index to travel to
   * @returns {Object|null} - The state at that index
   */
  travel(index) {
    console.info({
      index,
      length: this.history.length,
      history: this.history,
    });
    if (index < -1 || index >= this.history.length) {
      return null;
    }
    this.#index = index;
    return this.state;
  }

  drop(index) {
    if (index < 0 || index >= this.history.length) {
      return false;
    }

    const newHistory = this.history.toSpliced(index, 1);

    const newIndex = this.#index > index ? this.#index - 1 : this.#index;
    this.history = newHistory;
    this.#index = newIndex;

    return true;
  }

  undo() {
    return this.travel(this.index - 1);
  }

  redo() {
    return this.travel(this.index + 1);
  }
}

export default HistoryManager;
