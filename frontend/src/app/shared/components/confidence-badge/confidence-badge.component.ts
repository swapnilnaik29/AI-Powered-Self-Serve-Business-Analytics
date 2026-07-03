import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confidence-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confidence-badge" [class]="level">
      <span class="score">{{ (score * 100).toFixed(0) }}%</span>
      <span class="label">{{ level }} confidence</span>
    </div>
    @if (reason) {
      <p class="reason">{{ reason }}</p>
    }
  `,
  styles: [
    `
      .confidence-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
      }
      .confidence-badge.high {
        background: #d4edda;
        color: #155724;
      }
      .confidence-badge.moderate {
        background: #fff3cd;
        color: #856404;
      }
      .confidence-badge.low {
        background: #f8d7da;
        color: #721c24;
      }
      .score {
        font-size: 1.1rem;
      }
      .label {
        font-size: 0.85rem;
        text-transform: capitalize;
      }
      .reason {
        font-size: 0.8rem;
        color: #666;
        margin-top: 4px;
      }
    `,
  ],
})
export class ConfidenceBadgeComponent {
  @Input() score = 0;
  @Input() reason = '';

  get level(): string {
    if (this.score >= 0.75) return 'high';
    if (this.score >= 0.55) return 'moderate';
    return 'low';
  }
}
