// src/app/admin/results/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from 'next/navigation';
import { db, rtdb } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { ref, get as getRtdb } from "firebase/database";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Trash2, Filter, Download, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageLoadingSkeleton } from "@/components/AdminPageLoadingSkeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Updated interface for detailed results
interface ResultEntry {
    id: string; // Firestore document ID from quizResults
    userId: string;
    userName: string;
    quizId: string;
    score: number;
    totalQuestions: number;
    timeTaken: number; // in seconds
    finishedAt: Timestamp | { seconds: number; nanoseconds: number; };
    correct?: number;   // Number of correct answers
    incorrect?: number; // Number of incorrect answers
    blank?: number;     // Number of blank/unanswered questions
}

function ManageResultsContent() {
    const router = useRouter();
    const { toast } = useToast();

    const [results, setResults] = useState<ResultEntry[]>([]);
    const [quizTypes, setQuizTypes] = useState<string[]>([]);
    const [selectedQuizType, setSelectedQuizType] = useState<string>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [isDeleteResultOpen, setIsDeleteResultOpen] = useState(false);
    const [resultToDelete, setResultToDelete] = useState<ResultEntry | null>(null);

    const fetchQuizTypes = useCallback(async () => {
        try {
            const snapshot = await getRtdb(ref(rtdb, 'quizzes'));
            if (snapshot.exists()) setQuizTypes(["all", ...Object.keys(snapshot.val() || {})]);
            else setQuizTypes(["all"]);
        } catch (err) { console.error("Error fetching quiz types:", err); setQuizTypes(["all"]); }
    }, []);

    const fetchResults = useCallback(async (filterType: string) => {
        setIsLoading(true); setError(null); setResults([]);
        try {
            let q = query(
                collection(db, "quizResults"),
                orderBy("finishedAt", "desc"),
                limit(150)
            );
            if (filterType !== "all") q = query(q, where("quizId", "==", filterType));

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                setResults([]);
            } else {
                const fetched = querySnapshot.docs.map(d => {
                    const data = d.data();
                    const correct = data.correct;
                    const incorrect = data.incorrect;
                    const blank = (typeof correct === 'number' && typeof incorrect === 'number')
                        ? data.totalQuestions - (correct + incorrect)
                        : undefined;

                    return {
                        id: d.id,
                        ...data,
                        blank: blank,
                    } as ResultEntry;
                });
                setResults(fetched);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not load results.";
            setError(msg); toast({ title: "Error", description: msg, variant: "destructive" });
        } finally { setIsLoading(false); }
    }, [toast]);

    useEffect(() => { fetchQuizTypes(); }, [fetchQuizTypes]);
    useEffect(() => { fetchResults(selectedQuizType); }, [selectedQuizType, fetchResults]);

    const executeDeleteResult = async () => {
        if (!resultToDelete) return;
        setIsProcessing(true);
        try {
            const resultRef = doc(db, "quizResults", resultToDelete.id);
            await deleteDoc(resultRef);
            toast({ title: "Success", description: "Result entry deleted." });
            setResults(prev => prev.filter(r => r.id !== resultToDelete.id));
        } catch (err) {
             const description = err instanceof Error ? err.message : "Failed to delete result.";
            toast({ title: "Error", description, variant: "destructive" });
        } finally {
            setIsDeleteResultOpen(false); setResultToDelete(null); setIsProcessing(false);
        }
    };
    
    const exportToCSV = () => {
        if (results.length === 0) return;
        const headers = ["User Name", "Quiz ID", "Score", "Correct", "Incorrect", "Blank", "Answered", "Total Questions", "Time Taken (s)", "Finished At"];
        const csvRows = [headers.join(",")];

        results.forEach(r => {
            const answered = (typeof r.correct === 'number' && typeof r.incorrect === 'number') ? r.correct + r.incorrect : 'N/A';
            const finishedDate = r.finishedAt && typeof r.finishedAt === 'object' && r.finishedAt.seconds ? new Date(r.finishedAt.seconds * 1000).toISOString() : "N/A";
            const row = [`"${r.userName || r.userId}"`, r.quizId, r.score, r.correct ?? "N/A", r.incorrect ?? "N/A", r.blank ?? "N/A", answered, r.totalQuestions, r.timeTaken, finishedDate];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `quiz-results-${selectedQuizType}-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        toast({ title: "Success", description: "Results exported to CSV." });
    };

    const formatTime = (s: number) => isNaN(s) || s < 0 ? "--:--" : `${Math.floor(s / 60)}m ${s % 60}s`;
    const formatDate = (ts: ResultEntry['finishedAt']) => !ts || typeof ts !== 'object' || typeof ts.seconds !== 'number' ? "N/A" : new Date(ts.seconds * 1000).toLocaleDateString();

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-center sm:text-left">Manage Quiz Results</h1>
                 <div className="flex items-center gap-2">
                     <Button onClick={exportToCSV} disabled={isLoading || results.length === 0}><Download className="mr-2 h-4 w-4" />Export</Button>
                     <Filter className="h-4 w-4 text-muted-foreground"/>
                     <Select value={selectedQuizType} onValueChange={setSelectedQuizType} disabled={isLoading || isProcessing}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter..." /></SelectTrigger>
                        <SelectContent>{quizTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t === "all" ? "All Quizzes" : t}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
            </div>

            {isLoading && <AdminPageLoadingSkeleton />}
            {error && <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Error</CardTitle></CardHeader><CardContent><p>{error}</p></CardContent></Card>}
            {!isLoading && !error && results.length === 0 && <div className="text-center text-muted-foreground py-10"><p>No results found{selectedQuizType !== 'all' ? ` for "${selectedQuizType}"` : ''}.</p></div>}
            {!isLoading && !error && results.length > 0 && (
                 <Card>
                     <CardContent className="p-0">
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead><TableHead>Quiz</TableHead>
                                        <TableHead className="text-center">Answered / Total</TableHead>
                                        <TableHead className="text-center text-green-600">Correct</TableHead>
                                        <TableHead className="text-center text-red-600">Incorrect</TableHead>
                                        <TableHead className="text-center text-yellow-600">Blank</TableHead>
                                        <TableHead className="text-center">Time</TableHead><TableHead className="text-right">Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{r.userName || r.userId.substring(0, 6) + '...'}</TableCell>
                                            <TableCell className="capitalize whitespace-nowrap">{r.quizId}</TableCell>
                                            <TableCell className="text-center font-mono">{typeof r.correct === 'number' && typeof r.incorrect === 'number' ? r.correct + r.incorrect : 'N/A'} / {r.totalQuestions}</TableCell>
                                            <TableCell className="text-center font-medium text-green-600">{r.correct ?? 'N/A'}</TableCell>
                                            <TableCell className="text-center font-medium text-red-600">{r.incorrect ?? 'N/A'}</TableCell>
                                            <TableCell className="text-center font-medium text-yellow-600">{r.blank ?? 'N/A'}</TableCell>
                                            <TableCell className="text-center whitespace-nowrap">{formatTime(r.timeTaken)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatDate(r.finishedAt)}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Link href={`/admin/results/${r.id}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-blue-500 hover:text-blue-700")} title="View Details">
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Button variant="ghost" size="icon" onClick={() => { setResultToDelete(r); setIsDeleteResultOpen(true); }} title="Delete Result" disabled={isProcessing} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                 </Card>
            )}
            
            <div className="mt-8"><Link href="/admin" className={cn(buttonVariants({ variant: 'ghost' }))}>&larr; Back</Link></div>

            <AlertDialog open={isDeleteResultOpen} onOpenChange={setIsDeleteResultOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Quiz Result?</AlertDialogTitle>
                        <AlertDialogDescription>Delete result for <span className="font-medium">{resultToDelete?.userName}</span> on <span className="font-medium capitalize">{resultToDelete?.quizId}</span>? This is permanent.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResultToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteResult} disabled={isProcessing} className={buttonVariants({ variant: "destructive" })}>{isProcessing ? "Deleting..." : "Delete Result"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function ResultsAdminPage() {
    return (
        <Suspense fallback={<AdminPageLoadingSkeleton />}>
            <ManageResultsContent />
        </Suspense>
    );
}
