import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HypothesisResult } from '../../../../core/models/query.model';

@Component({
  selector: 'app-hypothesis-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hypothesis-panel">
      <h4>Analytical Hypotheses</h4>
      <div class="hypothesis-list">
        @for (h of hypotheses; track $index) {
          <div class="hypothesis-item">
            <div class="hypothesis-header">
              <span class="status-badge" [class.supported]="h.supported" [class.unsupported]="!h.supported">
                @if (h.supported) {
                  <span class="icon">✔</span> Validated
                } @else {
                  <span class="icon">●</span> Weak relevance
                }
              </span>
            </div>
            <p class="hypothesis-text">{{ h.hypothesis }}</p>
            
            

            @if (h.sql) {
              <details class="sql-details">
                <summary>View SQL used</summary>
                <pre class="sql-block">{{ h.sql }}</pre>
              </details>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .hypothesis-panel {
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        padding: 20px;
        box-shadow: var(--shadow-sm);
      }
      h4 { color: var(--text-primary); margin: 0 0 12px; font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .hypothesis-list { display: flex; flex-direction: column; gap: 12px; }
      .hypothesis-item { 
        background: var(--bg-card, #fff); 
        border: 1px solid var(--border-light); 
        border-radius: var(--radius-md); 
        padding: 16px; 
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .hypothesis-header {
        display: flex;
        justify-content: flex-start;
        margin-bottom: 8px;
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .status-badge.supported {
        background: #e6f4ea;
        color: #137333;
        border: 1px solid #ceead6;
      }
      .status-badge.unsupported {
        background: #f1f3f4;
        color: #5f6368;
        border: 1px solid #dadce0;
      }
      .status-badge .icon {
        font-size: 0.8rem;
      }
      .hypothesis-text { font-weight: 500; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 8px; }
      .stats { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 0.8rem; margin: 8px 0 12px 0; }
      .stat { padding: 3px 8px; background: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border-light); color: var(--text-secondary); }
      .positive { color: #137333; background: #e6f4ea; border-color: #ceead6; }
      .negative { color: #c5221f; background: #fce8e6; border-color: #fad2cf; }
      .sql-details { margin-top: 8px; }
      .sql-details summary { cursor: pointer; font-size: 0.8rem; color: var(--text-tertiary); font-weight: 500; outline: none; user-select: none; }
      .sql-details summary:hover { color: var(--accent-primary); }
      .sql-block {
        margin-top: 8px;
        background: var(--bg-primary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        padding: 12px;
        font-size: 0.8rem;
        font-family: monospace;
        white-space: pre-wrap;
        word-break: break-all;
        color: var(--text-secondary);
        line-height: 1.5;
      }
    `,
  ],
})
export class HypothesisPanelComponent {
  @Input() hypotheses: HypothesisResult[] = [];
  @Input() bestHypothesis: HypothesisResult | null = null;
}
