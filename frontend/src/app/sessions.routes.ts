import { Routes } from '@angular/router';
import { MySessions } from './pages/my-sessions/my-sessions';
import { SessionDetail } from './pages/session-detail/session-detail';
import { SessionReview } from './pages/session-review/session-review';
import { VolunteerReviews } from './pages/volunteer-reviews/volunteer-reviews';

/** Use Case 3 routes. Spread these into app.routes.ts. */
export const sessionRoutes: Routes = [
  { path: 'sessions', component: MySessions },
  { path: 'sessions/:id', component: SessionDetail },
  { path: 'sessions/:id/review', component: SessionReview },
  { path: 'reviews', component: VolunteerReviews },
];
