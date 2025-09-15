export interface QuizInfo {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  category: string;
  tags: string[];
  difficulty: string;
  timeLimit?: number;   // nullable in C#
  points: number;
  stats: Stats;
  createdBy: string;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: string;    // DateTime → ISO string in JSON
  updatedAt: string;    // DateTime → ISO string in JSON
  version: number;      // __v in Mongo
}

export interface Question {
  id: string;
  text: string;        // C# "question" → renamed to text
  options: string[];
  correctAnswer: number;
}

export interface Stats {
  totalAttempts: number;
  averageScore: number;
  totalTime: number;
  averageRating: number;
  ratings: number[];
}


export interface QuizPagedResult {
  page: number;
  pageSize: number;
  total: number;
  items: QuizInfo[];
}

