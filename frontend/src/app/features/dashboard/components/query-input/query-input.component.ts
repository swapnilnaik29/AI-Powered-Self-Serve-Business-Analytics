import { Component, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-query-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="query-input-container">
      <div class="input-wrapper" [class.focused]="isFocused" [class.loading]="loading">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        
        <textarea
          id="query-text-input"
          name="query-text-input"
          [(ngModel)]="query"
          placeholder="Ask a business question... (e.g., 'What is total revenue this month?')"
          rows="1"
          (focus)="isFocused = true"
          (blur)="isFocused = false"
          (keydown.enter)="onSubmit($event)"
          [disabled]="loading"
          #queryInput
        ></textarea>

        <div class="action-section">
          @if (loading) {
            <div class="pulse-ring"></div>
          } @else {
            <button 
              class="btn-run" 
              (click)="onSubmit($event)" 
              [disabled]="!query.trim()"
              title="Run Analysis (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          }
        </div>
      </div>
      <div class="hint">Press <strong>Enter</strong> to run analysis</div>
    </div>
  `,
  styles: [
    `
      .query-input-container {
        margin-bottom: 32px;
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 800px;
        margin-inline: auto;
      }
      .input-wrapper {
        display: flex;
        align-items: center;
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-xl);
        padding: 8px 16px;
        box-shadow: var(--shadow-sm);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .input-wrapper.focused {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
        transform: translateY(-1px);
      }
      .input-wrapper.loading {
        background: var(--bg-tertiary);
        border-color: var(--border-light);
        box-shadow: none;
      }
      .search-icon {
        width: 20px;
        height: 20px;
        color: var(--text-tertiary);
        margin-right: 12px;
        flex-shrink: 0;
      }
      .input-wrapper.focused .search-icon {
        color: var(--accent-primary);
      }
      textarea {
        flex: 1;
        background: transparent;
        border: none;
        padding: 12px 0;
        font-size: 1.125rem;
        color: var(--text-primary);
        font-family: var(--font-sans);
        resize: none;
        outline: none;
        min-height: 48px;
        line-height: 24px;
      }
      textarea::placeholder {
        color: var(--text-tertiary);
      }
      textarea:disabled {
        color: var(--text-secondary);
      }
      .action-section {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-left: 12px;
        flex-shrink: 0;
      }
      .btn-run {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        background: var(--accent-primary);
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-run svg {
        width: 16px;
        height: 16px;
      }
      .btn-run:hover:not(:disabled) {
        background: var(--accent-hover);
        transform: scale(1.05);
      }
      .btn-run:disabled {
        background: var(--border-light);
        color: var(--text-tertiary);
        cursor: not-allowed;
      }
      .pulse-ring {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid var(--accent-primary);
        border-top-color: transparent;
        animation: spin 0.8s linear infinite;
      }
      .hint {
        margin-top: 8px;
        font-size: 0.8rem;
        color: var(--text-tertiary);
        text-align: center;
        opacity: 0;
        transition: opacity 0.3s;
      }
      .query-input-container:focus-within .hint {
        opacity: 1;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `
  ]
})
export class QueryInputComponent {
  @Input() loading = false;
  @Output() submitQuery = new EventEmitter<string>();

  @ViewChild('queryInput') private queryInputRef!: ElementRef<HTMLTextAreaElement>;

  query = '';
  isFocused = false;

  onSubmit(event: Event): void {
    event.preventDefault();
    const trimmed = this.query.trim();
    if (trimmed && !this.loading) {
      this.submitQuery.emit(trimmed);
      // Clear and refocus for next follow-up
      this.query = '';
      setTimeout(() => this.queryInputRef?.nativeElement?.focus(), 50);
    }
  }
}
