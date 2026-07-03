import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

declare const vegaEmbed: any;

@Component({
  selector: 'app-chart-display',
  standalone: true,
  template: `
    <div class="chart-container">
      <div #chartEl class="chart-element"></div>
    </div>
  `,
  styles: [
    `
      .chart-container {
        border: 1px solid var(--border-light, #e2e8f0);
        border-radius: var(--radius-lg, 12px);
        padding: 20px;
        background: var(--bg-secondary, #ffffff);
      }
      .chart-element {
        width: 100%;
      }
      /* Remove Vega's default outer border/padding */
      .chart-element :deep(.vega-embed) {
        padding: 0 !important;
      }
    `,
  ],
})
export class ChartDisplayComponent implements OnChanges, AfterViewInit {
  @Input() spec: any = null;
  @ViewChild('chartEl') chartEl!: ElementRef;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['spec'] && this.viewReady) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    if (!this.spec || !this.chartEl) return;

    try {
      if (typeof vegaEmbed !== 'undefined') {
        vegaEmbed(this.chartEl.nativeElement, this.spec, {
          actions: false,
          theme: 'latimes',
        }).catch((err: any) => console.error('Vega embed error:', err));
      }
    } catch {
      console.warn('Vega-embed not available');
    }
  }
}
