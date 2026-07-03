import {
  Component, Input, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../../core/models/query.model';
import { ChartDisplayComponent } from '../../../../shared/components/chart-display/chart-display.component';
import { SqlViewerComponent } from '../../../../shared/components/sql-viewer/sql-viewer.component';
import { HypothesisPanelComponent } from '../hypothesis-panel/hypothesis-panel.component';
import { FeedbackWidgetComponent } from '../feedback-widget/feedback-widget.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [
    CommonModule,
    ChartDisplayComponent,
    SqlViewerComponent,
    HypothesisPanelComponent,
    FeedbackWidgetComponent,
    MarkdownPipe,
  ],
  template: `
    <div class="chat-thread" #threadContainer>
      @if (messages.length === 0) {
        <div class="empty-thread">
          <div class="welcome-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3>How can I help you today?</h3>
          <p>Ask a question about your banking data to get started.</p>
          <div class="example-queries">
            <span class="example-chip" (click)="followupSelected.emit('What is total transaction revenue this month?')">Total transaction revenue this month?</span>
            <span class="example-chip" (click)="followupSelected.emit('Show average credit score by risk category')">Avg credit score by risk category</span>
            <span class="example-chip" (click)="followupSelected.emit('Top 5 customers by transaction amount')">Top 5 customers by amount</span>
          </div>
        </div>
      }

      @for (msg of messages; track msg.id) {
        <!-- User Query Bubble -->
        <div class="message-row user-row animate-enter">
          <div class="bubble user-bubble">
            {{ msg.query }}
          </div>
        </div>

        <!-- AI Answer Bubble -->
        @if (msg.answer) {
          <div class="message-row ai-row animate-enter">
            <div class="bubble ai-bubble" [class.error-bubble]="msg.isError">
              <div class="ai-header">
                <div class="ai-avatar" [class.error-avatar]="msg.isError">
                  {{ msg.isError ? '!' : 'AI' }}
                </div>
                @if (msg.confidence && !msg.isError) {
                  <span class="confidence-badge"
                    [class.high]="msg.confidence > 0.8"
                    [class.med]="msg.confidence > 0.5 && msg.confidence <= 0.8"
                    [class.low]="msg.confidence <= 0.5">
                    {{ (msg.confidence * 100).toFixed(0) }}% Confidence
                  </span>
                }
                @if (msg.isError) {
                  <span class="error-label">Analysis Failed</span>
                }
              </div>

              <div class="answer-text markdown-content" [innerHTML]="msg.answer | markdown"></div>

              <!-- Regenerate button — only on error messages -->
              @if (msg.isError) {
                <div class="regenerate-section">
                  <button class="btn-regenerate" (click)="regenerateQuery.emit(msg.query)" [disabled]="loading">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Retry Analysis
                  </button>
                </div>
              }

              @if (!msg.isError) {
                @if (msg.chart) {
                  <div class="chart-wrapper">
                    <app-chart-display [spec]="msg.chart"></app-chart-display>
                  </div>
                }

                @if (msg.hypotheses && msg.hypotheses.length > 0) {
                  <div class="hypotheses-wrapper">
                    <app-hypothesis-panel
                      [hypotheses]="msg.hypotheses"
                      [bestHypothesis]="msg.best_hypothesis || null">
                    </app-hypothesis-panel>
                  </div>
                }

                @if (msg.sql) {
                  <details class="sql-details">
                    <summary>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                      </svg>
                      View Generated SQL
                    </summary>
                    <app-sql-viewer [sql]="msg.sql"></app-sql-viewer>
                  </details>
                }

                <!-- Follow-up suggestions -->
                @if (msg.follow_up_suggestions && msg.follow_up_suggestions.length > 0) {
                  <div class="followup-section">
                    <div class="followup-label">
                      Suggested follow-ups
                    </div>
                    <div class="followup-chips">
                      @for (s of msg.follow_up_suggestions; track $index) {
                        <button class="followup-chip" (click)="followupSelected.emit(s)" [disabled]="loading">
                          {{ s }}
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Feedback + Export row -->
                <div class="action-bar">
                  <app-feedback-widget [queryId]="msg.id"></app-feedback-widget>
                  <div class="export-actions">
                    <button class="btn-export" (click)="exportQuery.emit({id: msg.id, format: 'pdf'})">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      PDF
                    </button>
                    <button class="btn-export" (click)="exportQuery.emit({id: msg.id, format: 'excel'})">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                      Excel
                    </button>
                    <button class="btn-export" (click)="exportQuery.emit({id: msg.id, format: 'html'})">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                      HTML
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (loading) {
        <div class="message-row ai-row">
          <div class="bubble ai-bubble loading-bubble">
            <div class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            <span class="loading-text">Analyzing your data...</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chat-thread {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 32px 24px 16px;
        overflow-y: auto;
        height: 100%;
        scroll-behavior: smooth;
        background: #fdfdfd;
      }

      /* ── Empty State ─────────────────────────────────── */
      .empty-thread {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-secondary);
        text-align: center;
        gap: 12px;
      }
      .welcome-icon {
        background: linear-gradient(135deg, var(--accent-light) 0%, #d1e1fb 100%);
        color: var(--accent-primary);
        width: 72px;
        height: 72px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        box-shadow: 0 4px 20px rgba(24, 72, 138, 0.12);
      }
      .empty-thread h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .empty-thread p {
        margin: 0;
        font-size: 0.95rem;
        max-width: 380px;
        line-height: 1.6;
        color: var(--text-tertiary);
      }
      .example-queries {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        margin-top: 16px;
      }
      .example-chip {
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 0.85rem;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s;
      }
      .example-chip:hover {
        background: var(--accent-light);
        border-color: #a4c2f4;
        color: var(--accent-primary);
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(24, 72, 138, 0.1);
      }

      /* ── Message Layout ──────────────────────────────── */
      .message-row {
        display: flex;
        width: 100%;
      }
      .user-row { justify-content: flex-end; }
      .ai-row { justify-content: flex-start; }

      .bubble {
        max-width: 85%;
        border-radius: 16px;
        padding: 18px 22px;
        line-height: 1.65;
      }
      .user-bubble {
        background: linear-gradient(135deg, #18488a 0%, #12376b 100%);
        color: #ffffff;
        border-bottom-right-radius: 4px;
        font-size: 0.95rem;
        box-shadow: 0 2px 8px rgba(24, 72, 138, 0.15);
      }
      .ai-bubble {
        background: #ffffff;
        border: 1px solid var(--border-light);
        border-bottom-left-radius: 4px;
        box-shadow: var(--shadow-md);
        width: 100%;
        max-width: 90%;
      }
      .error-bubble {
        border-color: #fecaca;
        background: #fffbfb;
      }

      /* ── AI Header ───────────────────────────────────── */
      .ai-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
      }
      .ai-avatar {
        background: linear-gradient(135deg, #18488a 0%, #12376b 100%);
        color: white;
        font-weight: 700;
        font-size: 0.65rem;
        padding: 4px 10px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .error-avatar {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      .confidence-badge {
        font-size: 0.72rem;
        padding: 3px 10px;
        border-radius: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .confidence-badge.high { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
      .confidence-badge.med  { background: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
      .confidence-badge.low  { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
      .error-label { font-size: 0.8rem; color: #dc2626; font-weight: 600; }

      /* ── Answer Text ─────────────────────────────────── */
      .answer-text {
        font-size: 0.95rem;
        color: #334155;
        line-height: 1.75;
      }

      /* ── Regenerate ──────────────────────────────────── */
      .regenerate-section {
        margin-top: 16px;
      }
      .btn-regenerate {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 16px;
        background: #fff;
        border: 1.5px solid #fca5a5;
        color: #dc2626;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .btn-regenerate:hover:not(:disabled) {
        background: #fef2f2;
        border-color: #dc2626;
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(220,38,38,0.12);
      }
      .btn-regenerate:disabled { opacity: 0.4; cursor: not-allowed; }

      /* ── Chart / Hypotheses ──────────────────────────── */
      .chart-wrapper, .hypotheses-wrapper {
        margin-top: 20px;
      }
      .chart-wrapper {
        border-radius: var(--radius-lg, 12px);
        overflow: hidden;
      }

      /* ── SQL Details ─────────────────────────────────── */
      .sql-details {
        margin-top: 16px;
      }
      .sql-details summary {
        cursor: pointer;
        font-size: 0.82rem;
        color: var(--text-tertiary);
        font-weight: 600;
        outline: none;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: color 0.15s;
      }
      .sql-details summary:hover { color: var(--accent-primary); }

      /* ── Follow-up Chips ─────────────────────────────── */
      .followup-section {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--border-light);
      }
      .followup-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-bottom: 10px;
      }
      .followup-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .followup-chip {
        background: var(--bg-primary);
        border: 1px solid var(--border-light);
        border-radius: 20px;
        padding: 7px 14px;
        font-size: 0.82rem;
        cursor: pointer;
        color: var(--text-secondary);
        transition: all 0.2s;
        text-align: left;
        line-height: 1.4;
      }
      .followup-chip:hover:not(:disabled) {
        background: var(--accent-light);
        border-color: #a4c2f4;
        color: var(--accent-primary);
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(24, 72, 138, 0.1);
      }
      .followup-chip:disabled { opacity: 0.5; cursor: not-allowed; }

      /* ── Action Bar (Feedback + Export) ──────────────── */
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid var(--border-light);
        flex-wrap: wrap;
      }
      .export-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .btn-export {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        padding: 5px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        color: var(--text-tertiary);
        transition: all 0.15s;
      }
      .btn-export:hover {
        background: var(--bg-primary);
        border-color: #94a3b8;
        color: var(--text-primary);
      }

      /* ── Loading Bubble ──────────────────────────────── */
      .loading-bubble {
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 200px;
      }
      .loading-text {
        font-size: 0.85rem;
        color: var(--text-tertiary);
        font-style: italic;
      }
      .typing-indicator {
        display: flex;
        gap: 4px;
      }
      .typing-indicator span {
        width: 7px;
        height: 7px;
        background: var(--accent-primary);
        opacity: 0.5;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
      }
      .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
      .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `
  ]
})
export class ChatThreadComponent implements AfterViewChecked {
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
  @Output() exportQuery = new EventEmitter<{ id: number, format: string }>();
  @Output() regenerateQuery = new EventEmitter<string>();
  @Output() followupSelected = new EventEmitter<string>();

  @ViewChild('threadContainer') private threadContainer!: ElementRef;

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.threadContainer.nativeElement.scrollTop = this.threadContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }
}
