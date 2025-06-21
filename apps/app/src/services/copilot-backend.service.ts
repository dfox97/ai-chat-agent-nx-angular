import { HttpClient } from "@angular/common/http";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";
import { Observable, catchError, throwError, tap } from "rxjs";
import { isPlatformBrowser } from "@angular/common";
import { ChatRequest, ChatResponse, ChatMessage } from "@gpt-copilot/shared";
import { environment } from "../environment";

@Injectable({
  providedIn: 'root'
})
export class CopilotBackendService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  private readonly platformID = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  /**
   * Send a message to the Copilot API
   * @param message The user's message
   */
  sendMessage(message: string, conversationId?: string | null): Observable<ChatResponse> {
    console.log('API URL:', this.apiUrl);

    // Create a simple test message object
    const payload: ChatRequest = {
      message: message,
      conversationId: conversationId || undefined
    }

    // Add explicit headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };


    return this.http.post<ChatResponse>(this.apiUrl, payload, { headers }).pipe(
      tap((response) => {
        console.log('Received response from Copilot API:', response);
        if (isPlatformBrowser(this.platformID)) {
          console.log('Storing conversationId in localStorage:', response.metadata.conversationId);
          localStorage.setItem('conversationId', response.metadata.conversationId)
        }
      }
      ),
      catchError(error => {
        console.error('Error calling Copilot API:', error);
        return throwError(() => new Error('Failed to get response from Copilot'));
      })
    );
  }

  clearConversationHistory(conversationId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${conversationId}`).pipe(
      catchError(error => {
        console.error(`Error clearing conversation ${conversationId}:`, error);
        return throwError(() => new Error(`Failed to clear conversation ${conversationId}`));
      })
    );
  }

  /**
   * Get conversation history
   * @param conversationId The conversation ID
   */
  getConversationHistory(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/message/${conversationId}`).pipe(
      catchError(error => {
        console.error('Error fetching conversation history:', error);
        return throwError(() => new Error('Failed to fetch conversation history'));
      })
    );
  }
}
