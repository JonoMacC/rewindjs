import rewind from "../Rewind/rewind.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Define the base tile class
class BaseTile extends HTMLElement {
  #keyMap = {
    submitKey: ["Enter"],
    leftKey: ["ArrowLeft"],
    upKey: ["ArrowUp"],
    rightKey: ["ArrowRight"],
    downKey: ["ArrowDown"],
  };
  #keys;
  #alphaNumKeys = /^[0-9a-zA-Z]$/;
  constructor() {
    super();
    this.tabIndex = 0;
    this.id = cel.randomId();
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

    this.#keyHandlers = {
      submitKey: this.#handleChange.bind(this),
      upKey: () => {
        this.top -= 10;
      },
      downKey: () => {
        this.top += 10;
      },
      leftKey: () => {
        this.left -= 10;
      },
      rightKey: () => {
        this.left += 10;
      },
      alphaNumKey: (key) => {
        this.label = key ;
      },
    };
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

  #handleKeydown(event) {
    // Handle keys that will trigger relabeling a tile
    if (this.#alphaNumKeys.test(event.key)
      && !(event.ctrlKey || event.metaKey)) {
      this.#keyHandlers.alphaNumKey(event.key);
      return;
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
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener("focusout", this.#handleChange);
  }
}

// Create the rewindable tile class (Tile + Undo/Redo)
const Tile = rewind(BaseTile, {
  observe: ["top", "left", "label"],
});

// Define the rewindable tile as a custom element
customElements.define("gx-tile", Tile);

export default Tile;
