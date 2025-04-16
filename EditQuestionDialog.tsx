// src/components/EditQuestionDialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { rtdb } from "@/lib/firebase";
import { ref, set as rtdbSet, update as rtdbUpdate } from "firebase/database"; // Import update if needed
import { Loader2 } from "lucide-react";

// Interface matching RTDB question structure + key
interface Question {
    _key: string; // RTDB key is essential for editing
    text: string;
    options: string[];
    correctAnswer: string;
}

interface EditQuestionDialogProps {
    quizType: string;
    question: Question | null; // The question object to edit
    onQuestionUpdated: () => void; // Callback to refresh the list
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditQuestionDialog({ quizType, question, onQuestionUpdated, open, onOpenChange }: EditQuestionDialogProps) {
    const [text, setText] = useState("");
    const [options, setOptions] = useState<string[]>([]);
    const [correctAnswer, setCorrectAnswer] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Populate form when the question prop changes (dialog opens)
    useEffect(() => {
        if (question) {
            setText(question.text || "");
            // Ensure options is always an array, default to 4 empty if needed
            const currentOptions = Array.isArray(question.options) ? question.options : [];
            const paddedOptions = [...currentOptions];
            while (paddedOptions.length < 4) {
                paddedOptions.push(""); // Ensure at least 4 option fields are shown
            }
            setOptions(paddedOptions);
            setCorrectAnswer(question.correctAnswer || "");
        } else {
            // Reset form if question is null (dialog closed)
            resetForm();
        }
    }, [question]);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const resetForm = () => {
        setText("");
        setOptions(["", "", "", ""]);
        setCorrectAnswer("");
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question) {
             toast({ title: "Error", description: "No question selected for editing.", variant: "destructive" });
             return;
        }
        setIsLoading(true);

        // Validation (same as Add dialog)
        if (!text.trim()) {
            toast({ title: "Error", description: "Question text cannot be empty.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        // Filter out empty options *before* validation
        const filledOptions = options.map(o => o.trim()).filter(o => o !== "");
        if (filledOptions.length < 2) {
            toast({ title: "Error", description: "Please provide at least two non-empty options.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
         if (!correctAnswer.trim()) {
            toast({ title: "Error", description: "Please specify the correct answer.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        if (!filledOptions.includes(correctAnswer.trim())) {
            toast({ title: "Error", description: "The correct answer must be one of the provided non-empty options.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const updatedQuestionData = {
            text: text.trim(),
            options: filledOptions, // Save only non-empty options
            correctAnswer: correctAnswer.trim(),
            // You might want to add an 'updatedAt' timestamp here
        };

        try {
            // Reference the specific question using its key
            const questionRef = ref(rtdb, `quizzes/${quizType}/questions/${question._key}`);
            // Use set to overwrite the entire question data at that key
            await rtdbSet(questionRef, updatedQuestionData);
            // Alternatively, use update if you only want to change specific fields:
            // await rtdbUpdate(questionRef, updatedQuestionData);

            toast({ title: "Success", description: "Question updated." });
            onQuestionUpdated(); // Trigger refresh on parent page
            onOpenChange(false); // Close dialog (resetForm happens via useEffect)

        } catch (error) {
            console.error("Error updating question:", error);
            toast({ title: "Error", description: "Failed to update question.", variant: "destructive" });
            setIsLoading(false); // Keep dialog open on error
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit Question</DialogTitle>
                    <DialogDescription>
                        Modify the details for the question (Key: {question?._key}) in the "{quizType}" quiz.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Form fields identical to AddQuestionDialog */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-q-text" className="text-right col-span-1">
                                Question
                            </Label>
                            <Textarea
                                id="edit-q-text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter the question text..."
                                className="col-span-3"
                                rows={3}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {options.map((option, index) => (
                            <div key={index} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={`edit-q-option-${index}`} className="text-right col-span-1">
                                    Option {index + 1}
                                </Label>
                                <Input
                                    id={`edit-q-option-${index}`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="col-span-3"
                                    disabled={isLoading}
                                />
                            </div>
                        ))}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-q-correct" className="text-right col-span-1">
                                Correct Answer
                            </Label>
                            <Input
                                id="edit-q-correct"
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="Enter the exact correct answer text..."
                                className="col-span-3"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                             <Button type="button" variant="outline" disabled={isLoading}>
                                 Cancel
                             </Button>
                         </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
