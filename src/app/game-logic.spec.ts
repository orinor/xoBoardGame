import { Cell, evaluate } from './game-logic';

describe('evaluate', () => {
  it('detects a row win', () => {
    const b: Cell[] = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
    expect(evaluate(b).winner).toBe('X');
  });

  it('detects a draw', () => {
    const b: Cell[] = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    const o = evaluate(b);
    expect(o.winner).toBeNull();
    expect(o.draw).toBe(true);
  });

  it('is ongoing on an empty board', () => {
    const o = evaluate(Array(9).fill(null));
    expect(o.winner).toBeNull();
    expect(o.draw).toBe(false);
  });
});
