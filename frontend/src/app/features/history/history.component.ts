import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { QueryHistoryItem, PaginatedResponse } from '../../core/models/query.model';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-page">
      <div class="page-header">
        <h2 class="page-title">Query History</h2>
        <p class="page-subtitle">Review past queries, answers, and confidence scores.</p>
      </div>

      @if (loading) {
        <div class="table-container">
          <div class="loading-rows">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="skeleton-row">
                <div class="sk-line" style="width:40px"></div>
                <div class="sk-line" style="width:200px"></div>
                <div class="sk-line" style="width:280px"></div>
                <div class="sk-line" style="width:50px"></div>
                <div class="sk-line" style="width:80px"></div>
              </div>
            }
          </div>
        </div>
      } @else if (items.length === 0) {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h3>No queries yet</h3>
          <p>Head to the Dashboard to ask your first question.</p>
        </div>
      } @else {
        <div class="table-container">
          <table>
            <thead><tr>
              <th>ID</th>
              @if (isAdmin()) { <th>User</th> }
              <th>Query</th><th>Answer</th><th>Confidence</th><th>Date</th>
            </tr></thead>
            <tbody>
              @for (item of items; track item.id) {
                <tr class="clickable-row" (click)="openSession(item.session_id)">
                  <td class="id-cell">{{ item.id }}</td>
                  @if (isAdmin()) { <td>{{ item.user_email || '-' }}</td> }
                  <td class="query-cell">{{ item.natural_language_query }}</td>
                  <td class="answer-cell">{{ item.answer_text ? (item.answer_text | slice:0:80) + '...' : '-' }}</td>
                  <td>
                    @if (item.confidence_score != null) {
                      <span class="conf-pill" [class.high]="item.confidence_score > 0.8" [class.med]="item.confidence_score > 0.5 && item.confidence_score <= 0.8" [class.low]="item.confidence_score <= 0.5">{{ (item.confidence_score * 100).toFixed(0) }}%</span>
                    }
                  </td>
                  <td class="date-cell">{{ item.created_at | date:'MMM d, y' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button class="pg-btn" [disabled]="page<=1" (click)="goPage(page-1)">← Previous</button>
          <span class="pg-info">Page {{ page }} of {{ totalPages }}</span>
          <button class="pg-btn" [disabled]="page>=totalPages" (click)="goPage(page+1)">Next →</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .history-page{max-width:1100px;margin:0 auto}
    .page-header{margin-bottom:24px}
    .page-title{font-size:1.5rem;font-weight:700;color:var(--text-primary);margin:0}
    .page-subtitle{font-size:.875rem;color:var(--text-tertiary);margin:4px 0 0}
    .loading-rows{padding:16px;display:flex;flex-direction:column;gap:12px}
    .skeleton-row{display:flex;gap:16px;align-items:center;padding:10px 0}
    .sk-line{height:14px;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:60px 20px;color:var(--text-tertiary)}
    .empty-state h3{font-size:1.1rem;color:var(--text-secondary);margin:0}
    .empty-state p{font-size:.9rem;margin:0;max-width:320px}
    .table-container{background:var(--bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--border-light);box-shadow:var(--shadow-sm);overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{background:var(--bg-tertiary);color:var(--text-secondary);padding:10px 14px;text-align:left;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border-light)}
    td{padding:10px 14px;border-bottom:1px solid var(--border-light);font-size:.85rem;color:var(--text-primary)}
    tr:last-child td{border-bottom:none}
    .id-cell{color:var(--text-tertiary);font-variant-numeric:tabular-nums}
    .date-cell{color:var(--text-tertiary);white-space:nowrap}
    .query-cell,.answer-cell{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .answer-cell{color:var(--text-secondary)}
    tr.clickable-row{cursor:pointer;transition:background .1s}
    tr.clickable-row:hover td{background:var(--bg-primary)}
    .conf-pill{font-size:.75rem;font-weight:600;padding:3px 8px;border-radius:10px}
    .conf-pill.high{background:#dcfce7;color:#15803d}
    .conf-pill.med{background:#fef9c3;color:#a16207}
    .conf-pill.low{background:#fee2e2;color:#b91c1c}
    .pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px}
    .pg-btn{display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border:1px solid var(--border-light);background:var(--bg-secondary);border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:500;color:var(--text-secondary);transition:all .15s}
    .pg-btn:hover:not(:disabled){background:var(--bg-primary);border-color:var(--accent-primary);color:var(--accent-primary)}
    .pg-btn:disabled{opacity:.35;cursor:not-allowed}
    .pg-info{font-size:.82rem;color:var(--text-tertiary);font-weight:500}
  `],
})
export class HistoryComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly isAdmin = this.auth.isAdmin;

  items: QueryHistoryItem[] = [];
  page = 1;
  totalPages = 1;
  loading = true;

  ngOnInit(): void { this.loadPage(); }

  loadPage(): void {
    this.loading = true;
    this.api.get<PaginatedResponse<QueryHistoryItem>>('/queries', { page: this.page, page_size: 15 }).subscribe({
      next: (res) => { this.items = res.items; this.totalPages = res.total_pages; this.loading = false; },
      error: () => (this.loading = false),
    });
  }

  goPage(p: number): void { this.page = p; this.loadPage(); }

  openSession(sessionId: string | undefined): void {
    if (sessionId) this.router.navigate(['/dashboard'], { queryParams: { session: sessionId } });
  }
}
