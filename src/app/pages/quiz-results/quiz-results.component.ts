import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuizItem } from '../../services/quizapi.service';

export interface QuizResult {
  quizId: string;
  quizName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number; // in seconds
  answers: number[];
  questions: QuizItem[];
  completedAt: Date;
  pointsEarned: number;
  category: string;
  difficulty: string;
}

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="results-container">
      <div class="results-header">
        <h1>Quiz Results</h1>
        <div class="quiz-info">
          <h2>{{ result.quizName }}</h2>
          <div class="quiz-meta">
            <span class="category">{{ result.category }}</span>
            <span class="difficulty" [class]="'difficulty-' + result.difficulty?.toLowerCase()">
              {{ result.difficulty }}
            </span>
            <span class="completion-time">
              Completed: {{ result.completedAt | date:'short' }}
            </span>
          </div>
        </div>
      </div>

      <div class="score-section">
        <div class="score-circle">
          <div class="score-percentage">{{ result.score }}%</div>
          <div class="score-label">Score</div>
        </div>
        <div class="score-details">
          <div class="score-item">
            <span class="score-value">{{ result.correctAnswers }}</span>
            <span class="score-text">Correct Answers</span>
          </div>
          <div class="score-item">
            <span class="score-value">{{ result.totalQuestions }}</span>
            <span class="score-text">Total Questions</span>
          </div>
          <div class="score-item">
            <span class="score-value">{{ formatTime(result.timeSpent) }}</span>
            <span class="score-text">Time Spent</span>
          </div>
          <div class="score-item">
            <span class="score-value">{{ result.pointsEarned }}</span>
            <span class="score-text">Points Earned</span>
          </div>
        </div>
      </div>

      <div class="performance-section">
        <h3>Performance Analysis</h3>
        <div class="performance-grid">
          <div class="performance-card">
            <div class="performance-icon">🎯</div>
            <div class="performance-content">
              <h4>Accuracy</h4>
              <p>{{ getAccuracyText() }}</p>
            </div>
          </div>
          <div class="performance-card">
            <div class="performance-icon">⚡</div>
            <div class="performance-content">
              <h4>Speed</h4>
              <p>{{ getSpeedText() }}</p>
            </div>
          </div>
          <div class="performance-card">
            <div class="performance-icon">🏆</div>
            <div class="performance-content">
              <h4>Ranking</h4>
              <p>{{ getRankingText() }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="detailed-results">
        <h3>Question Review</h3>
        <div class="questions-list">
          <div *ngFor="let question of result.questions; let i = index" 
               class="question-review"
               [class.correct]="result.answers[i] === question.correctAnswer"
               [class.incorrect]="result.answers[i] !== question.correctAnswer">
            <div class="question-header">
              <span class="question-number">{{ i + 1 }}</span>
              <span class="question-status">
                <span *ngIf="result.answers[i] === question.correctAnswer" class="correct-icon">✓</span>
                <span *ngIf="result.answers[i] !== question.correctAnswer" class="incorrect-icon">✗</span>
              </span>
            </div>
            <div class="question-text">{{ question.question }}</div>
            <div class="options-review">
              <div *ngFor="let option of question.options; let j = index" 
                   class="option-review"
                   [class.selected]="result.answers[i] === j"
                   [class.correct-answer]="j === question.correctAnswer">
                <span class="option-letter">{{ getOptionLetter(j) }}</span>
                <span class="option-text">{{ option }}</span>
                <span *ngIf="j === question.correctAnswer" class="correct-badge">Correct</span>
                <span *ngIf="result.answers[i] === j && j !== question.correctAnswer" class="your-answer">Your Answer</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <button class="btn btn-primary" (click)="retakeQuiz()">Retake Quiz</button>
        <button class="btn btn-secondary" (click)="goToQuizzes()">Back to Quizzes</button>
        <button class="btn btn-outline" (click)="shareResults()">Share Results</button>
      </div>
    </div>
  `,
  styles: [`
    .results-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }

    .results-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .results-header h1 {
      font-size: 3rem;
      color: #ffd700;
      margin-bottom: 1rem;
      text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
    }

    .quiz-info h2 {
      font-size: 1.5rem;
      color: #f5f5f5;
      margin-bottom: 1rem;
    }

    .quiz-meta {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .category, .difficulty, .completion-time {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .category {
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #000;
    }

    .difficulty-easy {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
    }

    .difficulty-medium {
      background: linear-gradient(135deg, #ffc107, #fd7e14);
      color: #000;
    }

    .difficulty-hard {
      background: linear-gradient(135deg, #dc3545, #e83e8c);
      color: white;
    }

    .completion-time {
      background: rgba(255, 215, 0, 0.2);
      color: #ffd700;
      border: 1px solid rgba(255, 215, 0, 0.3);
    }

    .score-section {
      display: flex;
      align-items: center;
      gap: 3rem;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
      border-radius: 20px;
      border: 1px solid #ffd700;
    }

    .score-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #000;
      font-weight: 700;
    }

    .score-percentage {
      font-size: 3rem;
      line-height: 1;
    }

    .score-label {
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .score-details {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
    }

    .score-item {
      text-align: center;
    }

    .score-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: #ffd700;
      margin-bottom: 0.5rem;
    }

    .score-text {
      color: #ccc;
      font-size: 0.9rem;
    }

    .performance-section {
      margin-bottom: 3rem;
    }

    .performance-section h3 {
      color: #ffd700;
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .performance-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
      border-radius: 12px;
      border: 1px solid #333;
    }

    .performance-icon {
      font-size: 2rem;
    }

    .performance-content h4 {
      color: #ffd700;
      margin-bottom: 0.5rem;
    }

    .performance-content p {
      color: #ccc;
      margin: 0;
    }

    .detailed-results {
      margin-bottom: 3rem;
    }

    .detailed-results h3 {
      color: #ffd700;
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .question-review {
      padding: 1.5rem;
      border-radius: 12px;
      border: 2px solid #333;
      transition: all 0.3s ease;
    }

    .question-review.correct {
      border-color: #28a745;
      background: rgba(40, 167, 69, 0.1);
    }

    .question-review.incorrect {
      border-color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
    }

    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .question-number {
      background: #ffd700;
      color: #000;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .question-status {
      font-size: 1.5rem;
    }

    .correct-icon {
      color: #28a745;
    }

    .incorrect-icon {
      color: #dc3545;
    }

    .question-text {
      color: #f5f5f5;
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }

    .options-review {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .option-review {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;
    }

    .option-review.selected {
      background: rgba(255, 215, 0, 0.2);
      border: 1px solid #ffd700;
    }

    .option-review.correct-answer {
      background: rgba(40, 167, 69, 0.2);
      border: 1px solid #28a745;
    }

    .option-letter {
      background: #333;
      color: #fff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .option-review.correct-answer .option-letter {
      background: #28a745;
    }

    .option-text {
      flex: 1;
      color: #f5f5f5;
    }

    .correct-badge, .your-answer {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .correct-badge {
      background: #28a745;
      color: white;
    }

    .your-answer {
      background: #ffc107;
      color: #000;
    }

    .actions-section {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
      text-align: center;
    }

    .btn-primary {
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #000;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #ffed4e, #ffd700);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(255, 215, 0, 0.3);
    }

    .btn-secondary {
      background: linear-gradient(135deg, #6c757d, #5a6268);
      color: white;
    }

    .btn-secondary:hover {
      background: linear-gradient(135deg, #5a6268, #495057);
      transform: translateY(-2px);
    }

    .btn-outline {
      background: transparent;
      color: #ffd700;
      border: 2px solid #ffd700;
    }

    .btn-outline:hover {
      background: #ffd700;
      color: #000;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .results-container {
        padding: 1rem;
      }

      .score-section {
        flex-direction: column;
        text-align: center;
        gap: 2rem;
      }

      .score-details {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .performance-grid {
        grid-template-columns: 1fr;
      }

      .actions-section {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class QuizResultsComponent {
  @Input() result!: QuizResult;

  getOptionLetter(index: number): string {
    return String.fromCharCode(97 + index);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getAccuracyText(): string {
    if (this.result.score >= 90) return 'Excellent! Outstanding performance.';
    if (this.result.score >= 80) return 'Great job! Well done.';
    if (this.result.score >= 70) return 'Good work! Keep it up.';
    if (this.result.score >= 60) return 'Not bad! Room for improvement.';
    return 'Keep practicing! You can do better.';
  }

  getSpeedText(): string {
    const avgTimePerQuestion = this.result.timeSpent / this.result.totalQuestions;
    if (avgTimePerQuestion <= 30) return 'Lightning fast! ⚡';
    if (avgTimePerQuestion <= 60) return 'Quick thinking! 🧠';
    if (avgTimePerQuestion <= 120) return 'Steady pace! 🚶';
    return 'Thoughtful approach! 🤔';
  }

  getRankingText(): string {
    if (this.result.score >= 95) return 'Master Level! 🏆';
    if (this.result.score >= 85) return 'Expert Level! 🥇';
    if (this.result.score >= 75) return 'Advanced Level! 🥈';
    if (this.result.score >= 65) return 'Intermediate Level! 🥉';
    return 'Beginner Level! 🌱';
  }

  retakeQuiz(): void {
    // Navigate back to take quiz with same quiz selected
    // This would be implemented based on your routing needs
  }

  goToQuizzes(): void {
    // Navigate to quiz selection
    // This would be implemented based on your routing needs
  }

  shareResults(): void {
    // Implement sharing functionality
    const shareText = `I just scored ${this.result.score}% on "${this.result.quizName}"! Can you beat my score?`;
    if (navigator.share) {
      navigator.share({
        title: 'QuizMaster Results',
        text: shareText,
        url: window.location.href
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
  }
}
