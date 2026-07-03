import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { QueryResponse, ChatMessage } from '../../core/models/query.model';

import { QueryInputComponent } from './components/query-input/query-input.component';
import { ChatSidebarComponent } from '../../shared/components/chat-sidebar/chat-sidebar.component';
import { ChatThreadComponent } from './components/chat-thread/chat-thread.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    QueryInputComponent,
    ChatSidebarComponent,
    ChatThreadComponent,
  ],
  template: `
    <div class="dashboard-layout" [class.sidebar-collapsed]="sidebarCollapsed">
      <!-- Left Sidebar -->
      <app-chat-sidebar
        #sidebar
        (newChat)="onNewChat()"
        (selectSession)="onSelectSession($event)"
        (collapsedChange)="sidebarCollapsed = $event"
      ></app-chat-sidebar>

      <!-- Main Chat Area -->
      <div class="chat-main">
        <div class="thread-container">
          <app-chat-thread
            [messages]="messages"
            [loading]="loading"
            (exportQuery)="onExport($event)"
            (regenerateQuery)="onSubmit($event)"
            (followupSelected)="onSubmit($event)"
          ></app-chat-thread>
        </div>

        <div class="input-container">
          <app-query-input [loading]="loading" (submitQuery)="onSubmit($event)"></app-query-input>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-layout {
        display: flex;
        height: calc(100vh - 64px);
        margin: -24px;
        transition: all 0.3s ease;
        background: #f8fafc;
      }
      .chat-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #ffffff;
        position: relative;
        min-width: 0;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.02);
      }
      .thread-container {
        flex: 1;
        overflow-y: hidden;
      }
      .input-container {
        padding: 0 24px 24px;
        background: linear-gradient(to top, #ffffff 85%, rgba(255,255,255,0));
      }
    `
  ]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  @ViewChild('sidebar') sidebar!: ChatSidebarComponent;

  sessionId: string = crypto.randomUUID();
  messages: ChatMessage[] = [];
  loading = false;
  sidebarCollapsed = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['session']) {
        this.onSelectSession(params['session']);
      }
    });
  }

  onNewChat(): void {
    this.sessionId = crypto.randomUUID();
    this.messages = [];
  }

  onSelectSession(sessionId: string): void {
    this.sessionId = sessionId;
    this.loading = true;
    this.messages = [];

    this.api.get<ChatMessage[]>(`/queries/sessions/${sessionId}`).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSubmit(query: string): void {
    if (!query.trim() || this.loading) return;

    // Optimistically add user query to thread
    const tempId = Date.now();
    this.messages.push({
      id: tempId,
      query: query,
      answer: '',
      created_at: new Date().toISOString(),
      confidence: 0,
      hypotheses: []
    });

    this.loading = true;

    this.api.post<QueryResponse>('/queries', { query, session_id: this.sessionId }).subscribe({
      next: (res) => {
        this.messages = this.messages.filter(m => m.id !== tempId);

        this.messages.push({
          id: res.id,
          query: query,
          answer: res.answer,
          created_at: new Date().toISOString(),
          chart: res.chart,
          sql: res.sql,
          confidence: res.confidence,
          hypotheses: res.hypotheses || [],
          best_hypothesis: res.best_hypothesis,
          follow_up_suggestions: res.follow_up_suggestions || [],
          isError: false,
        });

        this.loading = false;

        // Refresh sidebar after first message in a new session
        if (this.messages.length === 1 && this.sidebar) {
          this.sidebar.loadSessions();
          this.sidebar.activeSessionId = this.sessionId;
        }
      },
      error: (err) => {
        this.messages = this.messages.filter(m => m.id !== tempId);

        this.messages.push({
          id: Date.now(),
          query: query,
          answer: `**Error:** ${err.error?.detail || err.message || 'Failed to process query. Please try again.'}`,
          created_at: new Date().toISOString(),
          confidence: 0,
          hypotheses: [],
          isError: true,
        });
        this.loading = false;
      },
    });
  }

  onExport(event: { id: number, format: string }): void {
    this.api.getBlob(`/queries/${event.id}/export`, { format: event.format }).subscribe({
      next: (blob) => {
        const ext = event.format === 'excel' ? 'xlsx' : event.format;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_${event.id}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }
}
