// src/components/AddQuestionDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { rtdb } from "@/lib/firebase";
import { ref, push, set as rtdbSet } from "firebase/database";
import { Loader2 } from "lucide-react";

interface AddQuestionDialogProps {
    quizType: string;
    onQuestionAdded: () => void; // Callback to refresh the list
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddQuestionDialog({ quizType, onQuestionAdded, open, onOpenChange }: AddQuestionDialogProps) {
    const [text, setText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]); // Start with 4 empty options
    const [correctAnswer, setCorrectAnswer] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

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
        setIsLoading(true);

        // Basic validation
        if (!text.trim()) {
            toast({ title: "Error", description: "Question text cannot be empty.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
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
            toast({ title: "Error", description: "The correct answer must be one of the provided options.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const newQuestion = {
            text: text.trim(),
            options: filledOptions,
            correctAnswer: correctAnswer.trim(),
        };

        try {
            const questionsRef = ref(rtdb, `quizzes/${quizType}/questions`);
            const newQuestionRef = push(questionsRef); // Generate unique key
            await rtdbSet(newQuestionRef, newQuestion);

            toast({ title: "Success", description: "New question added." });
            onQuestionAdded(); // Trigger refresh on parent page
            resetForm();
            onOpenChange(false); // Close dialog

        } catch (error) {
            console.error("Error adding question:", error);
            toast({ title: "Error", description: "Failed to add question.", variant: "destructive" });
            setIsLoading(false); // Keep dialog open on error
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { 
            if (!isOpen) resetForm(); // Reset form if closed manually
            onOpenChange(isOpen); 
        }}>
            {/* DialogTrigger is handled by the button on the parent page */}
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Add New Question</DialogTitle>
                    <DialogDescription>
                        Enter the details for the new question for the "{quizType}" quiz.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="q-text" className="text-right col-span-1">
                                Question
                            </Label>
                            <Textarea
                                id="q-text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter the question text..."
                                className="col-span-3"
                                rows={3}
                                required
                            />
                        </div>
                        {options.map((option, index) => (
                            <div key={index} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={`q-option-${index}`} className="text-right col-span-1">
                                    Option {index + 1}
                                </Label>
                                <Input
                                    id={`q-option-${index}`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="col-span-3"
                                />
                            </div>
                        ))}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="q-correct" className="text-right col-span-1">
                                Correct Answer
                            </Label>
                             {/* TODO: Consider using a Select dropdown populated by the filled options */}
                            <Input
                                id="q-correct"
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="Enter the exact correct answer text..."
                                className="col-span-3"
                                required
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
                            Add Question
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
