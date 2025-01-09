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
      insertKey: this.insertNode.bind(this),
      deleteKey: this.delete.bind(this),
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
    let hasCurrentNode = false;
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

      node.style.top = props.top + 'px';
      node.style.left = props.left + 'px';

      if (props.current) {
        node.focus();
        hasCurrentNode = true;
      }
    }

    // If no node is current in state, focus the board
    if (!hasCurrentNode) {
      this.focus();
    }

    this.#nodes = newNodes;
  }

  get currentNode() {
    return this.querySelector('gx-text-node:focus-within');
  }

  // Lifecycle

  connectedCallback() {
    this.addEventListener("keydown", this.#handleKeydown);
    this.addEventListener("change", this.#debouncedChange);

    this.#nodes = new Map(
      Array.from(this.querySelectorAll('gx-text-node'), (node) => [
        node.id,
        {
          top: parseFloat(node.style.top),
          left: parseFloat(node.style.left),
          content: node.content,
          current: node.matches(':focus'),
          position: Array.from(this.children).indexOf(node)
        }
      ])
    );
  }

  disconnectedCallback() {
    this.removeEventListener("keydown", this.#handleKeydown);
    this.removeEventListener("change", this.#debouncedChange);
  }

  // Private methods

  #handleKeydown = (event) => {
    const key = cel.keyCombo(event);
    if (!this.#keys.has(key)) return;

    for (const [action, keys] of Object.entries(this.#keyMap)) {
      if (keys.includes(key)) {
        this.keyHandlers[action]();
        return;
      }
    }
  }

  #handleChange = (event) => {
    const node = event.target.closest('gx-text-node');

    this.#updateNode(node.id, {
      top,
      left,
      content: node.content,
      current: node.matches(':focus')
    });
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
    
    if (props.top !== undefined) node.style.top = props.top + 'px';
    if (props.left !== undefined) node.style.left = props.left + 'px';
    
    nodes.set(id, { ...props, position: Array.from(this.children).indexOf(node) });
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
    nodes.set(id, {
      top: this.offsetHeight / 2 - nodeHeight / 2,
      left: this.offsetWidth / 2 - nodeWidth / 2,
      content: "",
      current: true,
      position: this.children.length
    });
    this.nodes = nodes;
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

    // Set nodes to ensure the current state is recorded
    this.nodes = new Map(nodes);

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
