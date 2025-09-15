// services/quizzes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Question, QuizInfo, QuizPagedResult } from '../models/quizapi';
import { OfflineStorageService } from './offline-storage.service';

export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface QuizSubmission {
  quizId: string;
  answers: number[];
  timeSpent: number;
  score: number;
  submittedAt: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private readonly API_BASE_URL = 'http://localhost:4000/api';
  private base = `${environment.apiBaseUrl}/api/quizzes`;
  constructor(
    private http: HttpClient,
    private offlineStorage: OfflineStorageService
  ) {}
  // GET /api/quizzes?page=&pageSize=&search=&category=
  list(params?: {
    page?: number;
    pageSize?: number;
    search?: string | null;
    category?: string | null;
  }): Observable<QuizPagedResult> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.category) httpParams = httpParams.set('category', params.category);

    return this.http
      .get<QuizPagedResult>(this.base, { 
        params: httpParams,
        headers: new HttpHeaders({
          'Accept': 'application/json'
        })
      })
      .pipe(
        map(response => {
          console.log('Raw API response:', response);
          return response;
        }),
        catchError(error => {
          console.error('API error details:', error);
          return this.handle(error);
        })
      );
  }

  // GET /api/quizzes/{id}
  getById(id: string): Observable<QuizInfo> {
    return this.http.get<QuizInfo>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  // POST /api/quizzes
  create(quiz: QuizInfo): Observable<QuizInfo> {
    return this.http.post<QuizInfo>(this.base, quiz).pipe(catchError(this.handle));
  }

  // PUT /api/quizzes/{id}
  update(id: string, quiz: QuizInfo): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, quiz).pipe(catchError(this.handle));
  }

  // DELETE /api/quizzes/{id}
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(catchError(this.handle));
  }

  // ---- Question subresources ----

  // POST /api/quizzes/{id}/questions
  addQuestion(quizId: string, question: Question): Observable<void> {
    return this.http
      .post<void>(`${this.base}/${quizId}/questions`, question)
      .pipe(catchError(this.handle));
  }

  // PUT /api/quizzes/{id}/questions/{questionId}
  updateQuestion(quizId: string, questionId: string, question: Question): Observable<void> {
    return this.http
      .put<void>(`${this.base}/${quizId}/questions/${questionId}`, question)
      .pipe(catchError(this.handle));
  }

  // DELETE /api/quizzes/{id}/questions/{questionId}
  removeQuestion(quizId: string, questionId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${quizId}/questions/${questionId}`)
      .pipe(catchError(this.handle));
  }

  private handle(err: any) {
    // Log details to help troubleshoot
    console.error('Error handling details:', {
      status: err.status,
      statusText: err.statusText,
      message: err.message,
      error: err.error
    });
    
    // Optionally map server errors into user-friendly messages
    return throwError(() => err);
  }
  // Generate quiz with Groq API
  generateQuiz(text: string, numQuestions: number = 3): Promise<QuizItem[]> {
    if (!text || !text.trim()) {
      return Promise.reject(new Error('Text is required for quiz generation'));
    }

    const payload = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a quiz generator. Generate exactly ${numQuestions} multiple choice questions from the given text. Return ONLY a JSON array with this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]
The correctAnswer should be the index (0, 1, 2, or 3) of the correct option.`
        },
        {
          role: 'user',
          content: `Generate ${numQuestions} multiple choice questions from this text:\n\n${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.GROQ_API_KEY}`
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      const quizContent = data?.choices?.[0]?.message?.content;
      if (!quizContent) {
        throw new Error('No quiz data returned from Groq API');
      }

      // Extract JSON array from the response
      const jsonMatch = quizContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse quiz JSON from AI response');
      }

      return JSON.parse(jsonMatch[0]) as QuizItem[];
    });
  }

  // Submit quiz with offline support
  submitQuiz(submission: QuizSubmission): Observable<{ success: boolean; message: string }> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No authentication token found'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<{ success: boolean; message: string }>(`${this.API_BASE_URL}/quiz-submissions`, submission, { headers }).pipe(
      catchError((error) => {
        // If offline, save to offline storage
        if (!navigator.onLine || error.status === 0) {
          return this.saveOfflineSubmission(submission, token);
        }
        return throwError(() => error);
      })
    );
  }

   // Save submission offline
   private saveOfflineSubmission(submission: QuizSubmission, token: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      this.offlineStorage.saveOfflineSubmission({
        quizId: submission.quizId,
        answers: submission.answers,
        score: submission.score,
        timeSpent: submission.timeSpent,
        timestamp: Date.now(),
        token,
        data: {
          quizId: submission.quizId,
          answers: submission.answers,
          score: submission.score,
          timeSpent: submission.timeSpent
        }
      }).then(() => {
        observer.next({ success: true, message: 'Submission saved offline' });
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}
