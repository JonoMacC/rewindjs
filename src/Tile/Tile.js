import { Rewind } from "../Rewind/Rewind.js";
import { keyCombo } from "../util/string.js";
import { randomId } from "../util/math.js";

class BaseTile extends HTMLElement {
  #keys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);

  constructor(config = {}) {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<slot></slot>`;
    this.tabIndex = 0;
    this.id = randomId();

    // Initialize properties with config values or defaults
    this.top = config.top !== undefined ? config.top : 0;
    this.left = config.left !== undefined ? config.left : 0;
    this.label = config.label || "";
  }

  set top(value) {
    this.style.top = `${value}px`;
  }

  get top() {
    return parseInt(this.style.top);
  }

  set left(value) {
    this.style.left = `${value}px`;
  }

  get left() {
    return parseInt(this.style.left);
  }

  set label(value) {
    this.textContent = value;
  }

  get label() {
    return this.textContent;
  }

  static get observedAttributes() {
    return ["top", "left", "label"];
  }

  #handleKeydown(event) {
    const eventKeyCombo = keyCombo(event);
    if (!this.#keys.has(eventKeyCombo)) return;

    const keyHandlers = {
      Enter: () => {
        this.#handleChange();
      },
      ArrowUp: () => {
        this.top -= 10;
      },
      ArrowDown: () => {
        this.top += 10;
      },
      ArrowLeft: () => {
        this.left -= 10;
      },
      ArrowRight: () => {
        this.left += 10;
      },
    };

    keyHandlers[eventKeyCombo](event);
  }

  #handleChange() {
    const event = new Event("change", {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  connectedCallback() {
    // Remove initialization from attributes
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("focusout", this.#handleChange);

    // Create link for style
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "./Tile/Tile.css");

    // Append style
    this.shadowRoot.append(link);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[name] = newValue;
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.handleKeydown);
    this.removeEventListener("focusout", this.handleChange);
  }
}

const Tile = Rewind(
  class extends BaseTile {
    constructor(config = {}) {
      super(config);
    }
  },
  {
    snapshot: ["top", "left", "label"],
  }
);

customElements.define("gx-tile", Tile);

export default Tile;
