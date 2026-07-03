import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { CatalogEntry } from '../../core/models/feedback.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="catalog-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Data Catalog</h2>
          <p class="page-subtitle">Browse available tables, columns, types, and data governance tags.</p>
        </div>
        @if (auth.isAdmin()) {
          <button class="btn-primary" (click)="syncCatalog()" [disabled]="syncing">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {{ syncing ? 'Syncing...' : 'Sync from Database' }}
          </button>
        }
      </div>

      @if (syncMessage) {
        <div class="info-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {{ syncMessage }}
        </div>
      }

      @if (loading) {
        <div class="loading-state">
          @for (i of [1,2,3]; track i) {
            <div class="skeleton-card">
              <div class="skeleton-line md" style="width: 140px; margin-bottom: 12px;"></div>
              <div class="skeleton-line lg"></div>
              <div class="skeleton-line lg"></div>
              <div class="skeleton-line lg" style="width: 80%;"></div>
            </div>
          }
        </div>
      } @else if (entries.length === 0) {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <h3>No catalog entries found</h3>
          <p>Run a database sync to populate the data catalog.</p>
        </div>
      } @else {
        @for (table of tableNames; track table) {
          <div class="table-section">
            <div class="table-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
              {{ table }}
              <span class="col-count">{{ getColumnsForTable(table).length }} columns</span>
            </div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>PII</th>
                    <th>Samples</th>
                  </tr>
                </thead>
                <tbody>
                  @for (col of getColumnsForTable(table); track col.id) {
                    <tr>
                      <td class="col-name">{{ col.column_name }}</td>
                      <td><code>{{ col.data_type }}</code></td>
                      <td class="desc-cell">{{ col.description }}</td>
                      <td>
                        <span [class]="col.is_pii ? 'badge-pii' : 'badge-safe'">
                          {{ col.is_pii ? 'PII' : 'Safe' }}
                        </span>
                      </td>
                      <td class="samples">{{ col.sample_values?.join(', ') || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .catalog-page { max-width: 1100px; margin: 0 auto; }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;
        gap: 16px;
      }
      .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.02em;
        margin: 0;
      }
      .page-subtitle {
        font-size: 0.875rem;
        color: var(--text-tertiary);
        margin: 4px 0 0;
      }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 18px;
        background: var(--accent-primary);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .btn-primary:hover:not(:disabled) {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(24, 72, 138, 0.25);
      }
      .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      .info-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--success-light, #ecfdf5);
        color: #065f46;
        padding: 10px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 0.875rem;
        font-weight: 500;
        border: 1px solid #a7f3d0;
      }

      /* Loading & Empty */
      .loading-state {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .skeleton-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 6px;
      }
      .skeleton-line.md { height: 18px; }
      .skeleton-line.lg { height: 36px; }
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
        padding: 60px 20px;
        color: var(--text-tertiary);
      }
      .empty-state h3 { font-size: 1.1rem; color: var(--text-secondary); margin: 0; }
      .empty-state p { font-size: 0.9rem; margin: 0; }

      /* Table sections */
      .table-section { margin-bottom: 24px; }
      .table-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--accent-primary);
        font-weight: 700;
        font-size: 0.95rem;
        margin-bottom: 8px;
        text-transform: capitalize;
      }
      .col-count {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-tertiary);
        margin-left: auto;
      }
      .table-container {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-light);
        box-shadow: var(--shadow-sm);
        overflow-x: auto;
      }
      table { width: 100%; border-collapse: collapse; }
      th {
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        padding: 10px 14px;
        text-align: left;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-bottom: 1px solid var(--border-light);
      }
      th:first-child { border-top-left-radius: var(--radius-lg); }
      th:last-child { border-top-right-radius: var(--radius-lg); }
      td {
        padding: 10px 14px;
        border-bottom: 1px solid var(--border-light);
        font-size: 0.85rem;
        color: var(--text-primary);
      }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: var(--bg-primary); }
      .col-name {
        font-weight: 600;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 0.82rem;
        color: var(--accent-primary);
      }
      .desc-cell { color: var(--text-secondary); max-width: 300px; }
      code {
        background: var(--bg-tertiary);
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 0.78rem;
        color: var(--text-secondary);
      }
      .badge-pii {
        background: #fef2f2;
        color: #b91c1c;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid #fecaca;
      }
      .badge-safe {
        background: #ecfdf5;
        color: #065f46;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid #a7f3d0;
      }
      .samples {
        color: var(--text-tertiary);
        font-size: 0.8rem;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
})
export class CatalogComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  entries: CatalogEntry[] = [];
  loading = true;
  syncing = false;
  syncMessage = '';

  ngOnInit(): void {
    this.loadCatalog();
  }

  get tableNames(): string[] {
    return [...new Set(this.entries.map((e) => e.table_name))];
  }

  getColumnsForTable(table: string): CatalogEntry[] {
    return this.entries.filter((e) => e.table_name === table);
  }

  loadCatalog(): void {
    this.loading = true;
    this.api.get<CatalogEntry[]>('/catalog').subscribe({
      next: (data) => {
        this.entries = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  syncCatalog(): void {
    this.syncing = true;
    this.syncMessage = '';
    this.api.post<{ message: string }>('/catalog/sync', {}).subscribe({
      next: (res) => {
        this.syncMessage = res.message;
        this.syncing = false;
        this.loadCatalog();
      },
      error: () => {
        this.syncMessage = 'Sync failed. Please try again.';
        this.syncing = false;
      },
    });
  }
}
