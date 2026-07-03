import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-split">
        <!-- Left: Branding Panel -->
        <div class="brand-panel">
          <div class="brand-inner">
            <h1 class="brand-headline">Enterprise Analytics, <br/>Simplified.</h1>
            <p class="brand-sub">Ask questions in plain English. Get instant data insights powered by AI.</p>
            <div class="brand-features">
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>Natural language to SQL, instantly</span>
              </div>
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>Role-based data governance</span>
              </div>
              <div class="feature-item">
                <span class="feature-dot"></span>
                <span>Exportable charts &amp; reports</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Forgot Password Form -->
        <div class="form-panel">
          <div class="form-inner">
            <div class="form-header">
              <h2>Reset Password</h2>
              <p class="subtitle">Enter your email and new password</p>
            </div>

            @if (error) {
              <div class="error-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {{ error }}
              </div>
            }

            @if (successMessage) {
              <div class="success-banner">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                {{ successMessage }}
              </div>
              
              <button class="btn-primary" routerLink="/auth/login" style="margin-top: 16px;">
                Return to Login
              </button>
            } @else {
              <form (ngSubmit)="onSubmit()" class="login-form">
                <div class="form-group">
                  <label for="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    placeholder="name@company.com"
                    required
                    autocomplete="email"
                  />
                </div>

                <div class="form-group">
                  <label for="new_password">New Password</label>
                  <input
                    id="new_password"
                    type="password"
                    [(ngModel)]="newPassword"
                    name="newPassword"
                    placeholder="Enter new password"
                    required
                    minlength="8"
                  />
                </div>
                
                <div class="form-group">
                  <label for="confirm_password">Confirm Password</label>
                  <input
                    id="confirm_password"
                    type="password"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    placeholder="Confirm new password"
                    required
                    minlength="8"
                  />
                </div>

                <button type="submit" class="btn-primary" [disabled]="loading || !email || !newPassword || !confirmPassword">
                  @if (loading) {
                    <span class="spinner"></span>
                    Resetting...
                  } @else {
                    Reset Password
                  }
                </button>
              </form>
            }

            <p class="auth-footer">
              Remember your password? <a routerLink="/auth/login">Sign in</a>
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

      /* ── Left Branding Panel ─────────────────────── */
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
        font-weight: 400;
      }
      .feature-dot {
        width: 6px;
        height: 6px;
        background: #f49f1f;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* ── Right Form Panel ───────────────────────── */
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
        margin-bottom: 28px;
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
        margin-bottom: 20px;
        font-size: 0.875rem;
        border: 1px solid #fecaca;
      }
      .success-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f0fdf4;
        color: #16a34a;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 0.875rem;
        border: 1px solid #bbf7d0;
      }
      .login-form {
        display: flex;
        flex-direction: column;
        gap: 18px;
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
        margin-top: 24px;
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
export class ForgotPasswordComponent {
  private auth = inject(AuthService);

  email = '';
  newPassword = '';
  confirmPassword = '';
  
  error = '';
  successMessage = '';
  loading = false;

  onSubmit(): void {
    this.error = '';
    
    // Validations
    if (!this.email || !this.newPassword || !this.confirmPassword) {
      this.error = 'All fields are required.';
      return;
    }
    
    if (this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters long.';
      return;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;

    this.auth.resetPassword({ email: this.email, new_password: this.newPassword }).subscribe({
      next: (res: any) => {
        this.successMessage = res.message || 'Password successfully reset';
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.error?.detail || err.message || 'Password reset failed';
        this.loading = false;
      },
    });
  }
}
