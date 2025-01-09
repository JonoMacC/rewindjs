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
    this.tabIndex = 0;
    this.id = cel.randomId();
    this.#keys = new Set(Object.values(this.#keyMap).flat());
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
    let hasCurrentTile = false;
    for (const [id, props] of newTiles) {
      let tile = this.querySelector(`#${id}`);

      if (!tile) {
        tile = new Tile();
        tile.id = id;

        // Get the position
        const position = props.position;
        this.insertBefore(tile, this.children[position]);
      }

      tile.style.top = props.top + 'px';
      tile.style.left = props.left + 'px';
      tile.label = props.label;

      if (props.current) {
        tile.focus();
        hasCurrentTile = true;
      }
    }

    // If no tile is current in state, focus the board
    if (!hasCurrentTile) {
      this.focus();
    }

    this.#tiles = newTiles;
  }

  get currentTile() {
    return this.querySelector('gx-tile:focus');
  }

  // Lifecycle

  connectedCallback() {
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("change", this.#handleChange);

    this.#tiles = new Map(
      Array.from(this.querySelectorAll('gx-tile'), (tile) => [
        tile.id,
        {
          top: parseFloat(tile.style.top),
          left: parseFloat(tile.style.left),
          label: tile.label,
          current: tile.matches(':focus'),
          position: Array.from(this.querySelectorAll('gx-tile')).indexOf(tile)
        }
      ])
    );
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.#handleKeydown);
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

  #handleChange = (event) => {
    const tile = event.target.closest('gx-tile');
    const top = parseFloat(tile.style.top);
    const left = parseFloat(tile.style.left);

    this.#updateTile(tile.id, {
      top,
      left,
      label: tile.label,
      current: tile.matches(':focus')
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
    
    if (props.top !== undefined) tile.style.top = props.top + 'px';
    if (props.left !== undefined) tile.style.left = props.left + 'px';
    if (props.label !== undefined) tile.label = props.label;
    
    tiles.set(id, { ...props });
    this.tiles = tiles;
  }

  // Public methods

  /**
   * Adds a new tile to the state
   */
  insertTile() {
    const tileWidth = 80;
    const tileHeight = 80;
    const id = cel.randomId();

    // Focus the board (removes focus from current tile)
    this.focus();

    const tiles = new Map(this.tiles);
    tiles.set(id, {
      top: this.offsetHeight / 2 - tileHeight / 2,
      left: this.offsetWidth / 2 - tileWidth / 2,
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
  }
}

const Board = rewind(BaseBoard, {
  observe: ["tiles"]
});

customElements.define("gx-board", Board);
