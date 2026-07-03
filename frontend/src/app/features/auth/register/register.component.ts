import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-split">

        <!-- Left: Branding Panel -->
        <div class="brand-panel">
          <div class="brand-inner">
            
            <h1 class="brand-headline">Your AI Data <br/>Analyst is Ready.</h1>
            <p class="brand-sub">Join your team's analytics workspace and start exploring data through natural conversation.</p>
            <div class="brand-features">
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>Instant answers from your data</span>
              </div>
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>No SQL knowledge required</span>
              </div>
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>Collaborate with your team</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Register Form -->
        <div class="form-panel">
          <div class="form-inner">
            <div class="form-header">
              <h2>Create account</h2>
              <p class="subtitle">Join the analytics platform today</p>
            </div>

            @if (error) {
              <div class="error-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {{ error }}
              </div>
            }
            @if (success) {
              <div class="success-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Account created! <a routerLink="/auth/login">Sign in now →</a>
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="register-form">
              <div class="form-group">
                <label for="name">Full name</label>
                <input id="name" type="text" [(ngModel)]="fullName" name="fullName" placeholder="Your full name" required autocomplete="name" />
              </div>
              <div class="form-group">
                <label for="email">Email address</label>
                <input id="email" type="email" [(ngModel)]="email" name="email" placeholder="name@company.com" required autocomplete="email" />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input id="password" type="password" [(ngModel)]="password" name="password" placeholder="Min. 8 characters" required autocomplete="new-password" />
              </div>

              <button type="submit" class="btn-primary" [disabled]="loading">
                @if (loading) {
                  <span class="spinner"></span>
                  Creating account...
                } @else {
                  Create Account
                }
              </button>
            </form>

            <p class="auth-footer">
              Already have an account? <a routerLink="/auth/login">Sign in</a>
            </p>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        min-height: calc(100vh - 67px);
        display: flex;
        align-items: stretch;
        background: #f8fafc;
      }
      .auth-split {
        display: flex;
        width: 100%;
        max-width: 1100px;
        margin: auto;
        min-height: 560px;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        align-self: center;
      }
      .brand-panel {
        flex: 1;
        background: linear-gradient(145deg, #18488a 0%, #0f2d5c 55%, #1a3d70 100%);
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 40px;
      }
      .brand-panel::before {
        content: '';
        position: absolute;
        right: -80px;
        top: -80px;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(244,159,31,0.3) 0%, transparent 70%);
        border-radius: 50%;
      }
      .brand-panel::after {
        content: '';
        position: absolute;
        left: -60px;
        bottom: -60px;
        width: 260px;
        height: 260px;
        background: radial-gradient(circle, rgba(244,159,31,0.15) 0%, transparent 70%);
        border-radius: 50%;
      }
      .brand-inner {
        position: relative;
        z-index: 1;
        color: white;
        max-width: 380px;
      }
      .brand-logo {
        height: 42px;
        width: auto;
        display: block;
        filter: brightness(0) invert(1);
        margin-bottom: 36px;
        opacity: 0.95;
      }
      .brand-headline {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.25;
        color: #ffffff;
        margin: 0 0 16px;
        letter-spacing: -0.02em;
      }
      .brand-sub {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.6;
        margin: 0 0 32px;
      }
      .brand-features {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .feature-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.85);
      }
      .feature-dot {
        width: 6px;
        height: 6px;
        background: #f49f1f;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .form-panel {
        width: 420px;
        flex-shrink: 0;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 40px;
      }
      .form-inner {
        width: 100%;
      }
      .form-header {
        margin-bottom: 24px;
      }
      h2 {
        margin: 0 0 6px;
        color: #0f172a;
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .subtitle {
        color: #64748b;
        font-size: 0.9rem;
        margin: 0;
      }
      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fef2f2;
        color: #dc2626;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 18px;
        font-size: 0.875rem;
        border: 1px solid #fecaca;
      }
      .success-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f0fdf4;
        color: #15803d;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 18px;
        font-size: 0.875rem;
        border: 1px solid #bbf7d0;
      }
      .success-banner a {
        color: #15803d;
        font-weight: 600;
        text-decoration: none;
      }
      .register-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-weight: 600;
        font-size: 0.8rem;
        color: #374151;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      input {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.95rem;
        box-sizing: border-box;
        transition: all 0.2s;
        background: #fafbfc;
        color: #0f172a;
        font-family: inherit;
      }
      input::placeholder {
        color: #94a3b8;
      }
      input:focus {
        outline: none;
        border-color: #18488a;
        background: white;
        box-shadow: 0 0 0 3px rgba(24, 72, 138, 0.1);
      }
      .btn-primary {
        width: 100%;
        padding: 12px;
        background: #18488a;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        letter-spacing: 0.01em;
        font-family: inherit;
      }
      .btn-primary:hover:not(:disabled) {
        background: #12376b;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(24, 72, 138, 0.25);
      }
      .btn-primary:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .auth-footer {
        text-align: center;
        margin-top: 22px;
        color: #94a3b8;
        font-size: 0.875rem;
      }
      .auth-footer a {
        color: #18488a;
        text-decoration: none;
        font-weight: 600;
      }
      .auth-footer a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  fullName = '';
  email = '';
  password = '';
  error = '';
  success = false;
  loading = false;

  onSubmit(): void {
    this.error = '';
    this.success = false;
    this.loading = true;

    this.auth
      .register({ email: this.email, password: this.password, full_name: this.fullName })
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.message || 'Registration failed';
          this.loading = false;
        },
      });
  }
}
