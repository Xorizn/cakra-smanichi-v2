// src/app/admin/quizzes/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rtdb } from "@/lib/firebase";
import { ref, get, remove as rtdbRemove } from "firebase/database";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Edit,
  ListPlus,
  Trash2,
  Settings,
  Clock,
  Inbox,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react"; // Added Eye icons
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdminPageLoadingSkeleton } from "@/components/AdminPageLoadingSkeleton";
import { AddQuizTypeDialog } from "@/components/AddQuizTypeDialog";
import { EditQuizTypeDialog } from "@/components/EditQuizTypeDialog";
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
import { Badge } from "@/components/ui/badge"; // Import Badge

// Update structure for quiz type metadata
interface QuizMetadata {
  name?: string;
  description?: string;
  durationMinutes?: number;
  startTimeISO?: string;
  isPublic?: boolean; // Add visibility
}
interface QuizTypeData {
  id: string;
  metadata?: QuizMetadata;
}

const formatStartTimeForDisplay = (isoString: string | undefined): string => {
  if (!isoString) return "Immediate";
  try {
    return new Date(isoString).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch (e) {
    return "Invalid";
  }
};

function ManageQuizzesPage() {
  const [quizTypesData, setQuizTypesData] = useState<QuizTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isDeleteTypeDialogOpen, setIsDeleteTypeDialogOpen] = useState(false);
  const [quizTypeToDelete, setQuizTypeToDelete] = useState<string | null>(null);
  const [editingQuizType, setEditingQuizType] = useState<QuizTypeData | null>(
    null
  );
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [quizTypeToReset, setQuizTypeToReset] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchQuizTypesData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const quizzesRef = ref(rtdb, "quizzes");
      const snapshot = await get(quizzesRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const typesArray: QuizTypeData[] = Object.keys(data || {})
          .map((key) => ({
            id: key,
            metadata: data[key]?.metadata || {},
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
        setQuizTypesData(typesArray);
      } else {
        setQuizTypesData([]);
      }
    } catch (err) {
      console.error("Error fetching quiz types data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load quiz types."
      );
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed toast dependency as it's stable

  useEffect(() => {
    fetchQuizTypesData();
  }, [fetchQuizTypesData]);

  const handleDataUpdated = () => {
    fetchQuizTypesData();
  };

  const initiateEditQuizType = (typeData: QuizTypeData) => {
    setEditingQuizType(typeData);
  };
  const initiateDeleteQuizType = (typeId: string) => {
    if (!typeId) return;
    setQuizTypeToDelete(typeId);
    setIsDeleteTypeDialogOpen(true);
  };
  const initiateResetProgress = (typeId: string) => {
    if (!typeId) return;
    setQuizTypeToReset(typeId);
    setIsResetDialogOpen(true);
  };

  const executeDeleteQuizType = async () => {
    if (!quizTypeToDelete) return;
    let description = "Failed to delete quiz type.";
    try {
      await rtdbRemove(ref(rtdb, `quizzes/${quizTypeToDelete}`));
      handleDataUpdated(); // Refresh list
      toast({
        title: "Success",
        description: `Quiz type "${quizTypeToDelete}" deleted.`,
      });
    } catch (err) {
      /* ... error handling ... */
      console.error("Error deleting quiz type:", err);
      if (err instanceof Error && err.message.includes("permission_denied")) {
        description = "Permission denied.";
      } else if (err instanceof Error) {
        description = err.message;
      }
      toast({
        title: "Error",
        description: description,
        variant: "destructive",
      });
    } finally {
      setQuizTypeToDelete(null);
      setIsDeleteTypeDialogOpen(false);
    }
  };

  const executeResetProgress = async () => {
    if (!quizTypeToReset) return;
    setIsLoading(true); // Use main loading state or a dedicated one
    console.warn(
      `SIMULATING Progress Reset for ${quizTypeToReset}. Requires Backend Function!`
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast({
      title: "Progress Reset (Simulated)",
      description: `User progress for "${quizTypeToReset}" marked for reset.`,
    });
    setIsLoading(false);
    setQuizTypeToReset(null);
    setIsResetDialogOpen(false);
  };

  if (isLoading) {
    return <AdminPageLoadingSkeleton />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-center sm:text-left">
          Manage Quiz Types
        </h1>
        <Button onClick={() => setIsAddTypeOpen(true)} size="sm">
          <ListPlus className="mr-2 h-4 w-4" /> Add New Type
        </Button>
      </div>

      {error && (
        /* Error Display */ <Card className="bg-destructive/10 border-destructive mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && quizTypesData.length === 0 /* Empty State */ && (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[300px]">
          <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Quiz Types Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding a new quiz type.
          </p>
          <Button onClick={() => setIsAddTypeOpen(true)}>
            <ListPlus className="mr-2 h-4 w-4" /> Add New Type
          </Button>
        </div>
      )}

      {!isLoading && !error && quizTypesData.length > 0 /* Cards Grid */ && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizTypesData.map((typeData) => {
            const isPublic = typeData.metadata?.isPublic ?? true; // Default to public
            return (
              <Card key={typeData.id} className="flex flex-col justify-between">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="capitalize">
                      {typeData.metadata?.name?.split("-").join(" ") || typeData.id}
                    </CardTitle>
                    {/* Visibility Badge */}
                    <Badge
                      variant={isPublic ? "default" : "secondary"}
                      className={cn(
                        isPublic
                          ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                          : "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700"
                      )}
                    >
                      {isPublic ? (
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {typeData.metadata?.description ||
                      `Manage the "${typeData.id}" quiz.`}
                  </CardDescription>
                  <div className="text-sm text-muted-foreground pt-2 space-y-1">
                    {typeData.metadata?.durationMinutes && (
                      <p className="flex items-center">
                        <Clock className="mr-1.5 h-4 w-4" />
                        Duration: {typeData.metadata.durationMinutes} min
                      </p>
                    )}
                    <p className="flex items-center">
                      <Clock className="mr-1.5 h-4 w-4 text-blue-500" />
                      Starts:{" "}
                      {formatStartTimeForDisplay(
                        typeData.metadata?.startTimeISO
                      )}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-4 space-y-2">
                  <Link
                    href={`/admin/quizzes/${typeData.id}`}
                    passHref
                    legacyBehavior
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-center">
                      <Edit className="mr-2 h-4 w-4" /> Questions
                    </Button>
                  </Link>
                  <div className="flex gap-2 justify-between">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => initiateEditQuizType(typeData)}
                      title="Edit Details"
                    >
                      <Settings className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => initiateDeleteQuizType(typeData.id)}
                      title="Delete Type"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          &larr; Back
        </Link>
      </div>

      {/* DIALOGS */}
      <AddQuizTypeDialog
        open={isAddTypeOpen}
        onOpenChange={setIsAddTypeOpen}
        onTypeAdded={handleDataUpdated}
        existingTypes={quizTypesData.map((t) => t.id)}
      />
      <EditQuizTypeDialog
        quizTypeId={editingQuizType?.id ?? null}
        currentMetadata={editingQuizType?.metadata ?? null}
        onTypeUpdated={handleDataUpdated}
        open={!!editingQuizType}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingQuizType(null);
        }}
      />
      <AlertDialog
        open={isDeleteTypeDialogOpen}
        onOpenChange={setIsDeleteTypeDialogOpen}
      >
        {/* Delete Type Dialog Content */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete quiz type "
              <span className="font-medium capitalize">{quizTypeToDelete}</span>
              " and all its questions? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuizTypeToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteQuizType}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete Type
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        {/* Reset Progress Dialog Content */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset User Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              Simulate resetting progress for "
              <span className="font-medium capitalize">{quizTypeToReset}</span>"
              quiz, allowing users to retake it?{" "}
              <strong className="text-amber-700 dark:text-amber-500 block mt-2">
                Requires backend function for actual data deletion.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuizTypeToReset(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeResetProgress}
              disabled={isLoading}
              className={buttonVariants({ variant: "secondary" })}
            >
              {isLoading ? "Processing..." : "Reset Progress (Simulated)"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ManageQuizzesPage;
