import rewind from "../../../Rewind/rewind.js";
import TextNode from "../TextNode/TextNode.js";

// Utilities
import cel from "../../../lib/celerity/cel.js";

// TODO: Isolate handling of content undo/redo to Text
// TODO: Manage Text as Rewindables
class BaseCanvas extends HTMLElement {
  #keyMap = {
    insertKey: ["Shift+Enter"],
    deleteKey: ["Backspace", "Delete"],
  };
  #keys;
  #nodes = new Map();

  constructor() {
    super();
    this.tabIndex = 0;
    this.id = cel.randomId();
    this.#keys = new Set(Object.values(this.#keyMap).flat());
    this.keyHandlers = {
      insertKey: (event) => {
        event.preventDefault();
        this.insertNode();
      },
      deleteKey: (event) => this.#handleDelete(event),
    };
  }

  // Accessors

  get nodes() {
    return this.#nodes;
  }

  set nodes(newNodes) {
    // Do nothing if no change
    if (cel.deepEqual(this.nodes, newNodes)) return;

    const existingIds = new Set([...this.nodes.keys()]);
    const newIds = new Set([...newNodes.keys()]);

    // Remove nodes not in new set
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const node = this.querySelector(`#${id}`);
        if (node) this.removeChild(node);
      }
    }

    // Add or update nodes
    for (const [id, props] of newNodes) {
      let node = this.querySelector(`#${id}`);

      if (!node) {
        const history = props.rewindHistory;
        const index = props.rewindIndex;

        // Initialize the text node with rewind history and index if available
        node = new TextNode({
          history,
          index
        });
        node.id = id;

        // Get the position
        const position = props.position;
        this.insertBefore(node, this.children[position]);
      }

      // Set the node properties
      for (const [key, value] of Object.entries(props)) {
        // Skip over setting rewind history and index, these are only
        // set during initialization
        if (key === "rewindHistory" || key === "rewindIndex") {
          continue;
        }

        node[key] = value;
      }
    }

    this.#nodes = newNodes;
  }

  get currentNode() {
    return this.querySelector('gx-text-node:focus-within');
  }

  // Lifecycle

  connectedCallback() {
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener('focusin', this.#handleFocusin);
    this.addEventListener("change", this.#debouncedChange);

    this.#nodes = new Map(
      Array.from(this.querySelectorAll('gx-text-node'), (node) => [
        node.id,
        {
          top: node.top,
          left: node.left,
          content: node.content,
          current: node.current,
          rewindHistory: [...node.rewindHistory],
          rewindIndex: node.rewindIndex,
          position: Array.from(this.children).indexOf(node)
        }
      ])
    );
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener('focusin', this.#handleFocusin);
    this.removeEventListener("change", this.#debouncedChange);
  }

  // Private methods

  #handleKeydown = (event) => {
    const key = cel.keyCombo(event);
    if (!this.#keys.has(key)) return;

    for (const [action, keys] of Object.entries(this.#keyMap)) {
      if (keys.includes(key)) {
        this.keyHandlers[action](event);
        return;
      }
    }
  }

  #handleFocusin = (event) => {
    const node = event.target.closest('gx-text-node');

    // If the event target is not a node, ignore
    if (event.target !== node) return;

    // If the node is already current, ignore
    if (node.current) return;

    const currentNode = event.relatedTarget?.closest('gx-text-node');
    if (currentNode) {
      const nodes = new Map(this.nodes);

      currentNode.current = false;
      nodes.set(currentNode.id, { ...nodes.get(currentNode.id), current: false });

      node.current = true;
      nodes.set(node.id, { ...nodes.get(node.id), current: true });

      this.nodes = nodes;
    } else {
      this.#updateNode(node.id, { current: true });
    }
  }

  #handleChange = (event) => {
    const node = event.target.closest('gx-text-node');

    this.#updateNode(node.id, {
      top: node.top,
      left: node.left,
      content: node.content,
      current: node.current,
      rewindHistory: [...node.rewindHistory],
      rewindIndex: node.rewindIndex
    });
  }

  #handleDelete = (event) => {
    const node = event.target.closest('gx-text-node');
    if (event.target !== node) return;

    this.delete(node.id);
  }

  #debouncedChange = cel.debounce(this.#handleChange, 400);

  /**
   * Updates a node element on the board given properties in state
   * @param {string} id - Unique identifier for the node
   * @param {Object} props - Properties to update
   */
  #updateNode = (id, props) => {
    const nodes = new Map(this.nodes);
    const node = this.querySelector(`#${id}`);

    if (!node) {
      throw new Error(`Node with id ${id} not found`);
    }

    // Get existing node data
    const nodeData = nodes.get(id) || {};

    // Merge new props with existing data, only updating provided values
    const updatedProps = { ...nodeData, ...props };

    // Update DOM node properties
    for (const [key, value] of Object.entries(updatedProps)) {
      if (key === 'rewindHistory' || key === 'rewindIndex' || key === 'position') {
        continue;
      }

      if (value === undefined) {
        continue;
      }

      node[key] = value;
    }

    // Store the complete updated state
    nodes.set(id, updatedProps);

    this.nodes = nodes;
  }

  // Public methods

  /**
   * Adds a new node to the state
   */
  insertNode() {
    const nodeWidth = 80;
    const nodeHeight = 80;
    const id = cel.randomId();

    // Focus the board (removes focus from current node)
    this.focus();

    const nodes = new Map(this.nodes);

    // Remove focus from current node
    if (this.currentNode) {
      this.currentNode.current = false;
      nodes.set(this.currentNode.id, {
        ...nodes.get(this.currentNode.id),
        current: false
      });
    }

    nodes.set(id, {
      top: this.offsetHeight / 2 - nodeHeight / 2,
      left: this.offsetWidth / 2 - nodeWidth / 2,
      content: "",
      current: true,
      position: this.children.length
    });
    this.nodes = nodes;

    // Get the new node
    const node = this.querySelector(`#${id}`);

    // Start editing
    node.edit();
  }

  /**
   * Deletes the current node
   */
  delete() {
    const node = this.currentNode;
    if (!node) return;

    const nodes = new Map(this.nodes);

    // Ensure the current node is set in state
    nodes.set(node.id, {
      ...nodes.get(node.id),
      current: true,
    });

    // Remove node
    nodes.delete(node.id);

    // Set previous node as current if any, fallback to last child (if not the deleted node)
    const prev = node.previousElementSibling ??
                (this.lastElementChild !== node ? this.lastElementChild : null);
    if (prev) {
      nodes.set(prev.id, {
        ...nodes.get(prev.id),
        current: true
      });
    }

    this.nodes = nodes;
  }
}

const Canvas = rewind(BaseCanvas, {
  observe: ["nodes"]
});

customElements.define("gx-canvas", Canvas);
