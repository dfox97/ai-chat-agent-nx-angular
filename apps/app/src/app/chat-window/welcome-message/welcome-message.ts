import { Component } from '@angular/core';

@Component({
  selector: 'app-welcome-message',
  template: `
    <div class="welcome-container">
      <h1>Local GPT</h1>
      <div class="welcome-message">
        <p>👋 Welcome! I'm your AI assistant.</p>
        <p>How can I help you today?</p>
      </div>
      <div class="example-prompts">
        <p>You can try asking me:</p>
        <ul>
          <li>"Explain quantum computing in simple terms"</li>
          <li>"Write a poem about artificial intelligence"</li>
          <li>"Help me debug a Python script"</li>
        </ul>
      </div>
    </div>`,
  styleUrl: './welcome-message.scss',
  standalone: true,
  imports: [],
})
export class WelcomeMessage {

}
