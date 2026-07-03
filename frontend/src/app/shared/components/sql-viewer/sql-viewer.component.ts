import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sql-viewer',
  standalone: true,
  template: `
    <div class="sql-viewer">
      <div class="sql-header">
        <span>Generated SQL</span>
        <button class="copy-btn" [class.copied]="copied" (click)="copyToClipboard()">
          {{ copied ? '✓ Copied' : 'Copy' }}
        </button>
      </div>
      <pre class="sql-code"><code>{{ sql }}</code></pre>
    </div>
  `,
  styles: [
    `
      .sql-viewer {
        border: 1px solid var(--border-light, #e2e8f0);
        border-radius: var(--radius-md, 8px);
        overflow: hidden;
        margin-top: 8px;
      }
      .sql-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 14px;
        background: #1e293b;
        color: #94a3b8;
        font-size: 0.8rem;
        font-weight: 500;
      }
      .copy-btn {
        background: transparent;
        border: 1px solid #475569;
        color: #94a3b8;
        padding: 3px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .copy-btn:hover {
        background: #334155;
        color: #e2e8f0;
        border-color: #64748b;
      }
      .copy-btn.copied {
        color: #34d399;
        border-color: #34d399;
      }
      .sql-code {
        margin: 0;
        padding: 14px 16px;
        background: #0f172a;
        color: #a7f3d0;
        font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        font-size: 0.82rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.6;
      }
    `,
  ],
})
export class SqlViewerComponent {
  @Input() sql = '';
  copied = false;

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.sql);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }
}
