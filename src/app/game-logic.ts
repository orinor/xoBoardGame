export type Player = 'X' | 'O';
export type Cell = Player | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export interface Outcome {
  winner: Player | null;
  line: number[] | null;
  draw: boolean;
}

export function evaluate(board: Cell[]): Outcome {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line, draw: false };
    }
  }
  return { winner: null, line: null, draw: board.every((c) => c !== null) };
}
