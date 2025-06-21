import { TestBed } from '@angular/core/testing';
import { ChatInputComponent } from './chat-input.component';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;

  beforeEach(() => {
    TestBed.runInInjectionContext(() => {
      component = new ChatInputComponent();
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
