// src/app/admin/results/[resultId]/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from "firebase/firestore";
import { ref, get as getRtdb } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AdminPageLoadingSkeleton } from "@/components/AdminPageLoadingSkeleton";
import { AlertTriangle, Check, X, FileDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Interface for detailed answer analysis
interface AnswerDetail {
  question: string;
  userAnswer: string | string[] | null;
  correctAnswer: string | string[];
  isCorrect: boolean;
}

// Interface for the result document from Firestore
interface ResultDoc {
    userId: string;
    userName: string;
    quizId: string;
    score: number;
    assessmentScore: number;
    answers: { [questionId: string]: string | string[] };
    finishedAt: { seconds: number };
    totalQuestions: number;
    timeTaken: number;
}

// Function to convert data to CSV format
const convertToCSV = (data: AnswerDetail[], resultInfo: ResultDoc | null) => {
  const headers = ["#", "Question", "User's Answer", "Correct Answer", "Result"];
  const rows = data.map((d, index) => {
    // Sanitize and format each cell
    const question = `"${(d.question || '').replace(/"/g, '""')}"`;
    const userAnswer = `"${(d.userAnswer ? (Array.isArray(d.userAnswer) ? d.userAnswer.join(', ') : String(d.userAnswer)) : 'Blank').replace(/"/g, '""')}"`;
    const correctAnswer = `"${(Array.isArray(d.correctAnswer) ? d.correctAnswer.join(', ') : String(d.correctAnswer)).replace(/"/g, '""')}"`;
    const result = d.isCorrect ? "Correct" : "Incorrect";

    return [index + 1, question, userAnswer, correctAnswer, result].join(',');
  });

  // Add a summary header to the CSV
  const summary = [
      `Quiz Report for: ${resultInfo?.userName || 'N/A'}`,
      `Quiz ID: ${resultInfo?.quizId || 'N/A'}`,
      `Final Score: ${resultInfo?.score || 0} / ${resultInfo?.totalQuestions || 0}`,
      `Assessment Score: ${resultInfo?.assessmentScore || 0}`,
      `Date Completed: ${resultInfo ? new Date(resultInfo.finishedAt.seconds * 1000).toLocaleString() : 'N/A'}`
  ];
  const summaryCsv = summary.map(line => `"${line}"`).join('\n');

  return `${summaryCsv}\n\n${headers.join(',')}\n${rows.join('\n')}`;
};

function ResultDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const resultId = params.resultId as string;

  const [details, setDetails] = useState<AnswerDetail[]>([]);
  const [resultInfo, setResultInfo] = useState<ResultDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reportStats, setReportStats] = useState({
    answered: 0,
    unanswered: 0,
    correct: 0,
    incorrect: 0,
  });

  const fetchResultDetails = useCallback(async () => {
    if (!resultId) return;

    setIsLoading(true);
    setError(null);

    try {
      const resultDocRef = doc(db, "quizResults", resultId);
      const resultDocSnap = await getDoc(resultDocRef);

      if (!resultDocSnap.exists()) {
        throw new Error("Result not found.");
      }
      const resultData = resultDocSnap.data() as ResultDoc;
      setResultInfo(resultData);

      const quizRef = ref(rtdb, `quizzes/${resultData.quizId}/questions`);
      const quizSnapshot = await getRtdb(quizRef);
      if (!quizSnapshot.exists()) {
        throw new Error("Quiz data could not be found.");
      }
      const questionsData = quizSnapshot.val();

      const userProgressRef = ref(rtdb, `userProgress/${resultData.userId}/${resultData.quizId}/answers`);
      const userProgressSnapshot = await getRtdb(userProgressRef);
      const userAnswersData = userProgressSnapshot.val() || {};

      let answeredCount = 0;
      let correctCount = 0;

      const detailedAnalysis: AnswerDetail[] = Object.keys(questionsData).map(
        (questionId, index) => {
          const question = questionsData[questionId];
          const userAnswer = userAnswersData?.[index] ?? null;
          const correctAnswer = question.correctAnswer;
          
          const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);

          if (userAnswer !== null) {
            answeredCount++;
          }
          if (isCorrect) {
            correctCount++;
          }

          return {
            question: question.question,
            userAnswer,
            correctAnswer,
            isCorrect,
          };
        }
      );
      setDetails(detailedAnalysis);
      setReportStats({
        answered: answeredCount,
        unanswered: resultData.totalQuestions - answeredCount,
        correct: correctCount,
        incorrect: answeredCount - correctCount,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    fetchResultDetails();
  }, [fetchResultDetails]);

  const handleExport = () => {
    if (!details.length) {
        console.warn("No details available to export.");
        return;
    }
    const csvData = convertToCSV(details, resultInfo);
    const filename = `quiz-report-${resultInfo?.quizId || 'quiz'}-${resultInfo?.userName || 'user'}.csv`;
    
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  const renderAnswer = (answer: string | string[] | null) => {
    if (answer === null) {
      return <span className="text-muted-foreground italic">Blank</span>;
    }
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return answer;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h1 className="text-3xl font-bold text-center sm:text-left">
          Quiz Result Details
        </h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isLoading || details.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
            <Link href="/admin/results" className={cn(buttonVariants({ variant: "outline" }))}>
             &larr; Back to All Results
            </Link>
        </div>
      </div>

      {isLoading && <AdminPageLoadingSkeleton />}
      {error && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && resultInfo && (
        <>
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <p className="text-sm text-muted-foreground">User</p>
                        <p className="text-2xl font-bold">{resultInfo.userName}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                        <p className="text-sm text-muted-foreground">Final Score</p>
                        <p className="text-2xl font-bold">{resultInfo.score} / {resultInfo.totalQuestions}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900">
                        <p className="text-sm text-muted-foreground">Assessment Score</p>
                        <p className="text-2xl font-bold">{resultInfo.assessmentScore}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900">
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="text-xl font-bold">{new Date(resultInfo.finishedAt.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900">
                        <p className="text-sm text-muted-foreground">Time Taken</p>
                        <p className="text-2xl font-bold">{Math.floor(resultInfo.timeTaken / 60)}m {resultInfo.timeTaken % 60}s</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Report Stats</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <p className="text-sm text-muted-foreground">Answered</p>
                        <p className="text-2xl font-bold">{reportStats.answered}</p>
                    </div>
                     <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <p className="text-sm text-muted-foreground">Unanswered</p>
                        <p className="text-2xl font-bold">{reportStats.unanswered}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900">
                        <p className="text-sm text-muted-foreground">Correct</p>
                        <p className="text-2xl font-bold">{reportStats.correct}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900">
                        <p className="text-sm text-muted-foreground">Incorrect</p>
                        <p className="text-2xl font-bold">{reportStats.incorrect}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Your Answer</TableHead>
                    <TableHead>Correct Answer</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((d, index) => (
                    <TableRow key={index} className={d.isCorrect ? 'bg-green-500/10' : 'bg-red-500/10'}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{d.question}</TableCell>
                      <TableCell>{renderAnswer(d.userAnswer)}</TableCell>
                      <TableCell>{renderAnswer(d.correctAnswer)}</TableCell>
                      <TableCell className="text-center">
                        {d.isCorrect ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}


export default function ResultDetailPage() {
    return (
        <Suspense fallback={<AdminPageLoadingSkeleton />}>
            <ResultDetailPageContent />
        </Suspense>
    );
}
