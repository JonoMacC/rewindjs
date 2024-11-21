import { RewindComposite } from "../Rewind/RewindComposite.js";

// Components
import Tile from "../Tile/Tile.js";

// Utilities
import cel from "../lib/celerity/cel.js";

class BaseBoard extends HTMLElement {
  constructor() {
    super();
    this.tabIndex = 0;
    this.id = cel.randomId();
  }
}

export default class Board extends RewindComposite(BaseBoard) {
  #keys;
  #keyMap = {
    insertKey: ["Shift+Enter"],
    deleteKey: ["Backspace", "Delete"],
  };
  constructor() {
    super({
      selectors: ["gx-tile"],
      createChild: (initialState, options) => {
        const tile = new Tile(initialState);
        tile.id = cel.randomId();
        if (!initialState.label) {
          tile.label = cel.alphaLabel(this.children.length + 1);
        }
        return tile;
      },
      childOptions: {},
    });
    this.#keys = new Set(Object.values(this.#keyMap).flat());
    this.keyHandlers = {
      insertKey: this.spawnTile.bind(this),
      deleteKey: this.delete.bind(this),
    };
  }

  spawnTile() {
    const tileWidth = 80;
    const tileHeight = 80;

    const initialState = {
      top: this.offsetHeight / 2 - tileHeight / 2,
      left: this.offsetWidth / 2 - tileWidth / 2,
      label: cel.alphaLabel(this.children.length + 1),
    };

    const tile = this.spawn(initialState);
    tile.focus();
    this.record();
  }

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

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("change", this.#handleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener("change", this.#handleChange);
  }
}

customElements.define("gx-board", Board);
