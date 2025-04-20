import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, map, catchError, throwError, of } from "rxjs";
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
    // Construct the URL with the message as a query parameter
    const url = `${environment.apiUrl}/stream?message=${encodeURIComponent(message)}`;
    console.log('Connecting to SSE stream:', url);

    return new Observable<StreamedChatResponse>((observer) => {
      // Create an EventSource instance
      const eventSource = new EventSource(url);

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        // console.log('SSE message received:', event.data);
        try {
          const parsedData: StreamedChatResponse = JSON.parse(event.data);
          observer.next(parsedData);

          // Check if the stream is complete
          if (parsedData.metadata?.isComplete) {
            console.log('SSE stream complete.');
            observer.complete();
            eventSource.close(); // Close the connection
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
          observer.error(new Error('Failed to parse message from stream'));

          eventSource.close(); // Close connection on parse error
        }
      };

      // Handle errors
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        // Don't close the stream immediately on typical EventSource errors,
        // as it might try to reconnect. However, signal an error to the subscriber.
        // If it's a persistent error, the EventSource might close itself.
        // We might need more sophisticated error handling depending on the specific errors.
        observer.error(new Error('Stream connection error'));
        // Consider closing based on error type or after retries fail
        eventSource.close(); // Close on error for now
      };

      // Return a teardown function to close the EventSource when the Observable is unsubscribed
      return () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          console.log('Closing SSE stream due to unsubscription.');
          eventSource.close();
        }
      };
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
