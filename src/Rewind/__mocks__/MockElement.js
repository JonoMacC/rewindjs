import { AbstractElement } from "../AbstractElement.js";

/**
 * A mock element for testing purposes.
 * @extends AbstractElement
 */
export class MockElement extends AbstractElement {
  #children;
  #parent;

  constructor(props = {}) {
    super();
    this.#children = [];
    this.#parent = null;
    for (const [key, value] of Object.entries(props)) {
      this[key] = value;
    }
  }

  append(child) {
    this.#children.push(child);
    child.#parent = this;
  }

  remove(child) {
    const index = this.#children.indexOf(child);
    if (index !== -1) {
      this.#children.splice(index, 1);
      child.#parent = null;
    }
  }

  insert(newChild, referenceChild) {
    const index = this.#children.indexOf(referenceChild);
    if (index !== -1) {
      this.#children.splice(index, 0, newChild);
    } else {
      this.#children.push(newChild);
    }
    newChild.#parent = this;
  }

  find(selector) {
    // Implement a simple selector matching logic
    if (selector.startsWith("#")) {
      return this.#children.find((child) => child.id === selector.slice(1));
    } else if (selector.startsWith(".")) {
      return this.#children.find((child) =>
        child.className?.includes(selector.slice(1))
      );
    }
    return null;
  }

  matches(element, selector) {
    // Implement a simple selector matching logic
    if (selector.startsWith("#")) {
      return element.id === selector.slice(1);
    } else if (selector.startsWith(".")) {
      return element.className?.includes(selector.slice(1));
    } else {
      // For element type selectors (e.g., "div")
      return element.tagName?.toLowerCase() === selector.toLowerCase();
    }
  }

  closest(selectorString) {
    console.log("Received selectorString:", selectorString);

    if (typeof selectorString !== "string" || selectorString.trim() === "") {
      console.warn("Invalid selector string:", selectorString);
      return null;
    }

    const selectors = selectorString.split(",").map((s) => s.trim());

    let currentElement = this;
    while (currentElement) {
      for (const selector of selectors) {
        if (this.matches(currentElement, selector)) {
          return currentElement;
        }
      }
      currentElement = currentElement.parent;
    }
    return null;
  }

  get children() {
    return this.#children;
  }

  get parent() {
    return this.#parent;
  }
}
