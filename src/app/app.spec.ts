import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('player names', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  async function setup() {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.autoDetectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/results').flush([]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    return { fixture, http, root };
  }

  it('requires both names on initial load and every new game', async () => {
    const { fixture, root } = await setup();
    expect(root.querySelectorAll('.cell:disabled').length).toBe(9);
    for (const [selector, value] of [['#player-x', '   '], ['#player-o', 'דנה']]) {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    const x = root.querySelector<HTMLInputElement>('#player-x')!;
    x.value = '  אורי  ';
    x.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelectorAll('.cell:disabled').length).toBe(0);
    expect(root.textContent).toContain('תור של: אורי (X)');
    root.querySelector<HTMLButtonElement>('.actions button')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('.cell:disabled').length).toBe(9);
    expect(root.querySelector<HTMLInputElement>('#player-x')!.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#player-o')!.value).toBe('');
  });

  it('sends the names with the result and displays them in history', async () => {
    const { fixture, http, root } = await setup();
    for (const [selector, value] of [['#player-x', 'אורי'], ['#player-o', 'דנה']]) {
      const input = root.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
    for (const index of [0, 4, 1, 7, 2]) {
      root.querySelectorAll<HTMLButtonElement>('.cell')[index].click();
      await fixture.whenStable();
    }
    const request = http.expectOne('/api/results');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ playerX: 'אורי', playerO: 'דנה', result: 'X' });
    request.flush({ id: 1, ...request.request.body });
    await fixture.whenStable();
    expect(root.querySelector('.history')!.textContent).toContain('אורי (X) מול דנה (O)');
    expect(root.querySelector('.status')!.textContent).toContain('המנצח: אורי (X)');
  });
});
