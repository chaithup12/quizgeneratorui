/* import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { OfflineStorageService } from './offline-storage.service';

export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  _id?: string;
  name: string;
  description?: string;
  questions: QuizItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  isPublic?: boolean;
  category?: string;
  difficulty?: string;
  timeLimit?: number;
  tags?: string[];
  points?: number;
}

export interface QuizSubmission {
  quizId: string;
  answers: number[];
  timeSpent: number;
  score: number;
  submittedAt: string;
  userId?: string;
}

export interface QuizResponse {
  success: boolean;
  quiz: QuizItem[];
  generatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuizApiService {
  private readonly API_BASE_URL = 'http://localhost:4000/api';
  private quizzesSubject = new BehaviorSubject<Quiz[]>([]);
  public quizzes$ = this.quizzesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private offlineStorage: OfflineStorageService
  ) {}

  // Generate quiz using Groq AI
  generateQuiz(text: string, numQuestions: number = 3): Observable<QuizItem[]> {
    return this.http.post<QuizResponse>(`${this.API_BASE_URL}/generate-quiz`, {
      text,
      numQuestions
    }).pipe(
      map(response => response.quiz)
    );
  }

  // Get all quizzes
  getAllQuizzes(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.API_BASE_URL}/quizzes`).pipe(
      tap(quizzes => this.quizzesSubject.next(quizzes))
    );
  }

  // Get a specific quiz by ID
  getQuizById(id: string): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.API_BASE_URL}/quizzes/${id}`);
  }

  // Create a new quiz
  createQuiz(quiz: Omit<Quiz, '_id'>): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.API_BASE_URL}/quizzes`, quiz).pipe(
      tap(newQuiz => {
        const currentQuizzes = this.quizzesSubject.value;
        this.quizzesSubject.next([newQuiz, ...currentQuizzes]);
      })
    );
  }

  // Update an existing quiz
  updateQuiz(id: string, quiz: Partial<Quiz>): Observable<Quiz> {
    return this.http.put<Quiz>(`${this.API_BASE_URL}/quizzes/${id}`, quiz).pipe(
      tap(updatedQuiz => {
        const currentQuizzes = this.quizzesSubject.value;
        const index = currentQuizzes.findIndex(q => q._id === id);
        if (index !== -1) {
          currentQuizzes[index] = updatedQuiz;
          this.quizzesSubject.next([...currentQuizzes]);
        }
      })
    );
  }

  // Delete a quiz
  deleteQuiz(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_BASE_URL}/quizzes/${id}`).pipe(
      tap(() => {
        const currentQuizzes = this.quizzesSubject.value;
        const filteredQuizzes = currentQuizzes.filter(q => q._id !== id);
        this.quizzesSubject.next(filteredQuizzes);
      })
    );
  }

  // Search quizzes
  searchQuizzes(query: string): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.API_BASE_URL}/quizzes/search/${encodeURIComponent(query)}`);
  }

  // Health check
  healthCheck(): Observable<{ status: string; mongodb: string }> {
    return this.http.get<{ status: string; mongodb: string }>(`${this.API_BASE_URL}/health`);
  }

  // Save quiz with auto-generated name
  saveQuiz(questions: QuizItem[], customName?: string): Observable<Quiz> {
    const quizName = customName || `Quiz ${new Date().toLocaleDateString()} - ${questions[0]?.question?.substring(0, 30) || 'Generated Quiz'}...`;
    
    const quizData: Omit<Quiz, '_id'> = {
      name: quizName,
      description: `Generated on ${new Date().toLocaleString()}`,
      questions,
      createdBy: 'user',
      isPublic: true
    };

    return this.createQuiz(quizData);
  }

  // Get current quizzes from subject
  getCurrentQuizzes(): Quiz[] {
    return this.quizzesSubject.value;
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

  // Get offline quizzes
  getOfflineQuizzes(): Observable<Quiz[]> {
    return this.offlineStorage.offlineQuizzes$.pipe(
      map(offlineQuizzes => offlineQuizzes.map(offlineQuiz => ({
        _id: offlineQuiz.id,
        name: offlineQuiz.name,
        description: offlineQuiz.description,
        questions: offlineQuiz.questions,
        category: offlineQuiz.category,
        difficulty: offlineQuiz.difficulty,
        timeLimit: offlineQuiz.timeLimit,
        createdAt: new Date(offlineQuiz.timestamp).toISOString(),
        createdBy: 'offline',
        isPublic: true
      } as Quiz)))
    );
  }

  // Save quiz offline
  saveQuizOffline(quiz: Omit<Quiz, '_id'>): Observable<string> {
    return new Observable(observer => {
      const offlineQuiz = {
        name: quiz.name,
        description: quiz.description || '',
        questions: quiz.questions,
        category: quiz.category || 'general',
        difficulty: quiz.difficulty || 'medium',
        timeLimit: quiz.timeLimit || 0,
        timestamp: Date.now()
      };
      
      this.offlineStorage.saveOfflineQuiz(offlineQuiz).then(id => {
        observer.next(id);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  // Create quiz with offline support
  createQuizWithOfflineSupport(quiz: Omit<Quiz, '_id'>): Observable<Quiz> {
    return this.createQuiz(quiz).pipe(
      catchError((error) => {
        // If offline, save to offline storage
        if (!navigator.onLine || error.status === 0) {
          return this.saveQuizOffline(quiz).pipe(
            map(id => ({ ...quiz, _id: id } as Quiz))
          );
        }
        return throwError(() => error);
      })
    );
  }

  // Get quiz with offline fallback
  getQuizWithOfflineFallback(id: string): Observable<Quiz> {
    return this.getQuizById(id).pipe(
      catchError((error) => {
        // If offline or quiz not found, try offline storage
        if (!navigator.onLine || error.status === 404) {
          return new Observable<Quiz>(observer => {
            this.offlineStorage.getOfflineQuiz(id).then(quiz => {
              if (quiz) {
                const convertedQuiz: Quiz = {
                  _id: quiz.id,
                  name: quiz.name,
                  description: quiz.description,
                  questions: quiz.questions,
                  category: quiz.category,
                  difficulty: quiz.difficulty,
                  timeLimit: quiz.timeLimit,
                  createdAt: new Date(quiz.timestamp).toISOString(),
                  createdBy: 'offline',
                  isPublic: true
                };
                observer.next(convertedQuiz);
                observer.complete();
              } else {
                observer.error(new Error('Quiz not found'));
              }
            }).catch(err => observer.error(err));
          });
        }
        return throwError(() => error);
      })
    );
  }

  // Sync offline data
  async syncOfflineData(): Promise<void> {
    await this.offlineStorage.syncOfflineData();
  }
}
 */