import "./Shell/Shell.js";
import "./Board/Board.js";
import "./Tile/Tile.js";

// Wait for the DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  const boards = document.querySelectorAll("gx-board");
  const board1 = boards[0];
  board1.bubbleMode = "never";
  const board2 = boards[1];
  board2.bubbleMode = "on_end";
  const board3 = boards[2];
  board3.bubbleMode = "always";
  const bubbleInfo = [
    { board: 1, mode: board1.bubbleMode },
    { board: 2, mode: board2.bubbleMode },
    { board: 3, mode: board3.bubbleMode },
  ];

  console.table(bubbleInfo);

  const shells = document.querySelectorAll("gx-shell");
  document.querySelectorAll('input[name="bubble_mode"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      // Hide all board elements
      shells.forEach((shell) => {
        shell.hidden = true;
      });

      // Show the selected board element
      const index = parseInt(this.value) - 1;
      shells[index].hidden = false;
    });
  });
});
