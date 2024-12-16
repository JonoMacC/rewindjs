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
 * @typedef {Object} RewindElementOptions
 * @property {UndoModel} [model='linear'] - Undo model
 * @property {string[]} [observe=[]] - Properties to observe with auto-recording
 * @property {string[]} [coalesce=[]] - Methods to coalesce with auto-recording
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
 * @property {Object} [host] - Target to intercept for auto-recording
 * @property {Function} [restoreCallback=null] - Function to call when restoring a rewindable child
 */

/**
 * @typedef {Object} RewindConfig
 * @property {Object[]} [history=[]] - Initial history
 * @property {Map<string, Rewindable>} [children=new Map()] - Initial rewindable children
 * @property {number} [index=undefined] - Initial index
 */

/**
 * @typedef {Object} RewindChildState
 * @property {string} type - Type of rewindable child
 * @property {Object[]} history - History of states
 * @property {number} index - Current index in history
 * @property {number} position - Position in parent
 */

/**
 * @typedef {Map<string, RewindChildState>} RewindChildrenState
 */

/**
 * @typedef {Map<string, Rewindable|RewindableElement>} RewindCollection
 */
