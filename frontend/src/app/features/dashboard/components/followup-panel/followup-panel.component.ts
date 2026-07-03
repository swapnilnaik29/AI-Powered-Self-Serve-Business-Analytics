import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-followup-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (suggestions.length > 0) {
      <div class="followup-panel">
        <h4>Follow-up Questions</h4>
        <div class="suggestion-list">
          @for (s of suggestions; track $index) {
            <button class="suggestion-chip" (click)="onSelect.emit(s)">{{ s }}</button>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .followup-panel {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
      }
      h4 { color: #0f172a; margin: 0 0 12px; }
      .suggestion-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .suggestion-chip {
        background: #f0f0f5;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        color: #333;
      }
      .suggestion-chip:hover {
        background: #18488a;
        color: white;
        border-color: #18488a;
      }
    `,
  ],
})
export class FollowupPanelComponent {
  @Input() suggestions: string[] = [];
  @Output() onSelect = new EventEmitter<string>();
}
