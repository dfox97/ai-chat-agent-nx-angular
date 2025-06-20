import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChatWindowComponent } from './chat-window/chat-window.component';

@Component({
  selector: 'app-root',
  template: `
   <app-chat-window></app-chat-window>
   <router-outlet></router-outlet>
  `,
  styleUrl: './app.component.scss',
  imports: [ChatWindowComponent, RouterModule],
  standalone: true,
})
export class AppComponent { }
