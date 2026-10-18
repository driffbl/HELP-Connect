import { TestBed } from '@angular/core/testing';
import { CurrentUser, readToken } from './current-user';

function fakeToken(claims: Record<string, unknown>): string {
  const part = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(claims)}.signature`;
}
const inAnHour = () => Math.floor(Date.now() / 1000) + 3600;
const aMinuteAgo = () => Math.floor(Date.now() / 1000) - 60;

const STUDENT = fakeToken({ User_id: 11, Email: 'student@helplive.edu.my', exp: inAnHour() });
const VOLUNTEER = fakeToken({ User_id: 22, Email: 'volunteer@helplive.edu.my', exp: inAnHour() });

describe('readToken', () => {
  it('reads the user id and email from a token', () => {
    expect(readToken(STUDENT)).toEqual({ id: 11, name: 'student@helplive.edu.my', token: STUDENT });
  });
  it('refuses tokens that are malformed, incomplete or expired', () => {
    expect(readToken('')).toBe(null);
    expect(readToken('nonsense')).toBe(null);
    expect(readToken('a.b.c')).toBe(null);
    expect(readToken(fakeToken({ Email: 'x@y.z' }))).toBe(null);
    expect(readToken(fakeToken({ User_id: '11' }))).toBe(null);
    expect(readToken(fakeToken({ User_id: 11, exp: aMinuteAgo() }))).toBe(null);
  });
});

describe('CurrentUser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is signed out when nothing is stored', () => {
    const me = TestBed.inject(CurrentUser);
    expect(me.signedIn()).toBe(false);
    expect(me.token()).toBe(null);
    expect(me.user().id).toBe(0);
    expect(me.user().role).toBe('student');
  });

  it('signs in with the two dev tokens and starts as the student', () => {
    const me = TestBed.inject(CurrentUser);
    expect(me.useDevTokens({ student: STUDENT, volunteer: VOLUNTEER })).toBe(true);
    expect(me.signedIn()).toBe(true);
    expect(me.user().id).toBe(11);
    expect(me.token()).toBe(STUDENT);
  });

  it('switching mode switches the person and the token', () => {
    const me = TestBed.inject(CurrentUser);
    me.useDevTokens({ student: STUDENT, volunteer: VOLUNTEER });
    me.setRole('volunteer');
    expect(me.user().role).toBe('volunteer');
    expect(me.user().id).toBe(22);
    expect(me.token()).toBe(VOLUNTEER);
    me.setRole('student');
    expect(me.user().id).toBe(11);
  });

  it('refuses bad tokens and stays signed out', () => {
    const me = TestBed.inject(CurrentUser);
    expect(me.useDevTokens({ student: 'junk', volunteer: VOLUNTEER })).toBe(false);
    expect(
      me.useDevTokens({
        student: STUDENT,
        volunteer: fakeToken({ User_id: 22, exp: aMinuteAgo() }),
      }),
    ).toBe(false);
    expect(me.signedIn()).toBe(false);
  });

  it('remembers the tokens after a reload', () => {
    TestBed.inject(CurrentUser).useDevTokens({ student: STUDENT, volunteer: VOLUNTEER });
    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(CurrentUser);
    expect(reloaded.signedIn()).toBe(true);
    expect(reloaded.user().id).toBe(11);
  });

  it('ignores stored tokens that are corrupt or expired', () => {
    localStorage.setItem('hc.devTokens', 'not json at all');
    expect(TestBed.inject(CurrentUser).signedIn()).toBe(false);

    TestBed.resetTestingModule();
    localStorage.setItem(
      'hc.devTokens',
      JSON.stringify({ student: fakeToken({ User_id: 11, exp: aMinuteAgo() }), volunteer: 5 }),
    );
    expect(TestBed.inject(CurrentUser).signedIn()).toBe(false);
  });

  it('uses the one stored person for both modes when only one token exists', () => {
    localStorage.setItem('hc.devTokens', JSON.stringify({ student: STUDENT }));
    const me = TestBed.inject(CurrentUser);
    me.setRole('volunteer');
    expect(me.signedIn()).toBe(true);
    expect(me.user().id).toBe(11);
    expect(me.user().role).toBe('volunteer');
  });
});
