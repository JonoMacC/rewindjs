import rewind from "../../../Rewind/rewind.js";
import Tile from "../../common/Tile/Tile.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

class BaseBoard extends HTMLElement {
  #keyMap = {
    insertKey: ["Shift+Enter"],
    deleteKey: ["Backspace", "Delete"],
  };
  #keys;
  #tiles = new Map();

  constructor() {
    super();

    // Initialize DOM properties
    this.tabIndex = 0;
    this.id = cel.randomId();

    // Initialize key set
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Initialize key handlers
    this.keyHandlers = {
      insertKey: this.insertTile.bind(this),
      deleteKey: this.delete.bind(this),
    };
  }

  // Accessors

  get tiles() {
    return this.#tiles;
  }

  set tiles(newTiles) {
    // Do nothing if no change
    if (cel.deepEqual(this.tiles, newTiles)) return;

    const existingIds = new Set([...this.#tiles.keys()]);
    const newIds = new Set([...newTiles.keys()]);

    // Remove tiles not in new set
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const tile = this.querySelector(`#${id}`);
        if (tile) this.removeChild(tile);
      }
    }

    // Add or update tiles
    for (const [id, props] of newTiles) {
      let tile = this.querySelector(`#${id}`);

      // If the tile does not exist in the DOM, create it
      if (!tile) {
        tile = new Tile();
        tile.id = id;

        // Get the position
        const position = props.position;
        this.insertBefore(tile, this.children[position]);
      }

      // Set properties on the tile
      for (const [key, value] of Object.entries(props)) {
        tile[key] = value;
      }
    }

    this.#tiles = newTiles;
  }

  get currentTile() {
    return this.querySelector('gx-tile:focus');
  }

  // Lifecycle

  connectedCallback() {
    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusin', this.#handleFocusin);
    this.addEventListener("change", this.#handleChange);

    // Initialize tiles from DOM
    this.#tiles = new Map(
      Array.from(this.querySelectorAll('gx-tile'), (tile) => [
        tile.id,
        {
          top: tile.top,
          left: tile.left,
          label: tile.label,
          current: tile.current,
          position: Array.from(this.children).indexOf(tile)
        }
      ])
    );
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener('focusin', this.#handleFocusin);
    this.removeEventListener("change", this.#handleChange);
  }

  // Private methods

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

  #handleFocusin(event) {
    const tile = event.target.closest('gx-tile');

    // If the event target is not a tile, do nothing
    if (event.target !== tile) return;

    // If the tile is already current, do nothing
    if (tile.current) return;

    // Otherwise, mark the tile as current and the previous tile as not current
    const currentTile = event.relatedTarget?.closest('gx-tile');
    if (currentTile) {
      const tiles = new Map(this.tiles);

      currentTile.current = false;
      tiles.set(currentTile.id, { ...tiles.get(currentTile.id), current: false });

      tile.current = true;
      tiles.set(tile.id, { ...tiles.get(tile.id), current: true });

      this.tiles = tiles;
    } else {
      this.#updateTile(tile.id, { current: true });
    }
  }

  #handleChange = (event) => {
    const tile = event.target.closest('gx-tile');

    this.#updateTile(tile.id, {
      top: tile.top,
      left: tile.left,
      label: tile.label,
      current: tile.current
    });
  }

  /**
   * Updates a tile element on the board given properties in state
   * @param {string} id - Unique identifier for the tile
   * @param {Object} props - Properties to update
   */
  #updateTile(id, props) {
    const tiles = new Map(this.tiles);
    const tile = this.querySelector(`#${id}`);

    if (!tile) {
      throw new Error(`Tile with id ${id} not found`);
    }

    // Get existing tile data
    const tileData = tiles.get(id) || {};

    // Merge new props with existing tile data, only updating provided values
    const updatedProps = { ...tileData, ...props };

    // Update the tile element in DOM
    for (const [key, value] of Object.entries(updatedProps)) {
      if (value === undefined) continue;

      tile[key] = value;
    }

    // Store the complete updated state
    tiles.set(id, updatedProps);

    this.tiles = tiles;
  }

  #refocus() {
    if (this.currentTile) return;
    this.focus();
  }

  // Public methods

  /**
   * Adds a new tile to the state
   */
  insertTile() {
    const tileWidth = 80;
    const tileHeight = 80;
    const top = Math.floor(this.offsetHeight / 2 - tileHeight / 2);
    const left = Math.floor(this.offsetWidth / 2 - tileWidth / 2);
    const id = cel.randomId();

    const tiles = new Map(this.tiles);

    // Remove focus from current tile
    if (this.currentTile) {
      tiles.set(this.currentTile.id, {
        ...tiles.get(this.currentTile.id),
        current: false
      });
    }

    tiles.set(id, {
      top,
      left,
      label: cel.alphaLabel(this.children.length + 1),
      current: true,
      position: this.children.length
    });
    this.tiles = tiles;
  }

  /**
   * Deletes the current tile
   */
  delete() {
    const tile = this.currentTile;
    if (!tile) return;

    const tiles = new Map(this.tiles);

    // Ensure the current tile is set in state
    tiles.set(tile.id, {
      ...tiles.get(tile.id),
      current: true,
    });

    // Remove tile
    tiles.delete(tile.id);

    // Set previous tile as current if any, fallback to last child (if not the deleted tile)
    const prev = tile.previousElementSibling ?? 
                (this.lastElementChild !== tile ? this.lastElementChild : null);
    if (prev) {
      tiles.set(prev.id, {
        ...tiles.get(prev.id),
        current: true
      });
    }

    this.tiles = tiles;

    this.#refocus();
  }
}

const Board = rewind(BaseBoard, {
  observe: ["tiles"]
});

customElements.define("gx-board", Board);
