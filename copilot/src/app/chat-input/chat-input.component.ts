import { Component, signal, computed, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent {
  sendMessage = output<string>();

  userInput = signal('');
  isComposing = signal(false);

  // Computed value for checking if input is empty
  readonly canSubmit = computed(() => this.userInput().trim().length > 0);

  onKeyDown(event: KeyboardEvent) {
    // Send message on Enter (but not with Shift+Enter)
    if (event.key === 'Enter' && !event.shiftKey && !this.isComposing()) {
      event.preventDefault();
      this.submit();
    }
  }

  submit() {
    const trimmedInput = this.userInput().trim();
    if (trimmedInput) {
      this.sendMessage.emit(trimmedInput);
      this.userInput.set('');
      // Reset textarea height after submission
      this.adjustTextareaHeight(document.querySelector('textarea'));
    }
  }

  updateInput(value: string) {
    this.userInput.set(value);
  }

  // Handle IME composition (for languages like Chinese, Japanese, etc.)
  onCompositionStart() {
    this.isComposing.set(true);
  }

  onCompositionEnd() {
    this.isComposing.set(false);
  }

  adjustTextareaHeight(textarea: HTMLTextAreaElement | null) {
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
