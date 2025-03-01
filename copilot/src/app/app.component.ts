import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [ChatSidebarComponent, RouterModule],
  standalone: true,
})
export class AppComponent {
  title = 'copilot';
}
