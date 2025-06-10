import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, throwError, startWith, map } from "rxjs";
import { environment } from "src/environment";
import { AgentResponse } from "../app/chat-window/chat-window.component";

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
  response: AgentResponse;
  metadata: ChatMetadata;
}

interface ChatMetadata {
  timestamp: string;
  model: string;
  query: string;
  conversationId: string;
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
   */
  sendMessage(message: string): Observable<ChatResponse> {
    console.log('Sending message to API:', message);
    console.log('API URL:', this.apiUrl);

    // Create a simple test message object
    const payload = { message };

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
      catchError(error => {
        console.error('Error calling Copilot API:', error);
        return throwError(() => new Error('Failed to get response from Copilot'));
      })
    );
  }


//   /**
//    * Get conversation history
//    * @param conversationId The conversation ID
//    */
//   getConversationHistory(conversationId: string): Observable<ChatResponse[]> {
//     return this.http.get<ChatResponse[]>(`${this.apiUrl}/history/${conversationId}`).pipe(
//       map(responses => responses.map(response => ({
//         ...response,
//         timestamp: new Date(response.timestamp)
//       }))),
//       catchError(error => {
//         console.error('Error fetching conversation history:', error);
//         return throwError(() => new Error('Failed to fetch conversation history'));
//       })
//     );
//   }
}
