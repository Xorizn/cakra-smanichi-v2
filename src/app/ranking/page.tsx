// src/app/ranking/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RankingEntry {
    id: string;
    userName: string;
    score: number;
    totalQuestions: number;
    timeTaken: number; // in seconds
    finishedAt: { seconds: number; nanoseconds: number; } | null; // Firestore timestamp structure
}

function RankingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const quizType = searchParams.get('type');
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRankings = useCallback(async (type: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Query the top-level quizResults collection
            const q = query(
                collection(db, "quizResults"),
                where("quizId", "==", type),
                orderBy("score", "desc"),      // Order by score descending
                orderBy("timeTaken", "asc"),   // Then by time taken ascending
                limit(50)                    // Limit to top 50 for performance
            );

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                console.log(`No results found for quiz type: ${type}`);
                // Not necessarily an error, just no entries yet
                setRankings([]);
            } else {
                const fetchedRankings = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure finishedAt is handled correctly if it might be null/undefined
                    finishedAt: doc.data().finishedAt || null 
                })) as RankingEntry[];
                setRankings(fetchedRankings);
            }
        } catch (err) {
            console.error("Error fetching rankings:", err);
            const message = err instanceof Error ? err.message : "Could not load rankings.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (quizType) {
            fetchRankings(quizType);
        } else {
            setError("No quiz type specified in URL.");
            setIsLoading(false);
        }
    }, [quizType, fetchRankings]);

    const formatTime = (seconds: number): string => {
        if (isNaN(seconds) || seconds < 0) return "--:--";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (timestamp: { seconds: number; nanoseconds: number; } | null): string => {
        if (!timestamp || typeof timestamp.seconds !== 'number') return "N/A";
        try {
          return new Date(timestamp.seconds * 1000).toLocaleDateString();
        } catch (e) {
            return "Invalid Date";
        }
    };

    if (isLoading) {
        return (
            <Card className="w-full max-w-3xl mx-auto mt-6">
                <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border rounded-md bg-destructive/10 text-destructive max-w-lg mx-auto mt-6">
                <AlertTriangle className="w-12 h-12" />
                <h2 className="text-xl font-semibold">Error Loading Rankings</h2>
                <p>{error}</p>
                <Button onClick={() => router.push('/')} variant="destructive">Go Home</Button>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-4xl mx-auto my-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold">
                    Ranking - {quizType ? `"${quizType}"` : 'Unknown Quiz'}
                </CardTitle>
                 <Trophy className="h-6 w-6 text-yellow-500" />
            </CardHeader>
            <CardContent>
                {rankings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No results submitted for this quiz yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">Rank</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead className="text-center">Score</TableHead>
                                <TableHead className="text-center">Time Taken</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rankings.map((entry, index) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                    <TableCell>{entry.userName || 'Anonymous'}</TableCell>
                                    <TableCell className="text-center">{entry.score}/{entry.totalQuestions}</TableCell>
                                    <TableCell className="text-center">{formatTime(entry.timeTaken)}</TableCell>
                                    <TableCell className="text-right">{formatDate(entry.finishedAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <div className="mt-6 text-center">
                   <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Back to Home</Link>
                </div>
            </CardContent>
        </Card>
    );
}

// Wrapper for Suspense
export default function RankingPage() {
    return (
        <Suspense fallback={
            <Card className="w-full max-w-3xl mx-auto mt-6">
                <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
                 <CardContent>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        }>
            <RankingContent />
        </Suspense>
    );
}
