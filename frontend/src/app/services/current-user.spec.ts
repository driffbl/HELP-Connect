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

function signIn(token: string, user?: unknown) {
  localStorage.setItem('token', token);
  if (user !== undefined) localStorage.setItem('user', JSON.stringify(user));
}

describe('CurrentUser', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('is signed out when nothing is stored', () => {
    const me = TestBed.inject(CurrentUser);
    expect(me.signedIn()).toBe(false);
    expect(me.token()).toBe(null);
    expect(me.user().id).toBe(0);
    expect(me.user().role).toBe('student');
  });

  it('reads the login Coel\'s pages leave in localStorage', () => {
    signIn(STUDENT, { User_id: 11, User_name: 'Ali Student', Email: 'student@helplive.edu.my' });
    const me = TestBed.inject(CurrentUser);
    expect(me.signedIn()).toBe(true);
    expect(me.user()).toEqual({ id: 11, name: 'Ali Student', role: 'student' });
    expect(me.token()).toBe(STUDENT);
  });

  it('falls back to the email when the stored user has no name', () => {
    signIn(STUDENT, 'not an object');
    expect(TestBed.inject(CurrentUser).user().name).toBe('student@helplive.edu.my');
  });

  it('is the same person in both modes; only the role changes', () => {
    signIn(STUDENT);
    const me = TestBed.inject(CurrentUser);
    me.setRole('volunteer');
    expect(me.user().role).toBe('volunteer');
    expect(me.user().id).toBe(11);
    expect(me.token()).toBe(STUDENT);
    me.setRole('student');
    expect(me.user().role).toBe('student');
  });

  it('ignores a token that is corrupt or expired', () => {
    signIn('junk');
    expect(TestBed.inject(CurrentUser).signedIn()).toBe(false);
    TestBed.resetTestingModule();
    signIn(fakeToken({ User_id: 11, exp: aMinuteAgo() }));
    expect(TestBed.inject(CurrentUser).signedIn()).toBe(false);
  });

  it('refresh picks up a login or logout that happened after it was created', () => {
    const me = TestBed.inject(CurrentUser);
    expect(me.signedIn()).toBe(false);
    signIn(STUDENT);
    me.refresh();
    expect(me.signedIn()).toBe(true);
    expect(me.user().id).toBe(11);
    localStorage.removeItem('token');
    me.refresh();
    expect(me.signedIn()).toBe(false);
  });

  it('switching to another account replaces the person', () => {
    signIn(STUDENT);
    const me = TestBed.inject(CurrentUser);
    signIn(VOLUNTEER);
    me.refresh();
    expect(me.user().id).toBe(22);
    expect(me.token()).toBe(VOLUNTEER);
  });
});
