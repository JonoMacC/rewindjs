class Shell extends HTMLElement {
  #label = "";
  constructor() {
    super();
    this.#label = "";
    this.tabIndex = -1;
  }

  get #heading() {
    return this.querySelector("header h2");
  }

  get label() {
    return this.#label;
  }

  set label(value) {
    this.#label = value;
    if (!this.#heading) {
      const h2 = document.createElement("h2");
      const header = document.createElement("header");
      header.append(h2);
      this.insertBefore(header, this.firstChild);
    }
    this.#heading.textContent = this.#label;
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
}

customElements.define("gx-shell", Shell);

export default Shell;
