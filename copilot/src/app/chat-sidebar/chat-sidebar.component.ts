import { Component, output } from '@angular/core';

interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  templateUrl: './chat-sidebar.component.html',
  styleUrl: './chat-sidebar.component.scss',
})
export class ChatSidebarComponent {

  //conversationSelected = output<Conversation>();

  activeConversationId: string | null = null;

  // Mock conversations data
  conversations: Conversation[] = [
    {
      id: '1',
      title: 'Getting Started with AI',
      lastMessage: 'Hello! How can I help you today?',
      timestamp: new Date()
    },
    {
      id: '2',
      title: 'Code Review Discussion',
      lastMessage: 'Let\'s review your code.',
      timestamp: new Date()
    }
  ];

  startNewChat() {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      timestamp: new Date()
    };
    this.conversations.unshift(newConversation);
    this.selectConversation(newConversation);
  }

  selectConversation(conversation: Conversation) {
    this.activeConversationId = conversation.id;
    // this.conversationSelected.emit(conversation);
  }

  editConversation(conversation: Conversation, event: Event) {
    event.stopPropagation();
    // TODO: Implement edit functionality
    const newTitle = prompt('Enter new title:', conversation.title);
    if (newTitle) {
      conversation.title = newTitle;
    }
  }

  deleteConversation(conversation: Conversation, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.conversations = this.conversations.filter(c => c.id !== conversation.id);
      if (this.activeConversationId === conversation.id) {
        this.activeConversationId = null;
      }
    }
  }
}
