import { AbstractElement } from "./AbstractElement.js";

export class DOMElement extends AbstractElement {
  constructor(element) {
    super();
    this.element = element;
  }

  append(child) {
    this.element.appendChild(child);
  }

  remove(child) {
    this.element.removeChild(child);
  }

  insert(newChild, referenceChild) {
    this.element.insertBefore(newChild, referenceChild);
  }

  find(selector) {
    return this.element.querySelector(selector);
  }

  get children() {
    return Array.from(this.element.children);
  }

  previous(child) {
    return child.previousElementSibling;
  }

  closest(element, selectors) {
    return element.closest(selectors.join(","));
  }

  matches(element, selector) {
    return element.matches(selector);
  }
}
