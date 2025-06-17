import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChatWindowComponent } from './chat-window/chat-window.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [ChatWindowComponent, RouterModule],
  standalone: true,
})
export class AppComponent {
  title = 'copilot';
}
