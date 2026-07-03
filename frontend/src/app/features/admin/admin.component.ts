import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { GovernanceRule } from '../../core/models/feedback.model';

interface TeamUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  session_count: number;
  sessions: { session_id: string; first_query: string; last_activity: string; query_count: number }[];
  expanded?: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <!-- Tab Navigation -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab === 'governance'" (click)="activeTab = 'governance'">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Governance Rules
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'team'" (click)="loadTeamChats()">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Team Chats
        </button>
      </div>

      <!-- ── Governance Rules Tab ────────────────────────────────────── -->
      @if (activeTab === 'governance') {
        <div class="form-card">
          <h4>{{ editingId ? 'Edit Rule' : 'Create Rule' }}</h4>
          <div class="form-grid">
            <select id="rule-type-select" name="rule_type" [(ngModel)]="form.rule_type">
              <option value="rbac">RBAC</option>
              <option value="pii_mask">PII Mask</option>
              <option value="row_filter">Row Filter</option>
            </select>
            <input id="rule-role-input" name="role" [(ngModel)]="form.role" placeholder="Role (e.g., viewer)" />
            <input id="rule-table-input" name="table_name" [(ngModel)]="form.table_name" placeholder="Table name" />
            <input id="rule-column-input" name="column_name" [(ngModel)]="form.column_name" placeholder="Column name (optional)" />
            <input id="rule-condition-input" name="condition" [(ngModel)]="form.condition" placeholder="SQL condition (optional)" />
          </div>
          <div class="form-actions">
            <button class="btn-primary" (click)="saveRule()">
              {{ editingId ? 'Update' : 'Create' }}
            </button>
            @if (editingId) {
              <button class="btn-secondary" (click)="cancelEdit()">Cancel</button>
            }
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Role</th>
                <th>Table</th>
                <th>Column</th>
                <th>Condition</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (rule of rules; track rule.id) {
                <tr>
                  <td>
                    <span class="badge" [class]="'badge-' + rule.rule_type">{{ rule.rule_type }}</span>
                  </td>
                  <td>{{ rule.role || 'All' }}</td>
                  <td>{{ rule.table_name }}</td>
                  <td>{{ rule.column_name || '-' }}</td>
                  <td><code>{{ rule.condition || '-' }}</code></td>
                  <td>{{ rule.is_active ? 'Yes' : 'No' }}</td>
                  <td>
                    <button class="btn-sm" (click)="startEdit(rule)">Edit</button>
                    <button class="btn-sm btn-danger" (click)="deleteRule(rule.id)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ── Team Chats Tab ──────────────────────────────────────────── -->
      @if (activeTab === 'team') {
        <div class="team-section">
          <div class="section-header">
            <h3>Team Chat Access</h3>
            <p>Click a team member to see their sessions. Click a session to open the full conversation.</p>
          </div>

          @if (loadingTeam) {
            <div class="loading-team">Loading team data...</div>
          } @else if (teamUsers.length === 0) {
            <div class="empty-team">No team members found.</div>
          } @else {
            <div class="user-list">
              @for (user of teamUsers; track user.id) {
                <div class="user-card" [class.expanded]="user.expanded">
                  <div class="user-header" (click)="toggleUser(user)">
                    <div class="user-avatar">{{ user.full_name.charAt(0).toUpperCase() }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ user.full_name }}</div>
                      <div class="user-meta">{{ user.email }} · <span class="role-badge">{{ user.role }}</span></div>
                    </div>
                    <div class="user-stat">
                      <strong>{{ user.session_count }}</strong>
                      <span>sessions</span>
                    </div>
                    <svg class="expand-icon" [class.rotated]="user.expanded" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>

                  @if (user.expanded && user.sessions.length > 0) {
                    <div class="session-list">
                      @for (session of user.sessions; track session.session_id) {
                        <div class="session-row" (click)="openUserSession(session.session_id)">
                          <div class="session-query">{{ session.first_query }}</div>
                          <div class="session-info">
                            <span>{{ session.last_activity | date:'MMM d, y' }}</span>
                            <span>{{ session.query_count }} messages</span>
                            <button class="btn-open" (click)="$event.stopPropagation(); openUserSession(session.session_id)">
                              Open Chat →
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @if (user.expanded && user.sessions.length === 0) {
                    <div class="no-sessions">No sessions yet.</div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-page { max-width: 1100px; margin: 0 auto; }

      /* Tabs */
      .tab-bar {
        display: flex;
        gap: 4px;
        background: #f1f5f9;
        border-radius: 12px;
        padding: 5px;
        margin-bottom: 24px;
        width: fit-content;
      }
      .tab-btn {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 9px 20px;
        background: transparent;
        border: none;
        border-radius: 9px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        color: #64748b;
        transition: all 0.2s;
      }
      .tab-btn.active {
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }

      /* Governance */
      h3 { color: #1a1a2e; margin: 0 0 4px; }
      h4 { margin: 0 0 12px; color: #333; }
      .form-card {
        background: white; padding: 20px; border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 24px;
      }
      .form-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px; margin-bottom: 12px;
      }
      select, input {
        padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem;
      }
      .form-actions { display: flex; gap: 8px; }
      .btn-primary { padding: 10px 20px; background: #18488a; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
      .btn-secondary { padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; }
      .table-container { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #18488a; color: white; padding: 10px 14px; text-align: left; font-size: 0.85rem; }
      td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 0.85rem; }
      code { background: #f0f0f5; padding: 2px 6px; border-radius: 4px; }
      .badge { padding: 2px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
      .badge-rbac { background: #cce5ff; color: #004085; }
      .badge-pii_mask { background: #f8d7da; color: #721c24; }
      .badge-row_filter { background: #fff3cd; color: #856404; }
      .btn-sm { padding: 4px 10px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; margin-right: 4px; font-size: 0.75rem; }
      .btn-danger { color: #dc3545; border-color: #dc3545; }
      .btn-danger:hover { background: #dc3545; color: white; }

      /* Team Chats */
      .team-section { }
      .section-header { margin-bottom: 20px; }
      .section-header p { color: #64748b; font-size: 0.9rem; margin: 4px 0 0; }
      .loading-team, .empty-team { padding: 40px; text-align: center; color: #94a3b8; }
      .user-list { display: flex; flex-direction: column; gap: 10px; }

      .user-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        transition: box-shadow 0.2s;
      }
      .user-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

      .user-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 20px;
        cursor: pointer;
        user-select: none;
      }
      .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #18488a, #12376b);
        color: white;
        font-weight: 700;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .user-info { flex: 1; min-width: 0; }
      .user-name { font-weight: 600; font-size: 0.95rem; color: #0f172a; }
      .user-meta { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
      .role-badge { background: #e8f0fe; color: #18488a; padding: 1px 7px; border-radius: 10px; font-weight: 600; font-size: 0.72rem; }
      .user-stat { text-align: center; flex-shrink: 0; }
      .user-stat strong { display: block; font-size: 1.3rem; color: #1e293b; line-height: 1; }
      .user-stat span { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; }
      .expand-icon { color: #94a3b8; transition: transform 0.2s; flex-shrink: 0; }
      .expand-icon.rotated { transform: rotate(180deg); }

      .session-list {
        border-top: 1px solid #f1f5f9;
        background: #f8fafc;
      }
      .session-row {
        padding: 12px 20px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.15s;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .session-row:last-child { border-bottom: none; }
      .session-row:hover { background: #e8f0fe; }
      .session-query { font-size: 0.88rem; color: #334155; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .session-info { display: flex; align-items: center; gap: 14px; font-size: 0.75rem; color: #94a3b8; }
      .btn-open { background: transparent; border: 1px solid #a4c2f4; color: #18488a; border-radius: 5px; padding: 3px 10px; font-size: 0.75rem; cursor: pointer; font-weight: 500; transition: all 0.15s; }
      .btn-open:hover { background: #18488a; color: white; }
      .no-sessions { padding: 16px 20px; color: #94a3b8; font-size: 0.85rem; border-top: 1px solid #f1f5f9; background: #f8fafc; }
    `,
  ],
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  activeTab: 'governance' | 'team' = 'governance';

  // ── Governance ─────────────────────────────────────────────────────────────
  rules: GovernanceRule[] = [];
  editingId: number | null = null;
  form = { rule_type: 'rbac', role: '', table_name: '', column_name: '', condition: '' };

  // ── Team Chats ─────────────────────────────────────────────────────────────
  teamUsers: TeamUser[] = [];
  loadingTeam = false;

  ngOnInit(): void {
    this.loadRules();
  }

  // ── Governance Methods ─────────────────────────────────────────────────────
  loadRules(): void {
    this.api.get<GovernanceRule[]>('/governance/rules').subscribe((data) => (this.rules = data));
  }

  saveRule(): void {
    const body = { ...this.form };
    if (!body.role) delete (body as any).role;
    if (!body.column_name) delete (body as any).column_name;
    if (!body.condition) delete (body as any).condition;

    if (this.editingId) {
      this.api.put(`/governance/rules/${this.editingId}`, body).subscribe(() => {
        this.cancelEdit();
        this.loadRules();
      });
    } else {
      this.api.post('/governance/rules', body).subscribe(() => {
        this.resetForm();
        this.loadRules();
      });
    }
  }

  startEdit(rule: GovernanceRule): void {
    this.editingId = rule.id;
    this.form = {
      rule_type: rule.rule_type,
      role: rule.role || '',
      table_name: rule.table_name,
      column_name: rule.column_name || '',
      condition: rule.condition || '',
    };
  }

  deleteRule(id: number): void {
    if (confirm('Delete this governance rule?')) {
      this.api.delete(`/governance/rules/${id}`).subscribe(() => this.loadRules());
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.form = { rule_type: 'rbac', role: '', table_name: '', column_name: '', condition: '' };
  }

  // ── Team Chat Methods ──────────────────────────────────────────────────────
  loadTeamChats(): void {
    this.activeTab = 'team';
    if (this.teamUsers.length > 0) return; // already loaded
    this.loadingTeam = true;
    this.api.get<TeamUser[]>('/auth/users').subscribe({
      next: (data) => {
        this.teamUsers = data.map(u => ({ ...u, expanded: false }));
        this.loadingTeam = false;
      },
      error: () => {
        this.loadingTeam = false;
      }
    });
  }

  toggleUser(user: TeamUser): void {
    user.expanded = !user.expanded;
  }

  openUserSession(sessionId: string): void {
    this.router.navigate(['/dashboard'], { queryParams: { session: sessionId } });
  }
}
