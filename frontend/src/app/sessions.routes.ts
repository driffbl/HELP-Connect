import { Routes } from '@angular/router';
import { DevLogin } from './pages/dev-login/dev-login';
import { MySessions } from './pages/my-sessions/my-sessions';
import { PastSessions } from './pages/past-sessions/past-sessions';
import { SessionDetail } from './pages/session-detail/session-detail';
import { SessionReview } from './pages/session-review/session-review';

/** Use Case 3 routes. Spread these into app.routes.ts. */
export const sessionRoutes: Routes = [
  { path: 'sessions', component: MySessions },
  { path: 'sessions/:id', component: SessionDetail },
  { path: 'sessions/:id/review', component: SessionReview },
  { path: 'past-sessions', component: PastSessions },
  { path: 'past-sessions/:id', component: SessionDetail, data: { backLink: '/past-sessions' } },
  // Development only: delete with the dev-token script when the real login is merged.
  { path: 'dev-login', component: DevLogin },
];
