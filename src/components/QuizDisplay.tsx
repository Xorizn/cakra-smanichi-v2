// src/components/QuizDisplay.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import QuestionCard from "./QuestionCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { db, rtdb } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  query,
  where,
  getDocs as getFirestoreDocs,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  get,
  child,
  set as rtdbSet,
  remove as rtdbRemove,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Ban,
  ShieldAlert,
} from "lucide-react"; // Added ShieldAlert
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// --- Types ---
interface Question {
  id: string | number;
  text: string;
  options: string[];
  correctAnswer: string;
}
interface QuizMetadata {
  name?: string;
  description?: string;
  durationMinutes?: number;
  startTimeISO?: string;
  isPublic?: boolean; // Visibility flag
}
type UserAnswers = { [questionIndex: number]: string };
// --- End Types ---

const DEFAULT_QUIZ_DURATION_MINUTES = 60;

const convertToHongKongTime = (date: Date | number): Date => {
  const d = typeof date === "number" ? new Date(date) : new Date(date);

  // Create date string in ISO format with Hong Kong UTC+8 offset
  const hongKongDate = new Date(
    d.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" })
  );
  return hongKongDate;
};

const getHongKongNow = (): number => {
  return convertToHongKongTime(new Date()).getTime();
};

const formatHongKongTimeForDisplay = (
  isoString: string | undefined
): string => {
  if (!isoString) return "Any time";
  try {
    // Create a date object from the ISO string
    const date = new Date(isoString);

    // Format it specifically for Hong Kong timezone
    return (
      date.toLocaleString("en-US", {
        timeZone: "Asia/Hong_Kong",
        dateStyle: "medium",
        timeStyle: "short",
        hour12: true,
      }) + " (UTC+8 Hong Kong)"
    );
  } catch (e) {
    return "Invalid Date";
  }
};

const formatStartTimeForDisplay = (isoString: string | undefined): string => {
  return formatHongKongTimeForDisplay(isoString);
};
function QuizDisplayContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuizType = searchParams.get("type");
  const quizType = rawQuizType ? rawQuizType.split("?")[0] : null;

  // State declarations...
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizMetadata, setQuizMetadata] = useState<QuizMetadata | null>(null);
  const [quizDurationMinutes, setQuizDurationMinutes] = useState(
    DEFAULT_QUIZ_DURATION_MINUTES
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizAlreadyCompleted, setQuizAlreadyCompleted] =
    useState<boolean>(false);
  const [finalScoreData, setFinalScoreData] = useState<{
    score: number;
    total: number;
  } | null>(null);
  const [isQuizNotStarted, setIsQuizNotStarted] = useState<boolean>(false);
  const [isQuizPrivate, setIsQuizPrivate] = useState<boolean>(false); // State for private quiz check

  const isLastQuestion =
    questions.length > 0 && currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // --- Check Completion, Load Progress, Metadata & Questions ---
  const checkCompletionAndFetch = useCallback(
    async (type: string, userId: string) => {
      setIsLoading(true);
      setError(null);
      setQuizAlreadyCompleted(false);
      setIsQuizNotStarted(false);
      setIsQuizPrivate(false); // Reset states
      setQuestions([]);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setQuizSubmitted(false);
      setQuizStartTime(null);
      setTimeLeft(null);
      setQuizDurationMinutes(DEFAULT_QUIZ_DURATION_MINUTES);
      setQuizMetadata(null);

      try {
        // 1. Check MAIN quizResults collection for existing entry
        const resultsQuery = query(
          collection(db, "quizResults"),
          where("quizId", "==", type),
          where("userId", "==", userId),
          limit(1)
        );
        const querySnapshot = await getFirestoreDocs(resultsQuery);
        if (!querySnapshot.empty) {
          setQuizAlreadyCompleted(true);
          const d = querySnapshot.docs[0].data();
          setFinalScoreData({ score: d.score, total: d.totalQuestions });
          setIsLoading(false);
          return;
        }

        // 2. Fetch Quiz Metadata (duration, startTimeISO, isPublic)
        const metadataRef = ref(rtdb, `quizzes/${type}/metadata`);
        const metadataSnapshot = await get(metadataRef);
        let fetchedMetadata: QuizMetadata = {};
        let duration = DEFAULT_QUIZ_DURATION_MINUTES;
        let startTimeISO: string | undefined = undefined;
        let isPublic = true; // Default to public if not specified
        if (metadataSnapshot.exists()) {
          fetchedMetadata = metadataSnapshot.val();
          setQuizMetadata(fetchedMetadata);
          if (fetchedMetadata?.durationMinutes > 0)
            duration = fetchedMetadata.durationMinutes;
          if (fetchedMetadata?.startTimeISO)
            startTimeISO = fetchedMetadata.startTimeISO;
          // Explicitly check if isPublic is false. Undefined or true means public.
          if (fetchedMetadata?.isPublic === false) {
            isPublic = false;
          }
        } else {
          // If metadata node doesn't exist, treat as non-existent/private for safety?
          // Or assume public? Let's assume public for now, but fetch questions will fail later anyway.
          console.warn(`Metadata not found for quiz type: ${type}`);
        }
        setQuizDurationMinutes(duration);
        setTimeLeft(duration * 60);
        console.log(
          `Quiz duration: ${duration} min, Start: ${
            startTimeISO || "Any"
          }, Public: ${isPublic}`
        );

        // *** ADDED CHECK ***: Check if the quiz is private
        if (!isPublic) {
          console.log("Quiz is private. Access denied.");
          setIsQuizPrivate(true); // Set state to show private message
          setError("This quiz is marked as private and cannot be accessed.");
          setIsLoading(false);
          return; // Stop further loading
        }
        // *** END ADDED CHECK ***
        
        // 3. Check Start Time (only if public)
        if (startTimeISO) {
          try {
            // Parse the scheduled start time from ISO
            const scheduledStartTime = new Date(startTimeISO).getTime();

            // Get current time in Hong Kong timezone
            const hongKongNow = getHongKongNow();

            if (hongKongNow < scheduledStartTime) {
              setIsQuizNotStarted(true);
              setError(
                `Starts at: ${formatHongKongTimeForDisplay(startTimeISO)}`
              );
              setIsLoading(false);
              return;
            }
          } catch (dateError) {
            setError("Invalid start time configured.");
          }
        }

        // 4. Load RTDB progress (if public and started)
        const rtdbProgressRef = ref(rtdb, `userProgress/${userId}/${type}`);
        const progressSnapshot = await get(rtdbProgressRef);
        let loadedStartTime: number | null = null;
        if (progressSnapshot.exists()) {
          const progressData = progressSnapshot.val();
          if (progressData?.answers) setUserAnswers(progressData.answers);
          if (progressData?.startTime) {
            loadedStartTime = progressData.startTime;
            setQuizStartTime(loadedStartTime);
            const elapsed = Math.floor((Date.now() - loadedStartTime) / 1000);
            setTimeLeft(Math.max(0, duration * 60 - elapsed));
          }
        }

        // 5. Fetch questions
        const rtdbQuestionsRef = ref(rtdb, `quizzes/${type}/questions`);
        const questionSnapshot = await get(rtdbQuestionsRef);
        if (!questionSnapshot.exists())
          throw new Error(`Questions not found for quiz "${type}".`);
        const data = questionSnapshot.val();
        let fetchedQs: Question[] = [];
        if (Array.isArray(data)) {
          fetchedQs = data
            .map((q, i) => (q ? { ...q, _key: String(i) } : null))
            .filter((q): q is Question => q !== null);
        } else if (typeof data === "object" && data !== null) {
          fetchedQs = Object.entries(data).map(([k, v]) => ({
            ...(v as QuestionData),
            _key: k,
          }));
        }
        if (fetchedQs.length === 0)
          throw new Error(`Quiz "${type}" has no questions.`);
        setQuestions(fetchedQs);

        // 6. Set start time if not loaded
        if (!loadedStartTime) {
          const startTimeRef = ref(
            rtdb,
            `userProgress/${userId}/${type}/startTime`
          );
          await rtdbSet(startTimeRef, rtdbServerTimestamp());
          const writtenTime = await get(startTimeRef).then((snap) =>
            snap.val()
          );
          setQuizStartTime(writtenTime || Date.now());
          setTimeLeft(duration * 60);
        }
      } catch (err) {
        console.error("Error in checkCompletionAndFetch: ", err);
        const msg = err instanceof Error ? err.message : "Could not load quiz.";
        if (!isQuizNotStarted && !isQuizPrivate) {
          // Avoid overwriting specific errors
          setError(msg);
          toast({
            title: "Error Loading Quiz",
            description: msg,
            variant: "destructive",
          });
        }
      } finally {
        if (!quizAlreadyCompleted && !isQuizNotStarted && !isQuizPrivate) {
          setIsLoading(false);
        }
      }
    },
    [toast, isQuizNotStarted, isQuizPrivate]
  ); // Added isQuizPrivate

  useEffect(() => {
    if (!user) {
      setError("Please log in.");
      setIsLoading(false);
      return;
    }
    if (quizType) {
      checkCompletionAndFetch(quizType, user.uid);
    } else {
      setError("No quiz type specified.");
      setIsLoading(false);
    }
  }, [quizType, user, checkCompletionAndFetch]);
  // --- End Check/Fetch/Load Progress ---

  useEffect(() => {
    // Disable right-click
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Disable text selection
    document.addEventListener("selectstart", (e) => e.preventDefault());

    // Disable copy
    document.addEventListener("copy", (e) => e.preventDefault());

    // Disable DevTools (basic F12)
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U") // view source
      ) {
        e.preventDefault();
      }
    });
  }, []);

  // --- Answer Saving ---
  const handleAnswerSelect = useCallback(
    (index: number, answer: string) => {
      // Add isQuizPrivate check
      if (
        quizSubmitted ||
        quizAlreadyCompleted ||
        !user ||
        !quizType ||
        isLoading ||
        isQuizNotStarted ||
        isQuizPrivate
      )
        return;
      const updated = { ...userAnswers, [index]: answer };
      setUserAnswers(updated);
      rtdbSet(
        ref(rtdb, `userProgress/${user.uid}/${quizType}/answers/${index}`),
        answer
      ).catch((err) => console.error(`Failed save Q${index}:`, err));
    },
    [
      user,
      quizType,
      isLoading,
      quizSubmitted,
      quizAlreadyCompleted,
      userAnswers,
      isQuizNotStarted,
      isQuizPrivate,
    ]
  ); // Added isQuizPrivate
  // --- End Answer Saving ---

  // --- Submission Logic (Unchanged) ---
  const handleSubmit = useCallback(async () => {
    // Add isQuizPrivate check just in case
    if (!quizType || !user || quizSubmitted || isLoading || isQuizPrivate)
      return;
    setIsSubmitting(true);
    setQuizSubmitted(true);
    const finishTime = Date.now();
    const timeTaken = Math.floor(
      (finishTime - (quizStartTime ?? finishTime)) / 1000
    );
    let score = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) score++;
    });
    setFinalScoreData({ score: score, total: questions.length });
    const resultDataForRanking = {
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous",
      quizId: quizType,
      score: score,
      totalQuestions: questions.length,
      timeTaken: timeTaken,
      finishedAt: Timestamp.fromMillis(finishTime),
    };
    try {
      const rankingResultRef = doc(
        collection(db, "quizResults"),
        `${quizType}_${user.uid}_${resultDataForRanking.finishedAt.toMillis()}`
      );
      await setDoc(rankingResultRef, resultDataForRanking);
      const progressRef = ref(rtdb, `userProgress/${user.uid}/${quizType}`);
      await rtdbRemove(progressRef);
      toast({
        title: "Quiz Submitted!",
        description: `Score: ${score}/${questions.length}`,
      });
    } catch (error) {
      /* ... error handling ... */
      console.error("Error submitting results: ", error);
      toast({
        title: "Submission Failed",
        description: "Could not save results.",
        variant: "destructive",
      });
      setQuizSubmitted(false);
      setFinalScoreData(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    questions,
    userAnswers,
    quizStartTime,
    quizType,
    toast,
    router,
    quizSubmitted,
    isLoading,
    isQuizPrivate,
  ]); // Added isQuizPrivate
  // --- End Submission Logic ---

  // --- Timer Logic ---
  useEffect(() => {
    // Add isQuizPrivate check
    if (
      !quizStartTime ||
      isLoading ||
      quizSubmitted ||
      error ||
      quizAlreadyCompleted ||
      timeLeft === null ||
      isQuizNotStarted ||
      isQuizPrivate
    )
      return;
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
      const remaining = quizDurationMinutes * 60 - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(timerInterval);
        if (!quizSubmitted && !isSubmitting) {
          toast({ title: "Time's Up!", variant: "destructive" });
          handleSubmit();
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [
    quizStartTime,
    isLoading,
    quizSubmitted,
    error,
    handleSubmit,
    quizAlreadyCompleted,
    quizDurationMinutes,
    isSubmitting,
    timeLeft,
    isQuizNotStarted,
    isQuizPrivate,
  ]); // Added isQuizPrivate
  // --- End Timer Logic ---

  // --- Navigation (Unchanged) ---
  const handleNextQuestion = () => {
    if (!isLastQuestion) setCurrentQuestionIndex((i) => i + 1);
  };
  const handlePreviousQuestion = () => {
    if (!isFirstQuestion) setCurrentQuestionIndex((i) => i - 1);
  };
  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };
  // --- End Navigation ---

  // --- Rendering Logic ---
  if (isLoading) {
    return <QuizLoadingSkeleton />;
  }
  if (quizAlreadyCompleted) {
    /* ... Already Completed JSX ... */
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-md bg-blue-100/50 dark:bg-blue-900/50 max-w-lg mx-auto">
        <Ban className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold">Quiz Already Completed</h2>
        <p>You have already submitted the "{quizType || "this"}" quiz.</p>
        {finalScoreData && (
          <p>
            Your score was: {finalScoreData.score} / {finalScoreData.total}
          </p>
        )}
        <Button onClick={() => router.push("/")} variant="outline">
          Go Home
        </Button>
        <Link
          href={`/ranking?type=${quizType}`}
          className={cn(
            buttonVariants({ variant: "link" }),
            "text-blue-600 dark:text-blue-400"
          )}
        >
          View Ranking
        </Link>
      </div>
    );
  }
  // Handle Private Quiz
  if (isQuizPrivate) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-md bg-red-100/50 dark:bg-red-900/50 max-w-lg mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p>{error || `This quiz is marked as private.`}</p>
        <Button onClick={() => router.push("/")} variant="outline">
          Go Home
        </Button>
      </div>
    );
  }
  // Handle Quiz Not Started Yet
  if (isQuizNotStarted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-md bg-amber-100/50 dark:bg-amber-900/50 max-w-lg mx-auto">
        <Clock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
        <h2 className="text-xl font-semibold">Quiz Not Started</h2>
        <p>{error || `This quiz is scheduled to start later.`}</p>
        <Button onClick={() => router.push("/")} variant="outline">
          Go Home
        </Button>
      </div>
    );
  }
  if (error) {
    /* ... Other Error JSX ... */
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-md bg-destructive/10 text-destructive max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12" />
        <h2 className="text-xl font-semibold">Error Loading Quiz</h2>
        <p>{error}</p>
        <Button onClick={() => router.push("/")} variant="destructive">
          Go Home
        </Button>
      </div>
    );
  }
  if (!questions || questions.length === 0) {
    return <p className="text-center text-orange-500">No questions found.</p>;
  }

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const currentQuestion = questions[currentQuestionIndex];
  const displayScore = finalScoreData ? finalScoreData.score : 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      {!quizSubmitted ? (
        <div className="flex items-center justify-center p-2 border rounded-md bg-card text-lg font-medium sticky top-[var(--navbar-height,60px)] z-10 backdrop-blur-sm">
          <Clock className="mr-2 h-5 w-5" /> Time Left: {formatTime(timeLeft)}
        </div>
      ) : (
        /* Submitted JSX */
        <div className="flex flex-col items-center justify-center gap-2 p-3 border rounded-md bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-lg font-medium">
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5" /> Quiz Submitted!
          </div>
          <span>
            Score: {displayScore} / {questions.length}
          </span>
          <Link
            href={`/ranking?type=${quizType}`}
            className={cn(
              buttonVariants({ variant: "link" }),
              "text-green-800 dark:text-green-200"
            )}
          >
            View Ranking
          </Link>
        </div>
      )}
      {/* Nav Grid */}
      <div className="flex flex-row flex-wrap gap-2 justify-center p-4 mb-0 border rounded-md bg-card">
        {questions.map((question, index) => {
          /* button mapping logic */
          const isAnswered = userAnswers[index] !== undefined;
          const isActive = index === currentQuestionIndex;
          const isCorrect =
            quizSubmitted &&
            isAnswered &&
            userAnswers[index] === question.correctAnswer;
          const isIncorrect = quizSubmitted && isAnswered && !isCorrect;
          return (
            <button
              key={question.id || index}
              onClick={() => handleJumpToQuestion(index)}
              disabled={quizSubmitted}
              className={cn(
                "w-10 h-8 flex items-center justify-center rounded-md text-sm font-medium flex-shrink-0 transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
                isActive && !quizSubmitted
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : isCorrect
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : isIncorrect
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : isAnswered
                  ? "bg-accent text-accent-foreground hover:bg-accent/90"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-label={`Go to question ${index + 1}`}
              title={`Question ${index + 1}${isAnswered ? " (Answered)" : ""}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      {/* Question Card & Controls */}
      <div className="flex-grow">
        <Card className="w-full">
          <CardContent className="flex flex-col gap-4 p-6">
            {currentQuestion ? (
              <QuestionCard
                question={currentQuestion}
                questionIndex={currentQuestionIndex}
                selectedAnswer={userAnswers[currentQuestionIndex]}
                onAnswerSelect={handleAnswerSelect}
                isDisabled={quizSubmitted}
              />
            ) : (
              <p>Loading question...</p>
            )}
            <div className="flex justify-between mt-4">
              <Button
                onClick={handlePreviousQuestion}
                disabled={isFirstQuestion || quizSubmitted}
                variant="outline"
              >
                Previous
              </Button>
              {!isLastQuestion ? (
                <Button
                  onClick={handleNextQuestion}
                  disabled={quizSubmitted}
                  variant="outline"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || quizSubmitted}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---
const QuizLoadingSkeleton = () => {
  return <div className="p-4 text-center">Loading Quiz...</div>;
};
// --- Wrapper Component ---
export default function QuizDisplayPage() {
  return (
    <Suspense fallback={<QuizLoadingSkeleton />}>
      <QuizDisplayContent />
    </Suspense>
  );
}
