/**
 * An abstract class representing an element in the DOM.
 * @abstract
 */
export class AbstractElement {
  get children() {
    throw new Error("Method not implemented");
  }

  append(child) {
    throw new Error("Method not implemented");
  }

  contains(element) {
    throw new Error("Method not implemented");
  }

  focus() {
    throw new Error("Method not implemented");
  }

  remove(child) {
    throw new Error("Method not implemented");
  }

  insert(newChild, referenceChild) {
    throw new Error("Method not implemented");
  }

  find(selector) {
    throw new Error("Method not implemented");
  }

  previous(child) {
    throw new Error("Method not implemented");
  }

  closest(element, selectors) {
    throw new Error("Method not implemented");
  }

  matches(element, selector) {
    throw new Error("Method not implemented");
  }
}
