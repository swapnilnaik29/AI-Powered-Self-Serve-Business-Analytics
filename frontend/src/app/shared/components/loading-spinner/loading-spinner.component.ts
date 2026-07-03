import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="loading-container animate-enter">
      <div class="ai-pulse">
        <div class="orb"></div>
        <div class="orb-ring"></div>
        <div class="orb-ring delay"></div>
      </div>
      @if (message) {
        <p class="loading-message">{{ message }}</p>
      }
      <div class="skeleton-lines">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 48px 24px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        margin-bottom: 24px;
      }
      
      /* Orb Animation */
      .ai-pulse {
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }
      .orb {
        width: 20px;
        height: 20px;
        background: var(--accent-primary);
        border-radius: 50%;
        box-shadow: 0 0 16px var(--accent-primary);
        z-index: 2;
        animation: pulseCore 2s ease-in-out infinite;
      }
      .orb-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid var(--accent-primary);
        opacity: 0;
        animation: ripple 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
      }
      .orb-ring.delay {
        animation-delay: 1s;
      }
      
      .loading-message {
        color: var(--text-secondary);
        font-size: 0.95rem;
        font-weight: 500;
        margin-bottom: 24px;
      }

      /* Skeleton Text Lines */
      .skeleton-lines {
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
      }
      .skeleton-line {
        height: 12px;
        border-radius: 6px;
        background: var(--bg-tertiary);
        animation: pulseSkeleton 2s ease-in-out infinite;
      }
      .skeleton-line.short { width: 40%; }
      .skeleton-line.long { width: 80%; }
      .skeleton-line.medium { width: 60%; }

      /* Keyframes */
      @keyframes pulseCore {
        0% { transform: scale(0.9); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(0.9); opacity: 0.8; }
      }
      @keyframes ripple {
        0% { transform: scale(0.5); opacity: 0.8; border-width: 2px; }
        100% { transform: scale(2); opacity: 0; border-width: 0; }
      }
    `
  ]
})
export class LoadingSpinnerComponent {
  @Input() message = '';
}
