import { HttpClient } from "@angular/common/http";
import { inject, Injectable, PLATFORM_ID } from "@angular/core";
import { Observable, catchError, throwError, map, tap } from "rxjs";
import { isPlatformBrowser } from "@angular/common";
import { ChatResponse, ChatRequest, AgentResponse, ChatMessage } from "@copilot/shared-types";
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
    console.log('Sending message to API:', message);
    console.log('API URL:', this.apiUrl);

    // Create a simple test message object
    const payload: ChatRequest = {
      message: message,
      conversationId: conversationId || undefined
    }

    console.log('Payload being sent:', payload);

    // Add explicit headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };


    return this.http.post<ChatResponse>(this.apiUrl, payload, { headers }).pipe(
      map(response => {
        response.response = JSON.parse(response.response as unknown as string) as AgentResponse;
        return response;
      }),
      tap((response) => {
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
