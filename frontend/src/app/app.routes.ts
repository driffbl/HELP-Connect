import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Signup } from './pages/signup/signup';
import { Verify } from './pages/verify/verify';
import { Login } from './pages/login/login';
import { LoginVerify } from './pages/login-verify/login-verify';
import { Dashboard } from './pages/dashboard/dashboard';
import { VolunteerRegister } from './pages/volunteer-register/volunteer-register';
import { VolunteerProfile } from './pages/volunteer-profile/volunteer-profile';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'signup', component: Signup },
  { path: 'verify', component: Verify },
  { path: 'login', component: Login },
  { path: 'login-verify', component: LoginVerify },
  { path: 'dashboard', component: Dashboard },
  { path: 'volunteer/register', component: VolunteerRegister },
  { path: 'volunteer/profile', component: VolunteerProfile },
  { path: '**', redirectTo: '' },
];