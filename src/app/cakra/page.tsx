"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, get } from "firebase/database"; // Removed child import
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

// Match the Admin Metadata structure
interface QuizMetadata {
  name?: string;
  description?: string;
  durationMinutes?: number;
  startTimeISO?: string;
  isPublic?: boolean; // Include visibility flag
}
interface QuizType {
  id: string;
  name: string;
  description: string;
  // Add other needed fields if required on homepage
}

export default function HomePage() {
  const [quizTypes, setQuizTypes] = useState<QuizType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const quizzesRef = ref(rtdb, "quizzes");
      const snapshot = await get(quizzesRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const typesArray: QuizType[] = [];
        for (const key in data) {
          const metadata: QuizMetadata | undefined = data[key]?.metadata;
          // Filter: Only include if isPublic is explicitly true (or default to true if undefined)
          if (metadata?.isPublic === undefined || metadata?.isPublic === true) {
            typesArray.push({
              id: key,
              name:
                metadata?.name || key.charAt(0).toUpperCase() + key.slice(1),
              description: metadata?.description || `Take the ${key} quiz!`,
            });
          }
        }
        setQuizTypes(typesArray.sort((a, b) => a.name.localeCompare(b.name))); // Sort by name
      } else {
        setQuizTypes([]);
        console.log("No quiz types found in RTDB /quizzes path.");
      }
    } catch (err) {
      console.error("Error fetching quiz types:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load available quizzes."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizTypes();
  }, [fetchQuizTypes]);

  return (
    <main className="container mx-auto px-4 py-8">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to CAKRA {new Date().getFullYear()}
        </h1>
        <p className="text-xl text-muted-foreground">
          Select a quiz below to start your competition.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">
          Available Quizzes
        </h2>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/5 mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <AlertTriangle /> Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && quizTypes.length === 0 && (
          <p className="text-center text-muted-foreground py-6">
            No public quizzes available right now.
          </p>
        )}

        {!isLoading && !error && quizTypes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizTypes.map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <CardTitle>{quiz.name.split("-").join(" ")}</CardTitle>
                  <CardDescription>{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/quiz?type=${quiz.id}`} passHref legacyBehavior>
                    <Button className="w-full">Start Quiz</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
