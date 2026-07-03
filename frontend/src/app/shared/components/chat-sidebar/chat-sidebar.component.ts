import { Component, OnInit, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SessionSummary } from '../../../core/models/query.model';

interface SessionGroup {
  label: string;
  sessions: (SessionSummary & { customTitle?: string; renaming?: boolean; tempTitle?: string })[];
}

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-sidebar" [class.collapsed]="collapsed()">

      <!-- Toggle Button -->
      <button class="collapse-btn" (click)="toggleCollapse()" [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          @if (collapsed()) {
            <polyline points="9 18 15 12 9 6"></polyline>
          } @else {
            <polyline points="15 18 9 12 15 6"></polyline>
          }
        </svg>
      </button>

      @if (!collapsed()) {
        <div class="sidebar-header">
          <button class="btn-new-chat" (click)="onNewChat()" id="new-chat-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </button>
        </div>

        <div class="sidebar-content">
          @if (loading()) {
            <div class="loading-state">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
          } @else if (sessions().length === 0) {
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p>No recent chats</p>
              <span>Start a conversation to see your history here.</span>
            </div>
          } @else {
            <div class="session-list">
              @for (group of groupedSessions(); track group.label) {
                <div class="group-header">{{ group.label }}</div>
                @for (session of group.sessions; track session.session_id) {
                  <div
                    class="session-item"
                    [class.active]="session.session_id === activeSessionId"
                    (click)="onSelectSession(session.session_id)"
                  >
                    @if (session.renaming) {
                      <!-- Inline rename input -->
                      <input
                        class="rename-input"
                        [(ngModel)]="session.tempTitle"
                        (blur)="confirmRename(session)"
                        (keydown.enter)="confirmRename(session)"
                        (keydown.escape)="cancelRename(session)"
                        (click)="$event.stopPropagation()"
                        #renameInput
                        [id]="'rename-' + session.session_id"
                        [name]="'rename-' + session.session_id"
                      />
                    } @else {
                      <div class="session-title" [title]="getTitle(session)">
                        {{ getTitle(session) }}
                      </div>
                    }
                    <div class="session-meta">{{ session.last_activity | date:'MMM d' }} · {{ session.query_count }} msgs</div>

                    <!-- Hover actions -->
                    <div class="session-actions" (click)="$event.stopPropagation()">
                      <button
                        class="action-btn rename-btn"
                        (click)="startRename(session)"
                        title="Rename"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        class="action-btn delete-btn"
                        (click)="deleteSession(session.session_id)"
                        title="Delete chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4h6v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
          }
        </div>
      } @else {
        <!-- Collapsed: just show icons -->
        <div class="collapsed-icons">
          <button class="icon-btn" (click)="onNewChat()" title="New Chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chat-sidebar {
        width: 280px;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        height: calc(100vh - 64px);
        position: relative;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
      }
      .chat-sidebar.collapsed {
        width: 52px;
      }

      /* ── Collapse Toggle ───────────────────────────── */
      .collapse-btn {
        position: absolute;
        top: 18px;
        right: -14px;
        width: 28px;
        height: 28px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        color: #64748b;
        transition: all 0.2s;
      }
      .collapse-btn:hover {
        background: #18488a;
        border-color: #18488a;
        color: white;
        transform: scale(1.1);
      }

      /* ── Header ───────────────────────────────────── */
      .sidebar-header {
        padding: 20px 16px 12px;
      }
      .btn-new-chat {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 14px;
        background: linear-gradient(135deg, #18488a 0%, #12376b 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(24, 72, 138, 0.25);
      }
      .btn-new-chat:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(24, 72, 138, 0.35);
      }

      /* ── Collapsed Icons ──────────────────────────── */
      .collapsed-icons {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 64px;
        gap: 8px;
      }
      .icon-btn {
        width: 36px;
        height: 36px;
        background: transparent;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #64748b;
        transition: all 0.2s;
      }
      .icon-btn:hover {
        background: #e8f0fe;
        border-color: #18488a;
        color: #18488a;
      }

      /* ── Session List ─────────────────────────────── */
      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 0 10px 20px;
      }
      .group-header {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        padding: 14px 8px 6px;
      }
      .session-list {
        display: flex;
        flex-direction: column;
      }
      .session-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 10px 40px 10px 12px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        text-align: left;
        margin-bottom: 2px;
      }
      .session-item:hover {
        background: #f1f5f9;
      }
      .session-item.active {
        background: #ffffff;
        border-color: #e2e8f0;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .session-title {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
        margin-bottom: 3px;
      }
      .session-item.active .session-title {
        color: #18488a;
        font-weight: 600;
      }
      .session-meta {
        font-size: 0.7rem;
        color: #94a3b8;
      }

      /* ── Hover Action Buttons ─────────────────────── */
      .session-actions {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        gap: 2px;
        align-items: center;
      }
      .session-item:hover .session-actions {
        display: flex;
      }
      .action-btn {
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #94a3b8;
        transition: all 0.15s;
        padding: 0;
      }
      .action-btn:hover {
        background: #e2e8f0;
        color: #475569;
      }
      .delete-btn:hover {
        background: #fee2e2;
        color: #dc2626;
      }

      /* ── Rename Input ─────────────────────────────── */
      .rename-input {
        width: 100%;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1e293b;
        background: #fff;
        border: 1.5px solid #18488a;
        border-radius: 5px;
        padding: 3px 7px;
        outline: none;
        margin-bottom: 3px;
        box-shadow: 0 0 0 3px rgba(24, 72, 138, 0.15);
      }

      /* ── Empty & Loading States ───────────────────── */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
        padding: 40px 16px;
        color: #94a3b8;
      }
      .empty-state p { font-size: 0.9rem; font-weight: 500; color: #64748b; margin: 0; }
      .empty-state span { font-size: 0.8rem; line-height: 1.4; }

      .loading-state {
        padding: 16px 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .skeleton-line {
        height: 40px;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
      }
      .skeleton-line.short { height: 28px; width: 70%; }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `
  ]
})
export class ChatSidebarComponent implements OnInit {
  private api = inject(ApiService);

  @Output() newChat = new EventEmitter<void>();
  @Output() selectSession = new EventEmitter<string>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  sessions = signal<(SessionSummary & { customTitle?: string; renaming?: boolean; tempTitle?: string })[]>([]);
  loading = signal(true);
  collapsed = signal(false);
  activeSessionId: string | null = null;

  private readonly STORAGE_KEY = 'chat_session_titles';

  ngOnInit() {
    this.loadSessions();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    this.collapsedChange.emit(this.collapsed());
  }

  loadSessions() {
    this.loading.set(true);
    this.api.get<SessionSummary[]>('/queries/sessions').subscribe({
      next: (data) => {
        const saved = this.getSavedTitles();
        this.sessions.set(data.map(s => ({
          ...s,
          customTitle: saved[s.session_id] || undefined,
          renaming: false,
          tempTitle: '',
        })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  // Categorize sessions by recent time intervals
  groupedSessions = computed<SessionGroup[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7 = today - 6 * 86400000;
    const last30 = today - 29 * 86400000;

    type SessionItem = SessionSummary & { customTitle?: string; renaming?: boolean; tempTitle?: string };
    const groups: Record<string, SessionItem[]> = {
      Today: [],
      Yesterday: [],
      'Last 7 Days': [],
      'Last 30 Days': [],
      Older: [],
    };

    for (const s of this.sessions()) {
      const d = new Date(s.last_activity).getTime();
      if (d >= today) groups['Today'].push(s);
      else if (d >= yesterday) groups['Yesterday'].push(s);
      else if (d >= last7) groups['Last 7 Days'].push(s);
      else if (d >= last30) groups['Last 30 Days'].push(s);
      else groups['Older'].push(s);
    }

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, sessions]) => ({ label, sessions }));
  });

  // Helpers for titles
  getTitle(session: SessionSummary & { customTitle?: string }): string {
    return session.customTitle || session.first_query || 'New Chat';
  }

  // Rename handlers
  startRename(session: any): void {
    session.tempTitle = this.getTitle(session);
    session.renaming = true;
    setTimeout(() => {
      const el = document.getElementById(`rename-${session.session_id}`);
      if (el) (el as HTMLInputElement).focus();
    }, 50);
  }

  confirmRename(session: any): void {
    const newTitle = (session.tempTitle || '').trim();
    if (newTitle) {
      session.customTitle = newTitle;
      const saved = this.getSavedTitles();
      saved[session.session_id] = newTitle;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saved));
    }
    session.renaming = false;
  }

  cancelRename(session: any): void {
    session.renaming = false;
  }

  // Delete handler
  deleteSession(sessionId: string): void {
    if (!confirm('Delete this chat? This action cannot be undone.')) return;

    this.api.delete(`/queries/sessions/${sessionId}`).subscribe({
      next: () => {
        this.sessions.update(list => list.filter(s => s.session_id !== sessionId));
        // Clear saved title
        const saved = this.getSavedTitles();
        delete saved[sessionId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(saved));
        // If this was the active session, emit a new-chat event
        if (this.activeSessionId === sessionId) {
          this.activeSessionId = null;
          this.newChat.emit();
        }
      },
      error: () => {
        alert('Could not delete session. Please try again.');
      }
    });
  }

  // Navigation handlers
  onNewChat() {
    this.activeSessionId = null;
    this.newChat.emit();
    this.loadSessions();
  }

  onSelectSession(sessionId: string) {
    this.activeSessionId = sessionId;
    this.selectSession.emit(sessionId);
  }

  // Local Storage helpers
  private getSavedTitles(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }
}
