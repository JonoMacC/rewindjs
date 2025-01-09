import { rewindElement } from "../../../Rewind/rewind.js";

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

    // Initialize DOM properties
    this.tabIndex = -1;
    this.contentEditable = true;
    this.id = cel.randomId();

    // Initialize key set
    this.#keys = new Set(Object.values(this.#keyMap).flat());

    // Initialize properties with attribute values or defaults
    this.#content =
      this.getAttribute("content") !== null ? this.getAttribute("content") : "";
    this.#submission = this.#content;

    // Initialize key handlers
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

    // Add event listeners
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusout', this.#handleFocusout);
    this.addEventListener("input", this.#handleInput);
  }

  disconnectedCallback() {
    // Remove event listeners
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

  /**
   * Handles keydown events and triggers the appropriate action from the keyHandlers map
   * @param {KeyboardEvent} event - The keydown event
   */
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

  /**
   * Keeps the content in state in sync with the input as the user types
   * @param {InputEvent} event - The input event
   */
  #handleInput = (event) => {
    // Set the content to the input value
    this.content = event.target.textContent;
  }

  /**
   * Triggers the change event if the content has changed on focusout
   */
  #handleFocusout = () => {
    // If the content has changed, trigger the change event
    if (this.#submission !== this.#content) {
      this.#handleChange();
    }
  }

  /**
   * Dispatches a change event and updates the submission to match the content
   */
  #handleChange = () => {
    this.#submission = this.content;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * When the user cancels editing, focusout the target and focus the parent
   * @param {KeyboardEvent} event - The keyboard event
   */
  #handleCancel = (event) => {
    // Focusout the target and focus the parent
    event.target.blur();
    event.target.parentElement.focus();
  }

  /**
   * When the user submits the text, trigger the change event and focusout the target and focus the parent
   * @param {KeyboardEvent} event - The keyboard event
   */
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
const Text = rewindElement(TextBase, {
  observe: ["content"],
  debounce: {
    content: 400,
  },
});

// Define as a custom element
customElements.define("gx-text", Text);

export default Text;
