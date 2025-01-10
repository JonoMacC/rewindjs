import rewind from "../../../Rewind/rewind.js";
import RewindTile from "../../tiles/RewindTile/RewindTile.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

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
      insertKey: this.spawnTile.bind(this),
      deleteKey: this.delete.bind(this),
    };
  }

  // Lifecycle

  connectedCallback() {
    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("change", this.#handleChange);
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener("change", this.#handleChange);
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
        this.keyHandlers[action]();
        return;
      }
    }
  }

  #handleChange() {
    this.record();
  }

  // Public methods

  spawnTile() {
    const tileWidth = 80;
    const tileHeight = 80;

    const initialState = {
      top: this.offsetHeight / 2 - tileHeight / 2,
      left: this.offsetWidth / 2 - tileWidth / 2,
      label: cel.alphaLabel(this.children.length + 1),
    };

    const tile = new RewindTile();
    tile.suspend();
    tile.top = initialState.top;
    tile.left = initialState.left;
    tile.label = initialState.label;
    tile.resume();
    tile.record();

    this.addRewindable(cel.randomId(), tile);

    tile.focus();
  }

  delete() {
    // Get focused tile
    const tile = this.querySelector('gx-rw-tile:focus');
    if (!tile) return;
    this.removeRewindable(tile.id);
  }
}

const CompositeBoard = rewind(BaseBoard);

customElements.define("gx-composite-board", CompositeBoard);
