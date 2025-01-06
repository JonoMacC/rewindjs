import rewind from "../../../Rewind/rewind.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

// Define the base text class
class TextBase extends HTMLElement {
  #keyMap = {
    editKey: [" "],
    submitKey: ["Enter"],
    cancelKey: ["Escape"],
    leftKey: ["ArrowLeft"],
    upKey: ["ArrowUp"],
    rightKey: ["ArrowRight"],
    downKey: ["ArrowDown"],
  };
  #keys;
  #alphaNumKeys = /^[0-9a-zA-Z]$/;
  #keyHandlers;
  #step = 10;
  #content;

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
    this.#content =
      this.getAttribute("content") !== null ? this.getAttribute("content") : "";

    this.#keyHandlers = {
      editKey: this.#handleEdit,
      submitKey: this.#handleSubmit,
      cancelKey: this.#handleCancel,
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
    console.log(`Setting content: ${value}`);
    if (this.input.textContent === value && this.#content === value) return;
    this.#content = value;
    if (this.input.textContent !== value) this.#setText(this.input, value);
  }

  get content() {
    return this.#content;
  }

  // Lifecycle

  connectedCallback() {
    this.#render();

    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusout', this.#handleChange);

    this.input.addEventListener("input", this.#handleInput);

    const gridTarget = interact.snappers.grid({
      x: 4,
      y: 4,
    });

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
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener('focusout', this.#handleChange);

    this.input.removeEventListener("input", this.#handleInput);
  }

  // Private methods

  #render = () => {
    this.innerHTML = `<div class="handle tl"></div>
      <div class="handle tr"></div>
      <div contenteditable="true">${this.content}</div>
      <div class="handle bl"></div>
      <div class="handle br"></div>`;

    this.input = this.querySelector('[contenteditable="true"]');
  }

  #setText = (element, text) => {
    // Store relative cursor position
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const cursorPos = range.startOffset;

    // Update content
    element.textContent = text;

    // Determine the updated cursor position
    const newPos = cursorPos > element.textContent.length
      ? element.textContent.length
      : cursorPos;

    // Restore cursor to same relative position
    const newRange = document.createRange();
    const textNode = element.firstChild || element;
    newRange.setStart(textNode, newPos);
    newRange.setEnd(textNode, newPos);
    selection.removeAllRanges();
    selection.addRange(newRange);
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

  #handleInput = (event) => {
    // Set the content to the input value
    this.content = event.target.textContent;
  }

  #handleChange = () => {
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #handleCancel = (event) => {
    // Focusout the target and focus the parent
    event.target.blur();
    event.target.parentElement.focus();
  }

  #handleSubmit = (event) => {
    if (this.#fromEditor(event)) {
      this.focus();
      this.#handleChange();
    }
  }

  #handleEdit = (event, key = null) => {
    if (this.#fromEditor(event)) return;

    if (!key) event.preventDefault();
    this.querySelector('[contenteditable="true"]').focus();
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
    return event.target.closest('[contenteditable="true"]');
  }

  // Public methods

  setPosition(x, y) {
    this.left = x;
    this.top = y;
    this.#handleChange();
  }
}

// Create the rewindable text class
const Text = rewind(TextBase, {
  observe: ["content"],
  debounce: {
    content: 400,
  },
});

// Define the text as a custom element
customElements.define("gx-text", Text);

export default Text;
