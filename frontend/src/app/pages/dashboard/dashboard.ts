import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, Header],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  user = JSON.parse(localStorage.getItem('user') || '{}');
  userName = this.user.User_name || 'Student';
  userEmail = this.user.Email || '';
}