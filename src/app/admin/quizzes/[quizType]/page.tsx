// src/app/admin/quizzes/[quizType]/page.tsx
"use client";

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { rtdb } from '@/lib/firebase';
import { ref, get, remove as rtdbRemove } from 'firebase/database';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, PlusCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AdminPageLoadingSkeleton } from "@/components/AdminPageLoadingSkeleton";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { EditQuestionDialog } from "@/components/EditQuestionDialog"; // Import the Edit dialog
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

interface QuestionData {
    id?: string | number; 
    text: string;
    options: string[];
    correctAnswer: string;
}
interface Question extends QuestionData {
    _key: string; 
}

function ManageQuizQuestionsContent() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const quizTypeParam = params?.quizType;
    const quizType = Array.isArray(quizTypeParam) ? quizTypeParam[0] : quizTypeParam;

    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDeleteKey, setQuestionToDeleteKey] = useState<string | null>(null);
    // State for Edit Dialog
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    const fetchQuestionsCallback = useCallback(async (type: string | undefined) => {
        if (!type) return; 
        setIsLoading(true);
        setError(null);
        try {
            const questionsRef = ref(rtdb, `quizzes/${type}/questions`);
            const snapshot = await get(questionsRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                let fetchedQuestions: Question[] = [];
                if (Array.isArray(data)) {
                    fetchedQuestions = data
                        .map((q, index) => q ? { ...q, _key: String(index) } : null)
                        .filter((q): q is Question => q !== null);
                } else if (typeof data === 'object' && data !== null) {
                    fetchedQuestions = Object.entries(data).map(([key, value]) => ({ ...(value as QuestionData), _key: key }));
                }
                setQuestions(fetchedQuestions);
            } else {
                setQuestions([]);
            }
        } catch (err) {
            console.error("Error fetching questions:", err);
            setError(err instanceof Error ? err.message : "Failed to load questions.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (quizType) {
            fetchQuestionsCallback(quizType);
        } else {
            setError("Quiz type is missing from URL.");
            setIsLoading(false);
        }
    }, [quizType, fetchQuestionsCallback]);

    const handleAddQuestionClick = () => {
        setIsAddDialogOpen(true);
    };

    // Updated handler to open the Edit Dialog
    const handleEditQuestionClick = (question: Question) => {
        console.log("Opening Edit Dialog for question:", question);
        setEditingQuestion(question); // Set the question to edit and trigger dialog opening
    };

    const initiateDeleteQuestion = (questionKey: string | number | undefined) => {
        const keyString = String(questionKey);
        if (!quizType || !keyString || keyString === 'undefined' || keyString === 'null') {
            toast({ title: "Error", description: "Cannot delete: Invalid key or quiz type.", variant: "destructive" });
            return;
        }
        setQuestionToDeleteKey(keyString);
        setIsDeleteDialogOpen(true);
    };

    const executeDeleteQuestion = async () => {
        if (!questionToDeleteKey || !quizType) return;
        try {
            setIsLoading(true);
            const questionRef = ref(rtdb, `quizzes/${quizType}/questions/${questionToDeleteKey}`);
            await rtdbRemove(questionRef);
            setQuestions(prev => prev.filter(q => q._key !== questionToDeleteKey));
            toast({ title: "Success", description: "Question deleted." });
        } catch (err) {
            console.error("Error deleting question:", err);
            let description = "Failed to delete question.";
             if (err instanceof Error && err.message.includes("permission_denied")) {
                 description = "Permission denied. Check Realtime Database rules.";
             } else if (err instanceof Error) {
                 description = err.message;
             }
            toast({ title: "Error", description: description, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setQuestionToDeleteKey(null);
            setIsDeleteDialogOpen(false);
        }
    };
    
    // Callback for both Add and Edit dialogs
    const handleDataUpdated = () => {
        if (quizType) {
            fetchQuestionsCallback(quizType);
        }
    };

    if (isLoading && questions.length === 0) { 
        return <AdminPageLoadingSkeleton />;
    }

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl capitalize">Manage Questions: {quizType || "..."}</CardTitle>
                    <CardDescription>Add, edit, or delete questions for the "{quizType}" quiz.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleAddQuestionClick} className="mb-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Question
                    </Button>

                    {error && (
                         <Card className="bg-destructive/10 border-destructive mb-4">
                             <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Error</CardTitle></CardHeader>
                             <CardContent><p>{error}</p></CardContent>
                         </Card>
                    )}

                    {isLoading && questions.length > 0 && <p className="text-center text-muted-foreground py-4">Reloading questions...</p>}

                    {!isLoading && !error && questions.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">No questions found. Add one to get started.</p>
                    )}
                    
                    {!isLoading && !error && questions.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">Question Text</TableHead>
                                    <TableHead>Correct Answer</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map((q) => (
                                    <TableRow key={q._key}>
                                        <TableCell className="font-medium whitespace-normal break-words">{q.text}</TableCell>
                                        <TableCell className="whitespace-normal break-words">{q.correctAnswer}</TableCell>
                                        <TableCell className="text-right space-x-1 md:space-x-2 whitespace-nowrap">
                                            {/* Button now opens Edit Dialog */}
                                            <Button variant="ghost" size="icon" onClick={() => handleEditQuestionClick(q)} title="Edit">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => initiateDeleteQuestion(q._key)} title="Delete" className="text-destructive hover:text-destructive/80">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                 <CardFooter className="flex justify-start">
                     <Link href="/admin/quizzes" className={cn(buttonVariants({ variant: 'ghost' }))}>
                         &larr; Back to Quiz Types
                     </Link>
                 </CardFooter>
            </Card>

            {/* Add Question Dialog */} 
            {quizType && (
                 <AddQuestionDialog 
                     quizType={quizType} 
                     onQuestionAdded={handleDataUpdated} // Use shared callback
                     open={isAddDialogOpen}
                     onOpenChange={setIsAddDialogOpen}
                 />
            )}

            {/* Edit Question Dialog */}
            {quizType && (
                <EditQuestionDialog
                    quizType={quizType}
                    question={editingQuestion} // Pass the question to edit
                    onQuestionUpdated={handleDataUpdated} // Use shared callback
                    open={!!editingQuestion} // Open when editingQuestion is not null
                    onOpenChange={(isOpen) => {
                        if (!isOpen) setEditingQuestion(null); // Clear editing state when closed
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the question
                            (Key: <span className="font-medium">{questionToDeleteKey}</span>) from the "{quizType}" quiz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQuestionToDeleteKey(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteQuestion} disabled={isLoading} className={buttonVariants({ variant: "destructive" })}>
                            {isLoading ? "Deleting..." : "Yes, delete question"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<AdminPageLoadingSkeleton />}>
            <ManageQuizQuestionsContent />
        </Suspense>
    );
}
