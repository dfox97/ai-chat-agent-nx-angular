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
  response: string;
  metadata: ChatMetadata;
}

interface ChatMetadata {
  timestamp: string;
  model: string;
  query: string;
  conversationId: string;
}

// Interface for the data structure received via SSE
export interface StreamedChatResponse {
  content?: string; // Content chunk (optional, might be empty on completion signal)
  error?: string; // Error message (optional)
  metadata: {
    timestamp: string;
    model?: string; // Optional, might not be in every chunk
    conversationId: string;
    isComplete: boolean; // Flag to indicate the end of the stream
  };
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
    console.log('Request payload:', payload);

    // Add explicit headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    return this.http.post<ChatResponse>(this.apiUrl, payload, { headers }).pipe(
      map(response => {
        console.log('API Response received:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error calling Copilot API:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        return throwError(() => new Error('Failed to get response from Copilot'));
      })
    );
  }

  /**
   * Connect to the streaming endpoint and receive messages.
   * @param message The user's message to send.
   * @returns An Observable that emits parsed message chunks from the SSE stream.
   */
  streamMessages(message: string): Observable<StreamedChatResponse> {
    const url = `${environment.apiUrl}/stream?message=${encodeURIComponent(message)}`;

    return new Observable<StreamedChatResponse>((observer) => {
      fetch(url)
        .then(response => {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          const readChunk = () => {
            reader?.read().then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });

              try {
                const parsed = JSON.parse(chunk);
                observer.next(parsed);

                if (parsed.metadata?.isComplete) {
                  observer.complete();
                }
              } catch (err) {
                console.error('Error parsing chunk:', chunk);
                observer.error(err);
              }

              readChunk();
            });
          };

          readChunk();
        })
        .catch((err) => {
          observer.error(err);
        });
    });
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
