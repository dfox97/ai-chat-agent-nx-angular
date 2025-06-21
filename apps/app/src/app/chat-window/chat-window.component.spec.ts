import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatWindowComponent } from './chat-window.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { instance, mock, when } from '@johanblumenberg/ts-mockito';
import { ChatStoreService } from './chat-store.service';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let fixture: ComponentFixture<ChatWindowComponent>;

  let mockChatStoreService: ChatStoreService;

  beforeEach(() => {
    mockChatStoreService = mock(ChatStoreService);

    when(mockChatStoreService.messages()).thenReturn([]);
    when(mockChatStoreService.isFirstMessage()).thenReturn(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: ChatStoreService, useValue: instance(mockChatStoreService) },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      imports: [
        ChatWindowComponent,
      ],
    });

    fixture = TestBed.createComponent(ChatWindowComponent);
    fixture.detectChanges();

    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
