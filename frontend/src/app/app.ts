import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .main-content {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        min-height: calc(100vh - 67px);
        box-sizing: border-box;
      }
    `,
  ],
})
export class App {
  title = 'Self-Serve Analytics BI';
}
