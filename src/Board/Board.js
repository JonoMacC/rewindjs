import { RewindComposite } from "../Rewind/RewindComposite.js";
import { keyCombo, alphaLabel } from "../util/string.js";
import { randomId } from "../util/math.js";
import Tile from "../Tile/Tile.js";

class BaseBoard extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<slot></slot>`;
    this.tabIndex = 0;
    this.id = randomId();
  }

  connectedCallback() {
    // Create link for style
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "./Board/Board.css");

    // Append style
    this.shadowRoot.append(link);
  }
}

export default class Board extends RewindComposite(BaseBoard) {
  #keys = new Set(["Shift+Enter", "Backspace", "Delete"]);

  constructor() {
    super({
      selectors: ["gx-tile"],
      createChild: (initialState, options) => {
        const tile = new Tile(initialState);
        tile.id = randomId();
        if (!initialState.label) {
          tile.label = alphaLabel(this.children.length + 1);
        }
        return tile;
      },
      childOptions: {},
    });
  }

  spawnTile() {
    const tileWidth = 80;
    const tileHeight = 80;

    const initialState = {
      top: this.offsetHeight / 2 - tileHeight / 2,
      left: this.offsetWidth / 2 - tileWidth / 2,
      label: alphaLabel(this.children.length + 1),
    };

    const tile = this.spawn(initialState);
    tile.focus();
    this.record();
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
