import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="navbar-brand">
        <a routerLink="/dashboard" class="logo">
          <img src="/logo.png" alt="Analytics" class="logo-img" />
        </a>
      </div>

      @if (auth.isAuthenticated()) {
        <div class="navbar-links">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          @if (auth.isAdmin()) {
            <a routerLink="/history" routerLinkActive="active">History</a>
          }
          <a routerLink="/glossary" routerLinkActive="active">Glossary</a>
          <a routerLink="/catalog" routerLinkActive="active">Catalog</a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active">Admin</a>
          }
        </div>
        <div class="navbar-user">
          <span class="user-badge">{{ auth.user()?.full_name }}</span>
          <span class="role-pill">{{ auth.user()?.role }}</span>
          <button class="btn-logout" (click)="auth.logout()">Logout</button>
        </div>
      }
    </nav>
  `,
  styles: [
    `
      .navbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 32px;
        height: 64px;
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
        border-bottom: 1px solid #e8ecf0;
        border-top: 3px solid #f49f1f;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .navbar-brand {
        display: flex;
        align-items: center;
      }
      .logo {
        display: flex;
        align-items: center;
        text-decoration: none;
        line-height: 0;
      }
      .logo-img {
        height: 34px;
        width: auto;
        display: block;
        object-fit: contain;
      }
      .navbar-links {
        display: flex;
        gap: 2px;
        align-items: center;
      }
      .navbar-links a {
        color: #64748b;
        text-decoration: none;
        padding: 7px 14px;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.15s ease;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
      .navbar-links a:hover {
        background: #f1f5f9;
        color: #18488a;
      }
      .navbar-links a.active {
        background: rgba(24, 72, 138, 0.09);
        color: #18488a;
        font-weight: 600;
      }
      .navbar-user {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .user-badge {
        font-size: 0.82rem;
        color: #374151;
        font-weight: 500;
      }
      .role-pill {
        font-size: 0.72rem;
        color: #18488a;
        font-weight: 700;
        padding: 3px 10px;
        background: rgba(24, 72, 138, 0.09);
        border-radius: 20px;
        letter-spacing: 0.03em;
        text-transform: capitalize;
      }
      .btn-logout {
        background: transparent;
        border: 1.5px solid #cbd5e1;
        color: #475569;
        padding: 6px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 500;
        transition: all 0.2s;
        margin-left: 4px;
      }
      .btn-logout:hover {
        border-color: #18488a;
        color: #18488a;
        background: rgba(24, 72, 138, 0.05);
      }
    `,
  ],
})
export class NavbarComponent {
  auth = inject(AuthService);
}
