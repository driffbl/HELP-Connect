import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Signup } from './pages/signup/signup';
import { Verify } from './pages/verify/verify';
import { Login } from './pages/login/login';
import { LoginVerify } from './pages/login-verify/login-verify';
import { Dashboard } from './pages/dashboard/dashboard';
import { VolunteerRegister } from './pages/volunteer-register/volunteer-register';
import { VolunteerProfile } from './pages/volunteer-profile/volunteer-profile';
import { StudentProfile } from './pages/student-profile/student-profile'; 
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { RequestSupport } from './pages/request-support/request-support';
import { MatchingResults } from './pages/matching-results/matching-results';
import { StudentRequests } from './pages/student-request/student-request';
import { VolunteerInbox } from './pages/volunteer-inbox/volunteer-inbox';
import { sessionRoutes } from './sessions.routes';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'signup', component: Signup },
  { path: 'verify', component: Verify },
  { path: 'login', component: Login },
  { path: 'login-verify', component: LoginVerify },
  { path: 'dashboard', component: Dashboard },
  { path: 'student/profile', component: StudentProfile }, 
  { path: 'forgot-password', component: ForgotPassword },
{ path: 'reset-password', component: ResetPassword },
  { path: 'request-support', component: RequestSupport },
  { path: 'matching-results', component: MatchingResults },
  { path: 'student-requests', component: StudentRequests },
  { path: 'volunteer-inbox', component: VolunteerInbox },

  { path: 'volunteer/register', component: VolunteerRegister },
  { path: 'volunteer/profile', component: VolunteerProfile },
  ...sessionRoutes,
  { path: '**', redirectTo: '' },
];