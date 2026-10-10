import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './components/app-header/app-header';

@Component({
  imports: [RouterOutlet, AppHeader],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}