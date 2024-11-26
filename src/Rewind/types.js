/**
 * @typedef {("linear" | "history")} UndoModel
 * @default "linear"
 */

/**
 * @typedef {Object} UndoKeys
 * @property {string[]} undo - The undo keys.
 * @default ["Ctrl+Z", "Meta+Z"]
 * @property {string[]} redo - The redo keys.
 * @default ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"]
 */

/**
 * @typedef {Object} Accessor
 * @property {Function} get - A function to get the state of the target.
 * @property {Function} set - A function to set the state of the target.
 */

/**
 * @typedef {Object} RewindElementOptions
 * @property {UndoModel} [model='linear'] - Undo model
 * @property {string[]} [observe=[]] - Properties to observe with auto-recording
 * @property {string[]} [coalesce=[]] - Methods to coalesce with auto-recording
 * @property {Accessor} [accessor] - Custom state accessor for manual recording
 * @property {Object[]} [history=[]] - Initial history
 * @property {number} [index=undefined] - Initial index
 * @property {Object<string, number>} [debounce={}] - Debounce times for properties
 * @property {UndoKeys} [keys] - Keyboard shortcuts configuration
 */

/**
 * @typedef {Object} RewindOptions
 * @property {UndoModel} [model='linear'] - Undo model
 * @property {string[]} [observe=[]] - Properties to observe with auto-recording
 * @property {string[]} [coalesce=[]] - Methods to coalesce with auto-recording
 * @property {Map} [propertyHandlers=Map()] - Functions to execute on a property change
 * @property {Accessor} [accessor] - Custom state accessor for manual recording
 * @property {Function} [recordBaseline] - Custom function for recording initial state
 * @property {Object} [host] - Target to intercept for auto-recording
 */

/**
 * @typedef {Object} RewindConfig
 * @property {Object[]} [history=[]] - Initial history
 * @property {number} [index=undefined] - Initial index
 */
