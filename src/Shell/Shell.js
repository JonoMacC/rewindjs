class Shell extends HTMLElement {
  #label = "";
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.#label = "";
    this.shadow.innerHTML = `
    <header>
    <h2>${this.label}</h2>
    </header>
    <slot></slot>
    `;
    this.tabIndex = -1;
  }

  get label() {
    return this.#label;
  }

  set label(value) {
    this.#label = value;
    this.shadow.querySelector("header h2").textContent = this.#label;
  }

  static get observedAttributes() {
    return ["label", "hidden"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "label") {
      this.label = newValue;
    } else if (name === "hidden") {
      if (this.hasAttribute("hidden")) {
        this.style.display = "none";
      } else {
        this.style.display = "flex";
      }
    }
  }

  connectedCallback() {
    // Create link for style
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", "./Shell/Shell.css");

    // Append style
    this.shadowRoot.append(link);
  }
}

customElements.define("gx-shell", Shell);
