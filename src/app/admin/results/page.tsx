// src/app/admin/results/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from 'next/navigation';
import { db, rtdb } from "@/lib/firebase";
// Removed unused Firestore imports like Timestamp, serverTimestamp for this read/delete page
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from "firebase/firestore"; 
import { ref, get as getRtdb } from "firebase/database";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Trash2, UserX, Filter } from "lucide-react";
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
import { Timestamp } from "firebase/firestore"; // Keep Timestamp for type definition

// Interface for results data from Firestore
interface ResultEntry {
    id: string; // Firestore document ID from quizResults
    userId: string;
    userName: string;
    quizId: string;
    score: number;
    totalQuestions: number;
    timeTaken: number; // in seconds
    finishedAt: Timestamp | { seconds: number; nanoseconds: number; }; 
}

// Interface for user data needed for deletion confirmation
interface UserToDelete {
    userId: string;
    userName: string;
}

function ManageResultsContent() {
    const router = useRouter();
    const { toast } = useToast();

    const [results, setResults] = useState<ResultEntry[]>([]);
    const [quizTypes, setQuizTypes] = useState<string[]>([]);
    const [selectedQuizType, setSelectedQuizType] = useState<string>("all");
    // Combine loading states for simplicity
    const [isLoading, setIsLoading] = useState(true); 
    const [isProcessing, setIsProcessing] = useState(false); // For delete actions
    const [error, setError] = useState<string | null>(null);
    
    const [isDeleteResultOpen, setIsDeleteResultOpen] = useState(false);
    const [resultToDelete, setResultToDelete] = useState<ResultEntry | null>(null);
    const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserToDelete | null>(null);

    // Fetch available quiz types for the filter dropdown
    const fetchQuizTypes = useCallback(async () => {
        try {
            const snapshot = await getRtdb(ref(rtdb, 'quizzes'));
            if (snapshot.exists()) setQuizTypes(["all", ...Object.keys(snapshot.val() || {})]);
            else setQuizTypes(["all"]);
        } catch (err) { console.error("Error fetching quiz types:", err); setQuizTypes(["all"]); }
    }, []);

    // Fetch results based on selected filter
    const fetchResults = useCallback(async (filterType: string) => {
        setIsLoading(true); setError(null); setResults([]); 
        console.log(`Fetching results for type: ${filterType}`);
        try {
            let q = query(
                collection(db, "quizResults"),
                orderBy("finishedAt", "desc"),
                limit(100) 
            );
            if (filterType !== "all") q = query(q, where("quizId", "==", filterType));

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) console.log(`No results found for filter: ${filterType}`);
            else {
                const fetched = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ResultEntry));
                setResults(fetched);
                console.log(`Fetched ${fetched.length} results.`);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not load results.";
            setError(msg); toast({ title: "Error", description: msg, variant: "destructive" });
            console.error("Error fetching results:", err);
        } finally { setIsLoading(false); }
    }, [toast]);

    useEffect(() => { fetchQuizTypes(); }, [fetchQuizTypes]);
    useEffect(() => { fetchResults(selectedQuizType); }, [selectedQuizType, fetchResults]);

    // --- Delete Result Functions --- 
    const initiateDeleteResult = (result: ResultEntry) => { setResultToDelete(result); setIsDeleteResultOpen(true); };

    const executeDeleteResult = async () => {
        if (!resultToDelete) return;
        setIsProcessing(true); // Indicate action in progress
        try {
            // ONLY delete from quizResults
            const resultRef = doc(db, "quizResults", resultToDelete.id);
            await deleteDoc(resultRef);
            console.log(`Deleted result doc: ${resultToDelete.id} from quizResults`);
            toast({ title: "Success", description: "Result entry deleted." });
            setResults(prev => prev.filter(r => r.id !== resultToDelete.id)); // Update UI
        } catch (err) {
             console.error("Error deleting result:", err);
             let description = "Failed to delete result.";
             if (err instanceof Error && err.message.includes("permission")) { description = "Permission denied."; }
             else if (err instanceof Error) { description = err.message; }
            toast({ title: "Error", description: description, variant: "destructive" });
        } finally {
            setIsDeleteResultOpen(false);
            setResultToDelete(null);
            setIsProcessing(false);
        }
    };
    // --- End Delete Result Functions --- 

     // --- Delete User Functions (Simulation Only) --- 
    const initiateDeleteUser = (userId: string, userName: string) => { setUserToDelete({ userId, userName }); setIsDeleteUserOpen(true); };

    const executeDeleteUser = async () => {
        if (!userToDelete) return;
        setIsProcessing(true);
        console.warn(`SIMULATING Deletion for user ID: ${userToDelete.userId}. Requires Backend Function!`);
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        toast({ title: "User Deletion (Simulated)", description: `User ${userToDelete.userName} marked for deletion.`, variant: "warning" });
        setIsDeleteUserOpen(false); setUserToDelete(null); setIsProcessing(false);
        // Note: We don't refresh results here as client-side sim doesn't remove their results
    };
    // --- End Delete User Functions --- 

    // --- Helpers ---
    const formatTime = (s: number) => isNaN(s)||s<0?"--:--":`${Math.floor(s/60)}m ${s%60}s`;
    const formatDate = (ts: ResultEntry['finishedAt']) => !ts||typeof ts!=='object'||typeof ts.seconds!=='number'?"N/A":new Date(ts.seconds*1000).toLocaleDateString();

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-center sm:text-left">Manage Quiz Results</h1>
                 <div className="flex items-center gap-2">
                     <Filter className="h-4 w-4 text-muted-foreground"/>
                     <Select value={selectedQuizType} onValueChange={setSelectedQuizType} disabled={isLoading || isProcessing}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter..." /></SelectTrigger>
                        <SelectContent>{quizTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t==="all"?"All Quizzes":t}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
            </div>

            {isLoading && <AdminPageLoadingSkeleton />} 
            {error && (
                <Card className="bg-destructive/10 border-destructive mb-6">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Error</CardTitle></CardHeader>
                    <CardContent><p>{error}</p></CardContent>
                </Card>
            )}
            {!isLoading && !error && results.length === 0 && (
                 <div className="text-center text-muted-foreground py-10"><p>No results found{selectedQuizType !== 'all' ? ` for "${selectedQuizType}"` : ''}.</p></div>
            )}
            {!isLoading && !error && results.length > 0 && (
                 <Card>
                     <CardContent className="p-0">
                         <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead><TableHead>Quiz</TableHead><TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-center">Time</TableHead><TableHead className="text-right">Date</TableHead><TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.userName||r.userId.substring(0,6)+'...'}</TableCell><TableCell className="capitalize">{r.quizId}</TableCell>
                                        <TableCell className="text-center">{r.score}/{r.totalQuestions}</TableCell><TableCell className="text-center">{formatTime(r.timeTaken)}</TableCell>
                                        <TableCell className="text-right">{formatDate(r.finishedAt)}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="ghost" size="icon" onClick={() => initiateDeleteResult(r)} title="Delete Result" disabled={isProcessing} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>

                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            )}
            
            <div className="mt-8"><Link href="/admin" className={cn(buttonVariants({ variant: 'ghost' }))}>&larr; Back</Link></div>

            {/* Dialogs */} 
            <AlertDialog open={isDeleteResultOpen} onOpenChange={setIsDeleteResultOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Quiz Result?</AlertDialogTitle>
                        <AlertDialogDescription>Delete result for <span className="font-medium">{resultToDelete?.userName}</span> on <span className="font-medium capitalize">{resultToDelete?.quizId}</span>? This removes it from rankings.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setResultToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteResult} disabled={isProcessing} className={buttonVariants({ variant: "destructive" })}>{isProcessing?"Deleting...":"Delete Result"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle className="text-destructive">Delete User Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Permanently delete user <span className="font-medium">{userToDelete?.userName}</span> ({userToDelete?.userId})? <strong className="text-destructive block mt-2">Requires backend function. Cannot be undone.</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteUser} disabled={isProcessing} className={buttonVariants({ variant: "destructive" })}>{isProcessing?"Processing...":"Delete User (Simulated)"}</AlertDialogAction>
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
