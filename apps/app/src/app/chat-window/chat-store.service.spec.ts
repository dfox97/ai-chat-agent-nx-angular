import { ChatMessage, ChatResponse } from "@gpt-copilot/shared";
import { instance, mock, verify, when } from "@johanblumenberg/ts-mockito";
import { LocalStorageService } from "../../services/localstorage.service";
import { ChatStoreService } from "./chat-store.service";
import { ChatService } from "./chat.service";
import { of } from "rxjs";
import { TestBed } from "@angular/core/testing";
import { ApplicationRef } from "@angular/core";

const MOCK_CONVO_ID = 'test-conversation-id';

describe('ChatStoreService', () => {
  let service: ChatStoreService;
  let mockLocalStorageService: LocalStorageService;
  let mockChatService: ChatService;

  let mockChatHistory: ChatMessage[];


  beforeEach(() => {
    mockLocalStorageService = mock(LocalStorageService);
    mockChatService = mock(ChatService);

    mockChatHistory = [
      {
        content: 'Hello',
        role: 'user',
        timestamp: new Date('2023-10-01T12:00:00Z')
      },
      {
        content: 'Hello, how can I help you?',
        role: 'assistant',
        timestamp: new Date('2023-10-01T12:00:00Z')
      }
    ]

    when(mockLocalStorageService.getItem('conversationId')).thenReturn(MOCK_CONVO_ID);
    when(mockChatService.loadChatHistory(MOCK_CONVO_ID)).thenReturn(of(mockChatHistory));

    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: instance(mockLocalStorageService) },
        { provide: ChatService, useValue: instance(mockChatService) },
        ChatStoreService,
      ],
    })

    TestBed.runInInjectionContext(() => {
      service = TestBed.inject(ChatStoreService)
    })

  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  describe('messages', () => {
    it('should return initial messages from chat history', async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      expect(service.messages()).toEqual(mockChatHistory);
    });

    it('should return false if messages are not empty', async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      expect(service.isFirstMessage()).toEqual(false)
    })

    it('should return true if messages are empty', async () => {
      when(mockChatService.loadChatHistory(MOCK_CONVO_ID)).thenReturn(of([]));

      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.isFirstMessage()).toEqual(true);
    });
  })

  describe('sendMessage', () => {
    it('should add user message and assistant response', async () => {
      const finalResponse = { response: { finalAnswer: 'This is the ai answer.' } } as ChatResponse;
      when(mockChatService.sendMessage('hi', MOCK_CONVO_ID)).thenResolve(finalResponse);

      await TestBed.inject(ApplicationRef).whenStable();

      await service.sendMessage('hi');

      const mockMesaages = [
        ...mockChatHistory,
        {
          content: 'hi',
          role: 'user',
          timestamp: expect.any(Date),
        },
        {
          content: 'This is the ai answer.',
          role: 'assistant',
          timestamp: expect.any(Date),
        },
      ];
      expect(service.messages()).toEqual(mockMesaages);
    });
  });

  describe('clearConversationHistory', () => {
    it('should clear conversation history', async () => {
      when(mockLocalStorageService.getItem('conversationId')).thenReturn(MOCK_CONVO_ID);
      when(mockChatService.loadChatHistory(MOCK_CONVO_ID)).thenReturn(of([]));

      await TestBed.inject(ApplicationRef).whenStable();
      await service.clearCurrentConversation();

      expect(service.messages()).toEqual([]);
      verify(mockChatService.clearConversationHistory(MOCK_CONVO_ID)).once();
    });
  })
});
