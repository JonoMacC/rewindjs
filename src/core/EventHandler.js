import cel from "../lib/celerity/cel.js";

/**
 * @typedef {Object} CustomKeys
 * @property {string[]} undo - The undo keys.
 * @default ["Ctrl+Z", "Meta+Z"]
 * @property {string[]} redo - The redo keys.
 * @default ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"]
 */

/**
 * EventHandler
 *
 * Handles undo and redo events triggered by keyboard shortcuts.
 * Allows for custom key mappings and dispatches custom events for undo and redo actions.
 *
 * @class
 * @property {HTMLElement} target - The target element to listen for keyboard events.
 * @property {CustomKeys} [customKeys] - Custom key mappings for undo and redo actions.
 *
 * @example
 * const rewindEventHandler = new RewindEventHandler(target, {
 *   undo: ["Ctrl+U"],
 *   redo: ["Ctrl+R"],
 * });
 */
export class EventHandler {
  static UNDO_EVENT = "undo";
  static REDO_EVENT = "redo";

  static DEFAULT_KEYS = {
    undo: ["Ctrl+Z", "Meta+Z"],
    redo: ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"],
  };

  #keyMap;
  #undoRedoKeys;

  constructor(target, customKeys = {}) {
    this.target = target;
    this.#keyMap = cel.mergeKeyMaps(EventHandler.DEFAULT_KEYS, customKeys);
    this.#undoRedoKeys = new Set([...this.#keyMap.undo, ...this.#keyMap.redo]);
    this.handleKeyDown = (event) => this.#handleKeydown(event);
    this.target.addEventListener("keydown", this.handleKeyDown);
  }

  get keyMap() {
    return this.#keyMap;
  }

  #handleKeydown(event) {
    const keyCombo = cel.keyCombo(event);
    if (!this.#undoRedoKeys.has(keyCombo)) return;

    let eventType;
    if (this.#keyMap.undo.includes(keyCombo)) {
      eventType = EventHandler.UNDO_EVENT;
    } else if (this.#keyMap.redo.includes(keyCombo)) {
      eventType = EventHandler.REDO_EVENT;
    }

    if (eventType) {
      const rewindEvent = new CustomEvent(eventType, {
        bubbles: true,
        cancelable: true,
        detail: { originalEvent: event },
      });

      // Prevent the default action and stop event propagation
      event.preventDefault();
      event.stopPropagation();

      this.target.dispatchEvent(rewindEvent);
    }
  }

  destroy() {
    this.target.removeEventListener("keydown", this.handleKeydown);
  }
}
