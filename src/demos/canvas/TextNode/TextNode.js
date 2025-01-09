import Text from "../Text/Text.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

// Define the base text node class
class TextNode extends HTMLElement {
  #keyMap = {
    editKey: [" "],
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
  #content;
  #options;

  /**
   * @param {Object} options - Rewind options for the text input
   * @param {Object[]} options.history - History of recorded states
   * @param {number} options.index - Index of the current state
   */
  constructor(options = {}) {
    super();

    // Initialize DOM properties
    this.tabIndex = 0;
    this.id = cel.randomId();

    // Initialize key set
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Retrieve any options from constructor so they are available in rendering
    // the text input
    this.#options = options;

    // Initialize properties with attribute values or defaults
    this.top =
      this.getAttribute("top") !== null
        ? parseInt(this.getAttribute("top"))
        : 0;
    this.left =
      this.getAttribute("left") !== null
        ? parseInt(this.getAttribute("left"))
        : 0;
    this.#content =
      this.getAttribute("content") !== null
        ? this.getAttribute("content")
        : "";

    // Initialize key handlers
    this.#keyHandlers = {
      editKey: this.#handleEdit,
      upKey: (event) => {
        if (this.#fromEditor(event)) return;
        this.top -= this.#step;
        this.#handleChange();
      },
      downKey: (event) => {
        if (this.#fromEditor(event)) return;
        this.top += this.#step;
        this.#handleChange();
      },
      leftKey: (event) => {
        if (this.#fromEditor(event)) return;
        this.left -= this.#step;
        this.#handleChange();
      },
      rightKey: (event) => {
        if (this.#fromEditor(event)) return;
        this.left += this.#step;
        this.#handleChange();
      },
      alphaNumKey: this.#handleEdit,
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

  set content(value) {
    if (this.content === value) return;
    this.#content = value;

    if (!this.input) return;
    this.input.content = value;
  }

  get content() {
    if (!this.input) return this.#content;
    return this.input.content;
  }

  get rewindHistory() {
    return this.input.rewindHistory;
  }

  get rewindIndex() {
    return this.input.rewindIndex;
  }

  // Lifecycle

  connectedCallback() {
    this.#render();

    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);

    // Create 4x4 grid snapping object
    const gridTarget = interact.snappers.grid({
      x: 4,
      y: 4,
    });

    // Set up dragging interaction
    interact(this).draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: "parent",
          elementRect: { left: 0, right: 0, top: 1, bottom: 1 },
        }),
        interact.modifiers.snap({ targets: [gridTarget] })
      ],
      listeners: {
        start: this.#handleDragStart,
        move: this.#handleDrag,
        end: this.#handleDragEnd,
      }
    }).styleCursor(false);
  }

  disconnectedCallback() {
    // Remove event listeners
    this.removeEventListener("keydown", this.#handleKeydown);
  }

  // Private methods

  #render = () => {
    this.innerHTML = `<div class="handle tl"></div>
      <div class="handle tr"></div>
      <div class="handle bl"></div>
      <div class="handle br"></div>`;

    // Create the text input
    // This cannot be done declaratively because setting the rewind history and index is only
    // supported via the constructor
    this.input = new Text(this.#options);

    // Set the content for the text input
    this.input.content = this.#content;

    // Insert the text input in the correct position
    const refNode = this.querySelector('.bl');
    this.insertBefore(this.input, refNode);
  }

  #handleKeydown = (event) => {
    // Handle keys that will trigger relabeling a tile
    if (this.#alphaNumKeys.test(event.key)
      && !(event.ctrlKey || event.metaKey)) {
      this.#keyHandlers.alphaNumKey(event, event.key);
    }

    const key = cel.keyCombo(event);
    if (!this.#keys.has(key)) return;

    for (const [action, keys] of Object.entries(this.#keyMap)) {
      if (keys.includes(key)) {
        this.#keyHandlers[action](event);
        return;
      }
    }
  }

  #handleChange = () => {
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #handleEdit = (event, key = null) => {
    if (this.#fromEditor(event)) return;

    if (!key) event.preventDefault();
    this.input.focus();
  }

  #handleDragStart = (event) => {
    if (this.#fromEditor(event)) return;

    // Add drag class
    this.classList.add('drag');
  }

  #handleDrag = (event) => {
    this.setPosition(this.left + event.dx, this.top + event.dy);
  }

  #handleDragEnd = () => {
    // Remove drag class
    this.classList.remove('drag');
  }

  #fromEditor = (event) => {
    return event.target.closest('gx-text');
  }

  // Public methods

  setPosition(x, y) {
    this.left = x;
    this.top = y;
    this.#handleChange();
  }

  edit() {
    this.input.focus();
  }
}

// Define the text node as a custom element
customElements.define("gx-text-node", TextNode);

export default TextNode;
