import { DynamicChildrenMixin } from "../UndoRedo/DynamicChildrenMixin.js";
import { keyCombo, alphaLabel } from "../util/string-util.js";
import { randomId } from "../util/math-util.js";
import Tile from "../Tile/Tile.js";

class BaseBoard extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<slot></slot>`;
    this.tabIndex = 0;
    this.id = randomId();
  }

  #handleChange(event) {
    // Hook for extended functionality
    this.onChange(event);
  }

  // Hook method to be overridden
  onChange(event) {
    // This method will be overridden in the Board class
  }

  connectedCallback() {
    this.addEventListener("change", this.#handleChange);

    // Create link for style
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "./Board/Board.css");

    // Append style
    this.shadowRoot.append(link);
  }

  disconnectedCallback() {
    this.removeEventListener("change", this.#handleChange);
  }
}

export default class Board extends DynamicChildrenMixin(BaseBoard) {
  #keys = new Set(["Shift+Enter", "Backspace", "Delete"]);

  constructor() {
    super(["gx-tile"]);
  }

  set bubbleMode(value) {
    super.bubbleMode = value;
    // Propagate the bubble mode to all child Tiles
    this.querySelectorAll("gx-tile").forEach(
      (tile) => (tile.bubbleMode = value)
    );
  }

  #handleKeydown(event) {
    const eventKeyCombo = keyCombo(event);
    if (!this.#keys.has(eventKeyCombo)) return;

    const keyHandlers = {
      "Shift+Enter": () => {
        this.spawnTile();
      },
      Backspace: () => {
        this.delete(event);
      },
      Delete: () => {
        this.delete(event);
      },
    };

    keyHandlers[eventKeyCombo](event);
  }

  // TODO: Initialize tiles with initial state instead of repositioning
  spawnTile() {
    const tile = this.spawn();
    const { offsetWidth, offsetHeight } = this;
    const { offsetWidth: tileWidth, offsetHeight: tileHeight } = tile;

    tile.top = offsetHeight / 2 - tileHeight / 2;
    tile.left = offsetWidth / 2 - tileWidth / 2;

    tile.record().drop(0).focus();
    this.record().drop(this.undoRedoIndex - 1);
  }

  createChild(initialState, initialHistory) {
    const tile = new Tile(initialState, initialHistory);
    tile.id = randomId();
    if (!initialState) {
      tile.textContent = alphaLabel(this.children.length + 1);
    }
    return tile;
  }

  onChange() {
    if (this.initialized) {
      this.record();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener("keydown", this.#handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.#handleKeydown);
  }
}

customElements.define("gx-board", Board);
