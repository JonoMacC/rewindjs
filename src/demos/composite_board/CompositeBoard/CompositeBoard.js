import rewind from "../../../core/rewind.js";
import RewindTile from "../../tiles/RewindTile/RewindTile.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

/**
 * Class for a board that contains rewindable tiles. The board only concerns itself with the logic for adding and
 * removing tiles. Because the tiles are rewindable, they handle their own undo/redo history internally.
 */
class BaseBoard extends HTMLElement {
  #keyMap = {
    insertKey: ["Shift+Enter"],
    deleteKey: ["Backspace", "Delete"],
  };
  #keys;

  constructor() {
    super();

    // Initialize DOM properties
    this.tabIndex = 0;
    this.id = cel.randomId();

    // Initialize key set
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Initialize key handlers
    this.keyHandlers = {
      insertKey: this.insert.bind(this),
      deleteKey: this.delete.bind(this),
    };
  }

  // Lifecycle

  connectedCallback() {
    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("change", this.onChange);
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener("change", this.onChange);
  }

  // Private methods

  /**
   * @param {KeyboardEvent} event - The keyboard event
   */
  #handleKeydown(event) {
    const key = cel.keyCombo(event);
    if (!this.#keys.has(key)) return;

    for (const [action, keys] of Object.entries(this.#keyMap)) {
      if (keys.includes(key)) {
        this.keyHandlers[action](event);
        return;
      }
    }
  }

  // Public methods

  insert() {
    const tileWidth = 80;
    const tileHeight = 80;
    const top = Math.floor(this.offsetHeight / 2 - tileHeight / 2);
    const left = Math.floor(this.offsetWidth / 2 - tileWidth / 2);
    const label = cel.alphaLabel(this.children.length + 1);

    const tile = new RewindTile();
    tile.suspend();
    tile.top = top;
    tile.left = left;
    tile.label = label;
    tile.resume();
    tile.record();

    // Add tile to DOM
    // Rewind state should handle recording automatically
    this.append(tile);

    tile.focus();
  }

  delete() {
    // Get focused tile
    const tile = this.querySelector('gx-rw-tile:focus');
    if (!tile) return;
    // Remove tile from DOM
    // Rewind state should handle recording automatically
    tile.remove();
  }

  onChange() {
    // Insert desired board logic here for a change event
    // This setup is a little unrealistic as it is atypical to have an explicit user event trigger saving the undo state
    // without a corresponding property change.
  }
}

/**
 * Class for a rewindable board with rewindable tiles. Because the board and tiles are rewindable, child management
 * is handled by rewind. The `append` and `remove` methods called in BaseBoard are modified by rewind to record the
 * state, enabling undo/redo without explicit tracking.
 *
 * The `onChange` method is explicitly tracked, as the board does not record a property but records on an event
 * emitted by the tiles.
 */
/** @type {RewindableElementConstructor<BaseBoard>} */
const CompositeBoard = rewind(BaseBoard, {
  coalesce: ['onChange'],
});

customElements.define("gx-composite-board", CompositeBoard);
