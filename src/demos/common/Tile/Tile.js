// Utilities
import cel from "../../../lib/celerity/cel.js";

// Define the base tile class
class Tile extends HTMLElement {
  #keyMap = {
    leftKey: ["ArrowLeft"],
    upKey: ["ArrowUp"],
    rightKey: ["ArrowRight"],
    downKey: ["ArrowDown"],
  };
  #keys;
  #alphaNumKeys = /^[0-9a-zA-Z]$/;
  #keyHandlers;
  #step = 10;
  #current = false;

  constructor() {
    super();

    // Initialize DOM properties
    this.tabIndex = 0;
    this.id = cel.randomId();

    // Initialize key set
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Initialize properties with attribute values or defaults
    this.top =
      this.getAttribute("top") !== null
        ? parseInt(this.getAttribute("top"))
        : 0;
    this.left =
      this.getAttribute("left") !== null
        ? parseInt(this.getAttribute("left"))
        : 0;
    this.label =
      this.getAttribute("label") !== null ? this.getAttribute("label") : "";

    // Initialize key handlers
    this.#keyHandlers = {
      upKey: () => {
        this.top -= this.#step;
        this.#handleChange();
      },
      downKey: () => {
        this.top += this.#step;
        this.#handleChange();
      },
      leftKey: () => {
        this.left -= this.#step;
        this.#handleChange();
      },
      rightKey: () => {
        this.left += this.#step;
        this.#handleChange();
      },
      alphaNumKey: (key) => {
        this.label = key;
        this.#handleChange();
      },
    };
  }

  // Accessors

  set current(value) {
    if (this.#current === value) return;
    this.#current = value;
    if (value) {
      this.focus();
    }
  }

  get current() {
    return this.#current;
  }

  set top(value) {
    if (this.style.top === `${value}px`) return;
    this.style.top = `${value}px`;
  }

  get top() {
    return parseInt(this.style.top);
  }

  set left(value) {
    if (this.style.left === `${value}px`) return;
    this.style.left = `${value}px`;
  }

  get left() {
    return parseInt(this.style.left);
  }

  set label(value) {
    if (this.textContent === value) return;
    this.textContent = value;
  }

  get label() {
    return this.textContent;
  }

  // Lifecycle

  connectedCallback() {
    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusout', this.#handleChange);
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener('focusout', this.#handleChange);
  }

  // Private methods

  #handleKeydown = (event) => {
    // Handle keys that will trigger relabeling a tile
    if (this.#alphaNumKeys.test(event.key)
      && !(event.ctrlKey || event.metaKey)) {
      this.#keyHandlers.alphaNumKey(event.key);
    }

    const key = cel.keyCombo(event);
    if (!this.#keys.has(key)) return;

    for (const [action, keys] of Object.entries(this.#keyMap)) {
      if (keys.includes(key)) {
        this.#keyHandlers[action]();
        return;
      }
    }
  }

  #handleChange = () => {
    const event = new Event("change", {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Define the tile as a custom element
customElements.define("gx-tile", Tile);

export default Tile;
