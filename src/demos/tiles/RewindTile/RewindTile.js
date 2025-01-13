import rewind from "../../../Rewind/rewind.js";
import Tile from "../../common/Tile/Tile.js";

// Create the rewindable tile class (Tile + Undo/Redo)
// It is necessary to explicitly type annotate at the point of export so that type inference works
// This is because the type is dynamically generated, making it difficult for the IDE to trace
/** @type {RewindableElementConstructor<Tile>} */
const RewindTile = rewind(Tile, {
  observe: ["top", "left", "label"],
});

// Define the rewindable tile as a custom element
customElements.define("gx-rw-tile", RewindTile);

export default RewindTile;
