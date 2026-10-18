import {
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../utils/api-error';
import { CurrentUser } from './current-user';
import { SessionApi } from './session-api';

function fakeToken(userId: number): string {
  const part = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${part({ alg: 'HS256' })}.${part({ User_id: userId, Email: `u${userId}@x.y`, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
}
const STUDENT = fakeToken(11);
const VOLUNTEER = fakeToken(22);
const BASE = 'http://localhost:5000/api';

/** Stands in for the network: records every request and answers with whatever the test says. */
class FakeHandler extends HttpHandler {
  requests: HttpRequest<unknown>[] = [];
  reply: (req: HttpRequest<unknown>) => HttpResponse<unknown> | HttpErrorResponse = () =>
    new HttpResponse({ status: 200, body: {} });

  override handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    this.requests.push(req);
    const answer = this.reply(req);
    return answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer);
  }
}

const session = { id: 5, title: 'Python Tutoring', status: 'Scheduled' };

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('expected the call to fail');
}

function setup(signedIn = true) {
  localStorage.clear();
  const handler = new FakeHandler();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: HttpClient, useValue: new HttpClient(handler) }],
  });
  const me = TestBed.inject(CurrentUser);
  if (signedIn) me.useDevTokens({ student: STUDENT, volunteer: VOLUNTEER });
  return { handler, me, api: TestBed.inject(SessionApi) };
}

describe('SessionApi requests', () => {
  it('lists sessions for a mode, sending the login token', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpResponse({ status: 200, body: { sessions: [session] } });
    expect(await api.list('student')).toEqual([session]);
    const req = handler.requests[0];
    expect(req.method).toBe('GET');
    expect(req.urlWithParams).toBe(`${BASE}/sessions?role=student`);
    expect(req.headers.get('Authorization')).toBe(`Bearer ${STUDENT}`);
  });

  it('sends the volunteer token once the mode is volunteer', async () => {
    const { handler, me, api } = setup();
    handler.reply = () => new HttpResponse({ status: 200, body: { sessions: [] } });
    me.setRole('volunteer');
    await api.list('volunteer');
    expect(handler.requests[0].urlWithParams).toBe(`${BASE}/sessions?role=volunteer`);
    expect(handler.requests[0].headers.get('Authorization')).toBe(`Bearer ${VOLUNTEER}`);
  });

  it('gets one session', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpResponse({ status: 200, body: { session } });
    expect(await api.get(5)).toEqual(session);
    expect(handler.requests[0].method).toBe('GET');
    expect(handler.requests[0].url).toBe(`${BASE}/sessions/5`);
  });

  it('confirm, decline, cancel and complete are PATCH requests to the right address', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpResponse({ status: 200, body: { session } });
    await api.confirm(5);
    await api.decline(6);
    await api.cancel(7);
    await api.complete(8);
    expect(handler.requests.map((r) => `${r.method} ${r.url.replace(BASE, '')}`)).toEqual([
      'PATCH /sessions/5/confirm',
      'PATCH /sessions/6/decline',
      'PATCH /sessions/7/cancel',
      'PATCH /sessions/8/complete',
    ]);
  });

  it('posts feedback with the rating and comment, and null when there is no comment', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpResponse({ status: 201, body: { session } });
    expect(await api.addFeedback(5, 4, 'Very helpful')).toEqual(session);
    await api.addFeedback(5, 3, null);
    expect(handler.requests[0].method).toBe('POST');
    expect(handler.requests[0].url).toBe(`${BASE}/sessions/5/feedback`);
    expect(handler.requests[0].body).toEqual({ rating: 4, comment: 'Very helpful' });
    expect(handler.requests[1].body).toEqual({ rating: 3, comment: null });
  });

  it('sends no Authorization header when nobody is signed in', async () => {
    const { handler, api } = setup(false);
    handler.reply = () => new HttpResponse({ status: 200, body: { sessions: [] } });
    await api.list('student');
    expect(handler.requests[0].headers.has('Authorization')).toBe(false);
  });
});

describe('SessionApi errors', () => {
  it('passes on the message the server sent', async () => {
    const { handler, api } = setup();
    handler.reply = () =>
      new HttpErrorResponse({
        status: 403,
        error: { message: 'Only the volunteer can mark a session as completed.' },
      });
    const err = await failure(api.complete(5));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe('Only the volunteer can mark a session as completed.');
  });

  it('says so when the server cannot be reached', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpErrorResponse({ status: 0, error: {} });
    const err = await failure(api.list('student'));
    expect(err.status).toBe(0);
    expect(err.message).toBe('Cannot reach the server. Is the backend running?');
  });

  it('hides internal details of a server error', async () => {
    const { handler, api } = setup();
    handler.reply = () =>
      new HttpErrorResponse({ status: 500, error: { message: 'ECONNREFUSED 127.0.0.1:3306' } });
    const err = await failure(api.get(5));
    expect(err.status).toBe(500);
    expect(err.message).toBe('Something went wrong on the server. Please try again.');
  });

  it('keeps the status for not found and unauthorised', async () => {
    const { handler, api } = setup();
    handler.reply = () =>
      new HttpErrorResponse({ status: 404, error: { message: 'Session not found.' } });
    expect((await failure(api.get(99))).status).toBe(404);
    handler.reply = () =>
      new HttpErrorResponse({
        status: 401,
        error: { message: 'No token provided. Please log in.' },
      });
    const err = await failure(api.get(1));
    expect(err.status).toBe(401);
    expect(err.message).toBe('No token provided. Please log in.');
  });

  it('copes with an error that has no message', async () => {
    const { handler, api } = setup();
    handler.reply = () => new HttpErrorResponse({ status: 409, error: null });
    expect((await failure(api.confirm(5))).message).toBe('The request failed (409).');
  });
});
