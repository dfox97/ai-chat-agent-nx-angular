import { Component, computed, output, model, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
  standalone: true,
  imports: [FormsModule, CommonModule],
})
export class ChatInputComponent {
  public readonly messageInputRef = viewChild<ElementRef<HTMLTextAreaElement>>('messageInput');
  public messageSent = output<string>();

  public userInput = model(''); // Updates in template ngmodel.

  readonly #trimmedInput = computed(() => this.userInput().trim());
  public readonly canSubmit = computed(() => this.#trimmedInput().length > 0);

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit() {
    if (!this.#trimmedInput()) return;

    this.messageSent.emit(this.#trimmedInput());

    this.userInput.set('');

    if (this.messageInputRef()?.nativeElement) {
      this.adjustTextareaHeight(this.messageInputRef()?.nativeElement);
    }
  }

  adjustTextareaHeight(textarea: HTMLTextAreaElement | undefined) {
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}
