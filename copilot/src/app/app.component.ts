import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcomeComponent } from './nx-welcome.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [NxWelcomeComponent, RouterModule],
  standalone: true,
})
export class AppComponent {
  title = 'copilot';
}
