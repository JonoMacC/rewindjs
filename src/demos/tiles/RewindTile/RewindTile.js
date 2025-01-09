import rewind from "../../../Rewind/rewind.js";
import Tile from "../../common/Tile/Tile.js";

// Create the rewindable tile class (RewindTile + Undo/Redo)
const RewindTile = rewind(Tile, {
  observe: ["top", "left", "label"],
});

// Define the rewindable tile as a custom element
customElements.define("gx-rw-tile", RewindTile);

export default RewindTile;
