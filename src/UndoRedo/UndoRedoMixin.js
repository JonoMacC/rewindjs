import { UndoRedo } from "./UndoRedo.js";
import { keyCombo } from "../util/string-util.js";

// TODO: Create separate undo/redo CustomEvent to handle keydown events
const BubbleMode = {
  NEVER: "never",
  ON_END: "on_end",
  ALWAYS: "always",
};

export function UndoRedoMixin(BaseClass) {
  return class extends BaseClass {
    #undoRedo;
    #undoRedoKeys = new Set([
      "Ctrl+Z",
      "Meta+Z",
      "Ctrl+Y",
      "Ctrl+Shift+Z",
      "Shift+Meta+Z",
    ]);
    #bubbleMode = BubbleMode.NEVER;

    constructor(initialState = {}, initialHistory = []) {
      super();
      this.#undoRedo = new UndoRedo(initialState);
      this.#undoRedo.history = initialHistory;
    }

    set bubbleMode(mode) {
      if (Object.values(BubbleMode).includes(mode)) {
        this.#bubbleMode = mode;
      } else {
        throw new Error(
          `Invalid bubble mode. Use one of: ${Object.values(BubbleMode).join(
            ", "
          )}`
        );
      }
    }

    get bubbleMode() {
      return this.#bubbleMode;
    }

    get snapshot() {
      // This should be overridden in subclasses
      throw new Error("Snapshot getter must be implemented in subclass");
    }

    set snapshot(newSnapshot) {
      // This should be overridden in subclasses
      throw new Error("Snapshot setter must be implemented in subclass");
    }

    get undoRedoState() {
      return this.#undoRedo.currentState;
    }

    get undoRedoIndex() {
      return this.#undoRedo.currentIndex;
    }

    get undoRedoHistory() {
      return this.#undoRedo.history;
    }

    set undoRedoHistory(newHistory) {
      this.#undoRedo.history = newHistory;
    }

    record() {
      const state = this.snapshot;
      console.info(`Recording snapshot for ${this.tagName}...`);
      this.#undoRedo.record(state);

      const recordEvent = new CustomEvent("record", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.undoRedoIndex,
        },
      });

      this.dispatchEvent(recordEvent);
      return this;
    }

    travel(index) {
      const snapshot = this.#undoRedo.travel(index);
      if (snapshot === null) return;
      this.snapshot = snapshot;

      const travelEvent = new CustomEvent("travel", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.undoRedoIndex,
        },
      });

      this.dispatchEvent(travelEvent);
      return this;
    }

    drop(index) {
      this.#undoRedo.drop(index);

      const dropEvent = new CustomEvent("drop", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.undoRedoIndex,
        },
      });

      this.dispatchEvent(dropEvent);
      return this;
    }

    undo() {
      const previousSnapshot = this.#undoRedo.undo();
      if (previousSnapshot === null) return;
      this.snapshot = previousSnapshot;

      this.refocus();

      const undoEvent = new CustomEvent("undo", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.undoRedoIndex,
        },
      });

      this.dispatchEvent(undoEvent);
      return this;
    }

    redo() {
      const nextSnapshot = this.#undoRedo.redo();
      if (nextSnapshot === null) return;
      this.snapshot = nextSnapshot;

      this.refocus();

      const redoEvent = new CustomEvent("redo", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.undoRedoIndex,
        },
      });

      this.dispatchEvent(redoEvent);
      return this;
    }

    refocus() {
      // If focus is not in this element, focus it
      if (!this.contains(document.activeElement)) {
        this.focus();
      }
    }

    #handleUndoRedoKeydown(event) {
      const eventKeyCombo = keyCombo(event);
      if (!this.#undoRedoKeys.has(eventKeyCombo)) return;

      const keyHandlers = {
        "Ctrl+Z": () => this.undo(),
        "Meta+Z": () => this.undo(),
        "Ctrl+Shift+Z": () => this.redo(),
        "Shift+Meta+Z": () => this.redo(),
        "Ctrl+Y": () => this.redo(),
      };

      if (keyHandlers[eventKeyCombo]) {
        const handled = keyHandlers[eventKeyCombo]();
        event.preventDefault();

        if (
          this.#bubbleMode === BubbleMode.NEVER ||
          (this.#bubbleMode === BubbleMode.ON_END && handled)
        ) {
          event.stopPropagation();
        }
      }
    }

    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
      this.addEventListener("keydown", this.#handleUndoRedoKeydown.bind(this));
    }

    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
      this.removeEventListener(
        "keydown",
        this.#handleUndoRedoKeydown.bind(this)
      );
    }
  };
}
