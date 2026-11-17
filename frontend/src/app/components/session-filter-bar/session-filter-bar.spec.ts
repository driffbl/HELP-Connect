import { TestBed } from '@angular/core/testing';
import { UserRole } from '../../models/session.model';
import { DEFAULT_FILTERS, PastFilters, SortKey } from '../../utils/session-filter';
import { SessionFilterBar } from './session-filter-bar';

function setup(role: UserRole, filters: PastFilters = DEFAULT_FILTERS, sort: SortKey = 'newest') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(SessionFilterBar);
  fixture.componentRef.setInput('filters', filters);
  fixture.componentRef.setInput('sort', sort);
  fixture.componentRef.setInput('role', role);
  fixture.componentRef.setInput('categories', ['Academic Support', 'Technology Support']);
  fixture.detectChanges();
  const emitted: PastFilters[] = [];
  const sorted: SortKey[] = [];
  fixture.componentInstance.filtersChange.subscribe((f) => emitted.push(f));
  fixture.componentInstance.sortChange.subscribe((s) => sorted.push(s));
  const el = fixture.nativeElement as HTMLElement;
  const find = <T extends HTMLElement>(id: string) => el.querySelector<T>(`[data-testid="${id}"]`);
  const choose = (id: string, value: string) => {
    const control = find<HTMLSelectElement | HTMLInputElement>(id)!;
    control.value = value;
    const typing = control instanceof HTMLInputElement && control.type === 'search';
    control.dispatchEvent(new Event(typing ? 'input' : 'change'));
  };
  return { fixture, emitted, sorted, find, choose };
}

describe('SessionFilterBar', () => {
  it('lists the categories it was given after "All"', () => {
    const { find } = setup('student');
    const options = Array.from(find<HTMLSelectElement>('filter-category')!.options).map((o) => o.value);
    expect(options).toEqual(['', 'Academic Support', 'Technology Support']);
  });

  it('reports a change as a full new set of filters and leaves the others as they were', () => {
    const start: PastFilters = { ...DEFAULT_FILTERS, mode: 'Virtual' };
    const { emitted, choose } = setup('student', start);
    choose('filter-status', 'Cancelled');
    expect(emitted).toEqual([{ ...start, status: 'Cancelled' }]);
  });

  it('reports typing in the search box, the category, the mode and the dates', () => {
    const { emitted, choose } = setup('student');
    choose('filter-search', 'java');
    choose('filter-category', 'Technology Support');
    choose('filter-mode', 'Face-to-Face');
    choose('filter-from', '2026-10-01');
    expect(emitted.map((f) => [f.search, f.category, f.mode, f.from])).toEqual([
      ['java', '', 'all', ''],
      ['', 'Technology Support', 'all', ''],
      ['', '', 'Face-to-Face', ''],
      ['', '', 'all', '2026-10-01'],
    ]);
  });

  it('reports a new sort without touching the filters', () => {
    const { emitted, sorted, choose } = setup('student');
    choose('sort', 'rating-high');
    expect(sorted).toEqual(['rating-high']);
    expect(emitted).toEqual([]);
  });

  it('shows Feedback to a student and Minimum rating to a volunteer, not both', () => {
    const student = setup('student');
    expect(student.find('filter-feedback')).not.toBeNull();
    expect(student.find('filter-rating')).toBeNull();
    const volunteer = setup('volunteer');
    expect(volunteer.find('filter-rating')).not.toBeNull();
    expect(volunteer.find('filter-feedback')).toBeNull();
  });

  it('turns the minimum rating into a number', () => {
    const { emitted, choose } = setup('volunteer');
    choose('filter-rating', '4');
    expect(emitted[0].minRating).toBe(4);
  });

  it('keeps Clear filters disabled until something is filtered, then resets every filter', () => {
    expect((setup('student').find('clear-filters') as HTMLButtonElement).disabled).toBe(true);

    const { find, emitted } = setup('student', { ...DEFAULT_FILTERS, search: 'x', status: 'Completed' });
    const clear = find<HTMLButtonElement>('clear-filters')!;
    expect(clear.disabled).toBe(false);
    clear.click();
    expect(emitted).toEqual([DEFAULT_FILTERS]);
  });
});
