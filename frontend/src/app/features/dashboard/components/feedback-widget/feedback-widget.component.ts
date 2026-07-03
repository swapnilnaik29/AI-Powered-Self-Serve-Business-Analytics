import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-feedback-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-widget">
      @if (!submitted) {
        <span class="label">Was this helpful?</span>
        <div class="feedback-buttons">
          <button
            class="fb-btn"
            [class.selected]="rating === 'up'"
            (click)="rate('up')"
            title="Helpful"
          >
            👍
          </button>
          <button
            class="fb-btn"
            [class.selected-down]="rating === 'down'"
            (click)="rate('down')"
            title="Not helpful"
          >
            👎
          </button>
        </div>

        @if (rating === 'down') {
          <div class="correction-form">
            <textarea
              id="corrected-sql-{{queryId}}"
              name="corrected-sql-{{queryId}}"
              [(ngModel)]="correctedSql"
              placeholder="Correct SQL (optional)"
              rows="2"
            ></textarea>
            <textarea
              id="feedback-comment-{{queryId}}"
              name="feedback-comment-{{queryId}}"
              [(ngModel)]="comment"
              placeholder="What went wrong? (optional)"
              rows="2"
            ></textarea>
          </div>
        }

        @if (rating) {
          <button class="btn-submit" (click)="submit()" [disabled]="submitting">
            {{ submitting ? 'Submitting...' : 'Submit Feedback' }}
          </button>
        }
      } @else {
        <div class="thanks">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Feedback recorded
        </div>
      }
    </div>
  `,
  styles: [
    `
      .feedback-widget {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .label {
        font-size: 0.8rem;
        color: var(--text-tertiary);
        font-weight: 500;
      }
      .feedback-buttons { display: flex; gap: 4px; }
      .fb-btn {
        font-size: 1.1rem;
        padding: 4px 10px;
        background: var(--bg-secondary);
        border: 1.5px solid var(--border-light);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        line-height: 1;
      }
      .fb-btn:hover { border-color: var(--accent-primary); background: var(--accent-light); }
      .fb-btn.selected { border-color: #10b981; background: #ecfdf5; }
      .fb-btn.selected-down { border-color: #f59e0b; background: #fefce8; }
      .correction-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      textarea {
        padding: 8px 12px;
        border: 1px solid var(--border-light);
        border-radius: 8px;
        font-family: var(--font-sans);
        font-size: 0.85rem;
        resize: none;
        color: var(--text-primary);
        background: var(--bg-primary);
      }
      textarea:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
      }
      .btn-submit {
        padding: 6px 16px;
        background: var(--text-primary);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        transition: all 0.15s;
      }
      .btn-submit:hover:not(:disabled) {
        background: var(--accent-primary);
      }
      .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
      .thanks {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #10b981;
        font-weight: 600;
        font-size: 0.82rem;
      }
    `,
  ],
})
export class FeedbackWidgetComponent {
  @Input() queryId!: number;

  private api = inject(ApiService);

  rating: 'up' | 'down' | null = null;
  correctedSql = '';
  comment = '';
  submitted = false;
  submitting = false;

  rate(value: 'up' | 'down'): void {
    this.rating = value;
  }

  submit(): void {
    if (!this.rating) return;
    this.submitting = true;

    const body: any = { rating: this.rating };
    if (this.correctedSql.trim()) body.corrected_sql = this.correctedSql;
    if (this.comment.trim()) body.comment = this.comment;

    this.api.post(`/queries/${this.queryId}/feedback`, body).subscribe({
      next: () => {
        this.submitted = true;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
      },
    });
  }
}
