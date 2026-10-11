import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Cell, Player, evaluate } from './game-logic';

export interface GameResult {
  id: number;
  playedAt: string;
  result: 'X' | 'O' | 'draw';
  moves: { player: Player; cell: number }[];
}

@Component({
  selector: 'app-root',
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly board = signal<Cell[]>(Array(9).fill(null));
  protected readonly current = signal<Player>('X');
  protected readonly moves = signal<GameResult['moves']>([]);
  protected readonly history = signal<GameResult[]>([]);
  protected readonly saveError = signal(false);

  protected readonly outcome = computed(() => evaluate(this.board()));
  protected readonly over = computed(() => !!this.outcome().winner || this.outcome().draw);
  protected readonly status = computed(() => {
    const o = this.outcome();
    if (o.winner) return `המנצח: ${o.winner} 🎉`;
    if (o.draw) return 'תיקו!';
    return `תור של: ${this.current()}`;
  });
  protected readonly score = computed(() => {
    const h = this.history();
    return {
      X: h.filter((g) => g.result === 'X').length,
      O: h.filter((g) => g.result === 'O').length,
      draw: h.filter((g) => g.result === 'draw').length,
    };
  });
  protected readonly recent = computed(() => this.history().slice().reverse());

  constructor() {
    this.http.get<GameResult[]>('/api/results').subscribe({
      next: (r) => this.history.set(r),
      error: () => this.saveError.set(true),
    });
  }

  protected play(i: number): void {
    if (this.over() || this.board()[i]) return;
    const player = this.current();
    this.board.update((b) => b.map((c, idx) => (idx === i ? player : c)));
    this.moves.update((m) => [...m, { player, cell: i }]);

    const o = this.outcome();
    if (o.winner || o.draw) {
      this.save(o.winner ?? 'draw');
    } else {
      this.current.set(player === 'X' ? 'O' : 'X');
    }
  }

  protected reset(): void {
    this.board.set(Array(9).fill(null));
    this.current.set('X');
    this.moves.set([]);
  }

  protected clearHistory(): void {
    this.http.delete('/api/results').subscribe(() => this.history.set([]));
  }

  protected isWinCell(i: number): boolean {
    return !!this.outcome().line?.includes(i);
  }

  private save(result: GameResult['result']): void {
    const game = {
      playedAt: new Date().toISOString(),
      result,
      moves: this.moves(),
    };
    this.http.post<GameResult>('/api/results', game).subscribe({
      next: (saved) => {
        this.saveError.set(false);
        this.history.update((h) => [...h, saved]);
      },
      error: () => this.saveError.set(true),
    });
  }
}
