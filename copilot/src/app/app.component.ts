import { Component } from '@angular/core';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';
import { ChatInputComponent } from './chat-input/chat-input.component';
import { RouterModule } from '@angular/router';
import { ChatWindowComponent } from './chat-window/chat-window.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [ChatSidebarComponent, ChatInputComponent, ChatWindowComponent, RouterModule],
  standalone: true,
})
export class AppComponent {
  title = 'copilot';
}
