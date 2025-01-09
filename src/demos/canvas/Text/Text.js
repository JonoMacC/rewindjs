import rewind from "../../../Rewind/rewind.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

// Define the base text class
class TextBase extends HTMLElement {
  #keyMap = {
    submitKey: ["Ctrl+Enter", "Meta+Enter"],
    cancelKey: ["Escape"],
  };
  #keys;
  #keyHandlers;
  #content;
  #submission;

  constructor() {
    super();
    this.tabIndex = 0;

    // Initialize DOM properties
    this.tabIndex = -1;
    this.contentEditable = true;
    this.id = cel.randomId();
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Initialize properties with attribute values or defaults
    this.#content =
      this.getAttribute("content") !== null ? this.getAttribute("content") : "";
    this.#submission = this.#content;

    this.#keyHandlers = {
      submitKey: this.#handleSubmit,
      cancelKey: this.#handleCancel,
    };
  }

  // Accessors

  set content(value) {
    if (this.textContent === value && this.#content === value) return;
    this.#content = value;
    if (this.textContent !== value) this.#setText(value);
  }

  get content() {
    return this.#content;
  }

  // Lifecycle

  connectedCallback() {
    this.#render();

    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusout', this.#handleFocusout);
    this.addEventListener("input", this.#handleInput);
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener('focusout', this.#handleFocusout);
    this.removeEventListener("input", this.#handleInput);
  }

  // Private methods

  #render = () => {
    this.textContent = this.content;
  }

  /**
   * Updates the text content while preserving the cursor position
   * @param {string} text - The new text content
   */
  #setText = (text) => {
    // Get current selection
    const selection = window.getSelection();

    // If there is no selection, just set the content
    if (!selection.rangeCount) {
      this.textContent = text;
      return
    }

    // Store relative cursor position
    const range = selection.getRangeAt(0);
    const cursorPos = range.startOffset;

    // Update content
    this.textContent = text;

    // Determine the updated cursor position
    const newPos = cursorPos > this.textContent.length
      ? this.textContent.length
      : cursorPos;

    // Restore cursor to same relative position
    const newRange = document.createRange();
    const textNode = this.firstChild || this;
    newRange.setStart(textNode, newPos);
    newRange.setEnd(textNode, newPos);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  #handleKeydown = (event) => {
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
    event.preventDefault();

    // Trigger the change event
    this.#handleChange();

    // Focusout the target and focus the parent
    event.target.blur();
    event.target.parentElement.focus();
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
