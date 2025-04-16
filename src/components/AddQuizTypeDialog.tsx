// src/components/AddQuizTypeDialog.tsx
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
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { rtdb } from "@/lib/firebase";
import { ref, set as rtdbSet, get } from "firebase/database";
import { Loader2 } from "lucide-react";

interface AddQuizTypeDialogProps {
    onTypeAdded: () => void; // Callback to refresh the list
    open: boolean;
    onOpenChange: (open: boolean) => void;
    existingTypes: string[]; // Pass existing types to prevent duplicates
}

export function AddQuizTypeDialog({ onTypeAdded, open, onOpenChange, existingTypes }: AddQuizTypeDialogProps) {
    const [newTypeName, setNewTypeName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const resetForm = () => {
        setNewTypeName("");
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newTypeName.trim().toLowerCase(); // Use lowercase for consistency

        if (!trimmedName) {
            toast({ title: "Error", description: "Quiz type name cannot be empty.", variant: "destructive" });
            return;
        }
         // Simple validation for path safety (avoid ., #, $, [, ])
        if (/[.#$\[\]]/.test(trimmedName)) {
             toast({ title: "Error", description: "Quiz type name contains invalid characters (. # $ [ ]).", variant: "destructive" });
            return;
        }
        if (existingTypes.includes(trimmedName)) {
             toast({ title: "Error", description: `Quiz type "${trimmedName}" already exists.`, variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            // Reference the specific new type path
            const typeRef = ref(rtdb, `quizzes/${trimmedName}`);
            
            // Check if it *really* doesn't exist (extra safety)
            const snapshot = await get(typeRef);
            if (snapshot.exists()) {
                 toast({ title: "Error", description: `Quiz type "${trimmedName}" already exists (concurrent creation?).`, variant: "destructive" });
                 setIsLoading(false);
                 onTypeAdded(); // Refresh list in case it appeared
                 return;
            }

            // Set a placeholder value (e.g., an empty questions node or a title)
            // This creates the node for the type.
            await rtdbSet(ref(rtdb, `quizzes/${trimmedName}/metadata`), { title: trimmedName, createdAt: Date.now() });
            // Or just set an empty object if you prefer:
            // await rtdbSet(typeRef, { questions: {} }); // Example: initialize with empty questions object

            toast({ title: "Success", description: `Quiz type "${trimmedName}" added.` });
            onTypeAdded(); // Trigger refresh on parent page
            resetForm();
            onOpenChange(false); // Close dialog

        } catch (error) {
            console.error("Error adding quiz type:", error);
            toast({ title: "Error", description: "Failed to add quiz type.", variant: "destructive" });
            setIsLoading(false); // Keep dialog open on error
        }
    };

    return (
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) resetForm();
          onOpenChange(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Quiz Type</DialogTitle>
            <DialogDescription>
              Enter a name for the new quiz category (e.g., 'lcc', 'lct'). Use
              lowercase and no special characters. Dont use space, use "-" as
              space. ex: Title-Title
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type-name" className="text-right col-span-1">
                  Name
                </Label>
                <Input
                  id="type-name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., science"
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
                Add Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
}
