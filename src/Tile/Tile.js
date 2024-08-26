import { UndoRedoMixin } from "../UndoRedo/UndoRedoMixin.js";
import { keyCombo } from "../util/string-util.js";
import { randomId } from "../util/math-util.js";

class BaseTile extends HTMLElement {
  #keys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<slot></slot>`;
    this.tabIndex = 0;
    this.id = randomId();
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
        this.onMove();
      },
      ArrowDown: () => {
        this.top += 10;
        this.onMove();
      },
      ArrowLeft: () => {
        this.left -= 10;
        this.onMove();
      },
      ArrowRight: () => {
        this.left += 10;
        this.onMove();
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
    // Initialize position from attributes
    this.top = this.hasAttribute("top")
      ? parseInt(this.getAttribute("top"), 10)
      : 0;
    this.left = this.hasAttribute("left")
      ? parseInt(this.getAttribute("left"), 10)
      : 0;

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

  onMove() {
    // This method will be overridden in the Tile class
  }
}

export default class Tile extends UndoRedoMixin(BaseTile) {
  constructor(initialState, initialHistory) {
    super(initialState, initialHistory);
  }

  get snapshot() {
    return {
      top: this.top,
      left: this.left,
      label: this.label,
    };
  }

  set snapshot(newSnapshot) {
    this.top = newSnapshot.top;
    this.left = newSnapshot.left;
    this.label = newSnapshot.label;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.undoRedoHistory.length === 0) {
      this.record();
    }
  }

  // Override the onMove method
  onMove() {
    this.record();
  }
}

customElements.define("gx-tile", Tile);
