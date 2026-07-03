import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { GlossaryEntry } from '../../core/models/feedback.model';

@Component({
  selector: 'app-glossary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glossary-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Business Glossary</h2>
          <p class="page-subtitle">Standardized metric definitions used by the AI engine.</p>
        </div>
        @if (auth.isAdmin()) {
          <button class="btn-primary" (click)="showForm = !showForm">
            {{ showForm ? 'Cancel' : '+ New Term' }}
          </button>
        }
      </div>

      @if (showForm) {
        <div class="form-card">
          <div class="form-row">
            <input id="glossary-term" name="term" [(ngModel)]="form.term" placeholder="Term (e.g., Revenue)" />
            <input id="glossary-category" name="category" [(ngModel)]="form.category" placeholder="Category (optional)" />
          </div>
          <input id="glossary-definition" name="definition" [(ngModel)]="form.definition" placeholder="Definition" />
          <input id="glossary-sql" name="sql_expression" [(ngModel)]="form.sql_expression" placeholder="SQL Expression (e.g., SUM(amount) WHERE status='SUCCESS')" />
          <button class="btn-primary" (click)="saveEntry()">
            {{ editingId ? 'Update' : 'Create' }}
          </button>
        </div>
      }

      @if (loading) {
        <div class="table-container">
          <div class="loading-rows">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-row">
                <div class="sk-line" style="width:100px"></div>
                <div class="sk-line" style="width:260px"></div>
                <div class="sk-line" style="width:180px"></div>
                <div class="sk-line" style="width:70px"></div>
              </div>
            }
          </div>
        </div>
      } @else if (entries.length === 0) {
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <h3>No glossary entries</h3>
          <p>Add your first business term definition.</p>
        </div>
      } @else {
        <div class="table-container">
          <table>
            <thead><tr>
              <th>Term</th><th>Definition</th><th>SQL Expression</th><th>Category</th>
              @if (auth.isAdmin()) { <th>Actions</th> }
            </tr></thead>
            <tbody>
              @for (entry of entries; track entry.id) {
                <tr>
                  <td class="term-cell">{{ entry.term }}</td>
                  <td class="def-cell">{{ entry.definition }}</td>
                  <td><code>{{ entry.sql_expression }}</code></td>
                  <td class="cat-cell">{{ entry.category || '-' }}</td>
                  @if (auth.isAdmin()) {
                    <td class="actions-cell">
                      <button class="btn-sm" (click)="startEdit(entry)">Edit</button>
                      <button class="btn-sm btn-danger" (click)="deleteEntry(entry.id)">Delete</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .glossary-page{max-width:1100px;margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:16px}
    .page-title{font-size:1.5rem;font-weight:700;color:var(--text-primary);margin:0}
    .page-subtitle{font-size:.875rem;color:var(--text-tertiary);margin:4px 0 0}
    .btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;background:var(--accent-primary);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem;transition:all .2s;white-space:nowrap;flex-shrink:0}
    .btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px);box-shadow:0 4px 12px rgba(24,72,138,.25)}
    .form-card{background:var(--bg-secondary);padding:20px;border-radius:var(--radius-lg);border:1px solid var(--border-light);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
    .form-row{display:flex;gap:10px}
    .form-row input{flex:1}
    input{padding:10px 14px;border:1.5px solid var(--border-light);border-radius:8px;font-size:.9rem;width:100%;box-sizing:border-box;font-family:var(--font-sans);color:var(--text-primary);background:var(--bg-primary);transition:all .2s}
    input:focus{outline:none;border-color:var(--accent-primary);background:var(--bg-secondary);box-shadow:var(--shadow-glow)}
    .loading-rows{padding:16px;display:flex;flex-direction:column;gap:12px}
    .skeleton-row{display:flex;gap:16px;align-items:center;padding:10px 0}
    .sk-line{height:14px;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:60px 20px;color:var(--text-tertiary)}
    .empty-state h3{font-size:1.1rem;color:var(--text-secondary);margin:0}
    .empty-state p{font-size:.9rem;margin:0}
    .table-container{background:var(--bg-secondary);border-radius:var(--radius-lg);border:1px solid var(--border-light);box-shadow:var(--shadow-sm);overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{background:var(--bg-tertiary);color:var(--text-secondary);padding:10px 14px;text-align:left;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border-light)}
    td{padding:10px 14px;border-bottom:1px solid var(--border-light);font-size:.85rem;color:var(--text-primary)}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:var(--bg-primary)}
    .term-cell{font-weight:600;color:var(--accent-primary)}
    .def-cell{color:var(--text-secondary);max-width:300px}
    .cat-cell{color:var(--text-tertiary)}
    code{background:var(--bg-tertiary);padding:2px 7px;border-radius:4px;font-size:.78rem;color:var(--text-secondary)}
    .actions-cell{white-space:nowrap}
    .btn-sm{padding:4px 10px;border:1px solid var(--border-light);background:var(--bg-secondary);border-radius:6px;cursor:pointer;margin-right:4px;font-size:.75rem;font-weight:500;color:var(--text-secondary);transition:all .15s}
    .btn-sm:hover{border-color:var(--accent-primary);color:var(--accent-primary)}
    .btn-danger{color:#dc2626;border-color:#fecaca}
    .btn-danger:hover{background:#fef2f2;color:#dc2626;border-color:#dc2626}
  `],
})
export class GlossaryComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  entries: GlossaryEntry[] = [];
  loading = true;
  showForm = false;
  editingId: number | null = null;
  form = { term: '', definition: '', sql_expression: '', category: '' };

  ngOnInit(): void { this.loadEntries(); }

  loadEntries(): void {
    this.loading = true;
    this.api.get<GlossaryEntry[]>('/glossary').subscribe({
      next: (data) => { this.entries = data; this.loading = false; },
      error: () => (this.loading = false),
    });
  }

  saveEntry(): void {
    if (this.editingId) {
      this.api.put<GlossaryEntry>(`/glossary/${this.editingId}`, this.form).subscribe(() => { this.resetForm(); this.loadEntries(); });
    } else {
      this.api.post<GlossaryEntry>('/glossary', this.form).subscribe(() => { this.resetForm(); this.loadEntries(); });
    }
  }

  startEdit(entry: GlossaryEntry): void {
    this.editingId = entry.id;
    this.form = { term: entry.term, definition: entry.definition, sql_expression: entry.sql_expression, category: entry.category || '' };
    this.showForm = true;
  }

  deleteEntry(id: number): void {
    if (confirm('Delete this glossary entry?')) {
      this.api.delete(`/glossary/${id}`).subscribe(() => this.loadEntries());
    }
  }

  private resetForm(): void {
    this.form = { term: '', definition: '', sql_expression: '', category: '' };
    this.editingId = null;
    this.showForm = false;
  }
}
