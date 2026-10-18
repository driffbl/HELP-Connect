import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Review, Session, UserRole } from '../../models/session.model';
import { Clock } from '../../services/clock';
import { ActionResult, SessionStore } from '../../services/session-store';
import { SessionActions } from './session-actions';

const NOW = new Date('2026-10-20T12:00:00');

function make(overrides: Partial<Session> = {}): Session {
  return {
    id: 5,
    studentId: 1,
    studentName: 'Sam',
    volunteerId: 2,
    volunteerName: 'Vera',
    title: 'Python Tutoring',
    description: 'Help with loops',
    category: 'Academic Support',
    date: '2026-10-22',
    time: '10:00',
    mode: 'Virtual',
    status: 'Scheduled',
    proposedBy: null,
    createdAt: '2026-10-18T01:00:00.000Z',
    requestId: null,
    requestStatus: null,
    review: null,
    ...overrides,
  };
}

const REVIEW: Review = {
  id: 1,
  sessionId: 5,
  studentId: 1,
  volunteerId: 2,
  rating: 4,
  comment: 'Very helpful',
  createdAt: '2026-10-21T01:00:00.000Z',
};

function setup(session: Session, role: UserRole) {
  const store = {
    cancel: vi.fn<(id: number) => Promise<ActionResult>>(),
    complete: vi.fn<(id: number) => Promise<ActionResult>>(),
    confirm: vi.fn<(id: number) => Promise<ActionResult>>(),
    decline: vi.fn<(id: number) => Promise<ActionResult>>(),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SessionStore, useValue: store },
      { provide: Clock, useValue: { now: () => NOW } },
    ],
  });
  const fixture = TestBed.createComponent(SessionActions);
  fixture.componentRef.setInput('session', session);
  fixture.componentRef.setInput('role', role);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const find = (testId: string) => el.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  return { fixture, store, el, find };
}

describe('SessionActions for a Scheduled session', () => {
  it('shows the volunteer Mark as Complete, greyed out until the session starts', () => {
    const { find } = setup(make(), 'volunteer');
    expect((find('complete') as HTMLButtonElement).disabled).toBe(true);
    expect(find('complete-hint')).not.toBeNull();
    expect(find('cancel')).not.toBeNull();
    expect(find('reschedule')).not.toBeNull();
  });

  it('enables Mark as Complete once the session has started', () => {
    const { find } = setup(make({ date: '2026-10-20', time: '09:00' }), 'volunteer');
    expect((find('complete') as HTMLButtonElement).disabled).toBe(false);
    expect(find('complete-hint')).toBeNull();
  });

  it('shows the student a greyed-out Rate volunteer button and no Mark as Complete', () => {
    const { find } = setup(make({ date: '2026-10-20', time: '09:00' }), 'student');
    expect((find('rate-volunteer-disabled') as HTMLButtonElement).disabled).toBe(true);
    expect(find('complete')).toBeNull();
    expect(find('rate-volunteer')).toBeNull();
  });

  it('Reschedule only shows the coming soon message', () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    try {
      const { find, store } = setup(make(), 'student');
      find('reschedule')!.click();
      expect(alertSpy).toHaveBeenCalledWith('This feature will be available in the next update.');
      expect(store.cancel).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cancels only after the person confirms, then reports the updated session', async () => {
    const cancelled = make({ status: 'Cancelled' });
    const { fixture, store, find } = setup(make(), 'student');
    store.cancel.mockResolvedValue({ ok: true, session: cancelled });
    const updated = vi.fn();
    fixture.componentInstance.updated.subscribe(updated);

    find('cancel')!.click();
    fixture.detectChanges();
    expect(store.cancel).not.toHaveBeenCalled();
    expect(find('modal-confirm')).not.toBeNull();

    find('modal-confirm')!.click();
    await fixture.whenStable();
    expect(store.cancel).toHaveBeenCalledWith(5);
    expect(updated).toHaveBeenCalledWith(cancelled);
  });

  it('shows the server message when an action fails', async () => {
    const { fixture, store, find } = setup(make({ date: '2026-10-20', time: '09:00' }), 'volunteer');
    store.complete.mockResolvedValue({ ok: false, status: 409, error: 'Already completed.' });
    find('complete')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(find('action-error')?.textContent).toContain('Already completed.');
  });
});

describe('SessionActions for other statuses', () => {
  it('shows the feedback on a Completed session that has a review', () => {
    const { find } = setup(make({ status: 'Completed', review: REVIEW }), 'student');
    expect(find('feedback')?.textContent).toContain('Very helpful');
    expect(find('rate-volunteer')).toBeNull();
  });

  it('offers the student Rate volunteer on a Completed session without a review', () => {
    const { find } = setup(make({ status: 'Completed' }), 'student');
    expect(find('rate-volunteer')).not.toBeNull();
  });

  it('tells the volunteer a Completed session is awaiting feedback', () => {
    const { find } = setup(make({ status: 'Completed' }), 'volunteer');
    expect(find('awaiting-feedback')).not.toBeNull();
    expect(find('rate-volunteer')).toBeNull();
  });

  it('shows a note on a Cancelled session and no buttons', () => {
    const { find } = setup(make({ status: 'Cancelled' }), 'student');
    expect(find('cancelled-note')).not.toBeNull();
    expect(find('cancel')).toBeNull();
    expect(find('reschedule')).toBeNull();
  });

  const DECLINED = { status: 'Cancelled', requestId: 12, requestStatus: 'Rejected' } as const;

  it('lets the student choose another volunteer after a decline, with the same request details', () => {
    const { find } = setup(make(DECLINED), 'student');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(find('declined-note')).not.toBeNull();
    find('choose-another')!.click();
    expect(navigate).toHaveBeenCalledWith(['/matching-results'], {
      queryParams: {
        category: 'Academic Support',
        mode: 'Virtual',
        date: '2026-10-22',
        time: '10:00',
        requestId: 12,
      },
    });
  });

  it('does not offer another volunteer to the volunteer, after a student cancel, or once the time has passed', () => {
    expect(setup(make(DECLINED), 'volunteer').find('choose-another')).toBeNull();
    expect(
      setup(make({ ...DECLINED, requestStatus: 'Cancelled' }), 'student').find('choose-another'),
    ).toBeNull();
    expect(
      setup(make({ ...DECLINED, date: '2026-10-19' }), 'student').find('choose-another'),
    ).toBeNull();
    expect(setup(make({ status: 'Cancelled' }), 'student').find('choose-another')).toBeNull();
  });

  it('treats a Pending request nobody answered before it started as Cancelled', () => {
    const { find } = setup(
      make({ status: 'Pending', proposedBy: 'student', date: '2026-10-20', time: '09:00' }),
      'volunteer',
    );
    expect(find('cancelled-note')).not.toBeNull();
    expect(find('accept')).toBeNull();
  });

  it('lets the other person accept or decline a Pending request', () => {
    const { find } = setup(make({ status: 'Pending', proposedBy: 'student' }), 'volunteer');
    expect(find('accept')).not.toBeNull();
    expect(find('decline')).not.toBeNull();
    expect(find('cancel')).toBeNull();
  });
});
