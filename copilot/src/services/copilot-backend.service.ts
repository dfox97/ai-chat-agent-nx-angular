import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, map, catchError, throwError } from "rxjs";
import { environment } from "src/environment";

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  role: 'assistant';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CopilotBackendService {
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) { }

  /**
   * Send a message to the Copilot API
   * @param message The user's message
   * @param conversationId Optional conversation ID for context
   */
  sendMessage(message: string, conversationId?: string): Observable<ChatResponse> {
    const request: ChatRequest = {
      message,
      conversationId
    };

    return this.http.post<ChatResponse>(this.apiUrl, request).pipe(
      map(response => ({
        ...response,
        timestamp: new Date(response.timestamp) // Convert string to Date
      })),
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
  getConversationHistory(conversationId: string): Observable<ChatResponse[]> {
    return this.http.get<ChatResponse[]>(`${this.apiUrl}/history/${conversationId}`).pipe(
      map(responses => responses.map(response => ({
        ...response,
        timestamp: new Date(response.timestamp)
      }))),
      catchError(error => {
        console.error('Error fetching conversation history:', error);
        return throwError(() => new Error('Failed to fetch conversation history'));
      })
    );
  }
}
