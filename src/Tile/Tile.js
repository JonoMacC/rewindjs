import { rewind } from "../Rewind/rewind.js";

// Utilities
import cel from "../lib/celerity/cel.js";

class BaseTile extends HTMLElement {
  #keys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"]);
  #keyMap = {
    submitKey: ["Enter"],
    leftKey: ["ArrowLeft"],
    upKey: ["ArrowUp"],
    rightKey: ["ArrowRight"],
    downKey: ["ArrowDown"],
  };
  constructor() {
    super();
    this.tabIndex = 0;
    this.id = cel.randomId();

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

    this.keyHandlers = {
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

const Tile = rewind(BaseTile, {
  observe: ["top", "left", "label"],
});

customElements.define("gx-tile", Tile);

export default Tile;
