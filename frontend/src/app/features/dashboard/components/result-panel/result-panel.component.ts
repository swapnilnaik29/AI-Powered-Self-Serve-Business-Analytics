import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-result-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  template: `
    <div class="result-panel card">
      <div class="insight-header">
        <div class="icon-badge">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <h3>Business Insight</h3>
      </div>
      <div class="answer-text markdown-content" [innerHTML]="answer | markdown"></div>

      @if (explanation) {
        <details class="explanation-details">
          <summary>How was this calculated?</summary>
          <div class="explanation-content">
            <p>{{ explanation }}</p>
          </div>
        </details>
      }

      @if (data && data.length > 0) {
        <div class="data-table-wrapper">
          <div class="table-title-bar">
            <h4 class="table-title">Raw Data Snapshot</h4>
            <span class="row-count">{{ filteredData.length }} rows found</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  @for (col of dataColumns; track col) {
                    <th [class.is-numeric]="isNumericColumn(col)">
                      <div class="th-content">{{ col }}</div>
                      <input type="text" 
                             id="filter-input-{{col}}"
                             name="filter-input-{{col}}"
                             class="filter-input" 
                             placeholder="Filter..." 
                             [(ngModel)]="filters[col]" 
                             (ngModelChange)="applyFilters()">
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of filteredData | slice : 0 : 50; track $index) {
                  <tr>
                    @for (col of dataColumns; track col) {
                      <td [class.is-numeric]="isNumericColumn(col)">{{ formatValue(row[col], col) }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (filteredData.length > 50) {
            <p class="truncation-note">Showing 50 of {{ filteredData.length }} rows. Filter to see more specific results.</p>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .result-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .card {
        background: var(--bg-card, #ffffff);
        border: 1px solid var(--border-light, #e5e7eb);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .insight-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .explanation-details {
        margin-top: 8px;
        font-size: 0.875rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 8px 16px;
      }
      .explanation-details summary {
        cursor: pointer;
        color: var(--text-tertiary);
        font-weight: 500;
        outline: none;
      }
      .explanation-details summary:hover {
        color: var(--text-primary);
      }
      .explanation-content {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-light);
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .icon-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--accent-light);
        color: var(--accent-primary);
        border-radius: var(--radius-md);
      }
      .icon-badge svg {
        width: 18px;
        height: 18px;
      }
      h3 {
        margin: 0;
        font-size: 1.25rem;
      }
      .answer-text {
        font-size: 1.125rem;
        color: var(--text-secondary);
        line-height: 1.7;
      }
      .markdown-content p {
        margin: 0 0 12px 0;
      }
      .markdown-content p:last-child {
        margin-bottom: 0;
      }
      .markdown-content strong {
        color: var(--text-primary);
        font-weight: 600;
      }
      
      .data-table-wrapper {
        margin-top: 16px;
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .table-title-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-light);
        padding: 12px 16px;
      }
      .table-title {
        margin: 0;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-tertiary);
      }
      .row-count {
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }
      .table-scroll {
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
      }
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 0.875rem;
      }
      th {
        background: var(--bg-primary);
        color: var(--text-secondary);
        font-weight: 600;
        padding: 10px 16px;
        text-align: left;
        white-space: nowrap;
        border-bottom: 1px solid var(--border-light);
        position: sticky;
        top: 0;
        z-index: 10;
        box-shadow: 0 1px 0 var(--border-light);
      }
      .th-content {
        margin-bottom: 8px;
      }
      .filter-input {
        width: 100%;
        min-width: 80px;
        padding: 4px 8px;
        font-size: 0.75rem;
        border: 1px solid var(--border-light);
        border-radius: 4px;
        background: var(--bg-card);
        color: var(--text-primary);
        box-sizing: border-box;
      }
      .filter-input:focus {
        outline: none;
        border-color: var(--accent-primary);
      }
      td {
        padding: 12px 16px;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-light);
        white-space: nowrap;
      }
      .is-numeric {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      tr:last-child td {
        border-bottom: none;
      }
      tr:hover td {
        background: var(--bg-primary);
      }
      .truncation-note {
        font-size: 0.8rem;
        color: var(--text-tertiary);
        padding: 8px 16px;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-light);
        margin: 0;
      }
    `,
  ],
})
export class ResultPanelComponent implements OnChanges {
  @Input() answer = '';
  @Input() explanation?: string;
  @Input() data: any[] = [];
  
  filteredData: any[] = [];
  filters: { [key: string]: string } = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.filters = {};
      this.applyFilters();
    }
  }

  get dataColumns(): string[] {
    if (!this.data || this.data.length === 0) return [];
    return Object.keys(this.data[0]);
  }

  applyFilters() {
    if (!this.data) {
      this.filteredData = [];
      return;
    }
    
    this.filteredData = this.data.filter(row => {
      for (const col of this.dataColumns) {
        const filterVal = this.filters[col]?.toLowerCase();
        if (filterVal) {
          const cellVal = String(row[col] ?? '').toLowerCase();
          if (!cellVal.includes(filterVal)) {
            return false;
          }
        }
      }
      return true;
    });
  }

  isNumericColumn(col: string): boolean {
    if (!this.data || this.data.length === 0) return false;
    // Check first non-null value
    for (const row of this.data) {
      if (row[col] !== null && row[col] !== undefined) {
        return typeof row[col] === 'number';
      }
    }
    return false;
  }

  formatValue(val: any, col: string): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      const isIdOrYear = col.toLowerCase().includes('id') || col.toLowerCase() === 'year';
      if (!isIdOrYear && (val > 1000 || val % 1 !== 0)) {
         return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
      }
      return val.toString();
    }
    return String(val);
  }
}
