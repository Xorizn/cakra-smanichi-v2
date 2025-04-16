// src/components/EditQuizTypeDialog.tsx
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
import { Switch } from "@/components/ui/switch"; // Import Switch
import { useToast } from "@/hooks/use-toast";
import { rtdb } from "@/lib/firebase";
import { ref, update as rtdbUpdate } from "firebase/database";
import { Loader2, Eye, EyeOff } from "lucide-react"; // Import icons

// Define the structure for the metadata we expect/edit
interface QuizMetadata {
  name?: string;
  description?: string;
  durationMinutes?: number;
  startTimeISO?: string;
  isPublic?: boolean; // Add visibility flag
}

interface EditQuizTypeDialogProps {
  quizTypeId: string | null;
  currentMetadata: QuizMetadata | null;
  onTypeUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditQuizTypeDialog({
  quizTypeId,
  currentMetadata,
  onTypeUpdated,
  open,
  onOpenChange,
}: EditQuizTypeDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number | string>("");
  const [startTime, setStartTime] = useState("");
  const [isPublic, setIsPublic] = useState(true); // Add state for visibility, default true
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && currentMetadata && quizTypeId) {
      setName(currentMetadata.name || quizTypeId);
      setDescription(currentMetadata.description || "");
      setDuration(currentMetadata.durationMinutes?.toString() || "60");
      setStartTime(currentMetadata.startTimeISO || "");
      // Set isPublic, default to true if undefined/null
      setIsPublic(
        currentMetadata.isPublic === undefined ||
          currentMetadata.isPublic === null
          ? true
          : currentMetadata.isPublic
      );
    }
  }, [open, currentMetadata, quizTypeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTypeId) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const durationNum = parseInt(String(duration), 10);
    const startTimeTrimmed = startTime.trim();
    const isValidStartTime =
      startTimeTrimmed === "" ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startTimeTrimmed);

    // Validations
    if (!trimmedName) {
      toast({
        title: "Validation Error",
        description: "Display name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      toast({
        title: "Validation Error",
        description: "Duration must be a positive number.",
        variant: "destructive",
      });
      return;
    }
    if (startTimeTrimmed && !isValidStartTime) {
      toast({
        title: "Validation Error",
        description: "Start time format invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const metadataRef = ref(rtdb, `quizzes/${quizTypeId}/metadata`);
      const updates: Partial<QuizMetadata> = {
        name: trimmedName,
        description: trimmedDescription,
        durationMinutes: durationNum,
        isPublic: isPublic, // Include visibility flag
        startTimeISO: startTimeTrimmed ? startTimeTrimmed : null,
      };

      await rtdbUpdate(metadataRef, updates);

      toast({
        title: "Success",
        description: `Quiz type "${quizTypeId}" updated.`,
      });
      onTypeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating quiz type metadata:", error);
      toast({
        title: "Error",
        description: "Failed to update quiz type.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Quiz Type:{" "}
            <span className="capitalize font-mono text-primary">
              {quizTypeId}
            </span>
          </DialogTitle>
          <DialogDescription>
            Update display name, description, duration, start time, and
            visibility.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 pb-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="type-edit-name">
              Display Name (Dont use space, use "-" as space. ex: Title-Title)
            </Label>
            <Input
              id="type-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="type-edit-desc">Description</Label>
            <Textarea
              id="type-edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
          {/* Duration Field */}
          <div className="space-y-1.5">
            <Label htmlFor="type-edit-duration">Duration (minutes)</Label>
            <Input
              id="type-edit-duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              min="1"
              disabled={isLoading}
            />
          </div>
          {/* Start Time Field */}
          <div className="space-y-1.5">
            <Label htmlFor="type-edit-start-time">Start Time (Optional)</Label>
            <Input
              id="type-edit-start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for immediate start.
            </p>
          </div>
          {/* Visibility Switch */}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="type-edit-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isLoading}
            />
            <Label
              htmlFor="type-edit-public"
              className="flex items-center cursor-pointer"
            >
              {isPublic ? (
                <Eye className="mr-1.5 h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="mr-1.5 h-4 w-4 text-red-600" />
              )}
              {isPublic
                ? "Public (Visible to Users)"
                : "Private (Hidden from Users)"}
            </Label>
          </div>

          <DialogFooter className="pt-4">
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
