"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  writeBatch,
} from "firebase/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Trash2, RefreshCcw, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define User interface based on your existing code
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAdmin: boolean;
  lastLogin?: any; // Using any for the Firebase timestamp
  createdAt?: any;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersQuery = query(collection(db, "users"));
      const snapshot = await getDocs(usersQuery);

      if (snapshot.empty) {
        setUsers([]);
        return;
      }

      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as User;
        fetchedUsers.push({
          ...userData,
          uid: doc.id, // Ensure UID is set from the document ID
        });
      });

      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users.");
      toast({
        title: "Error",
        description: "Could not load users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const initiateDeleteUser = (uid: string) => {
    setUserToDelete(uid);
    setIsDeleteDialogOpen(true);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      // Delete the user document from Firestore
      await deleteDoc(doc(db, "users", userToDelete));

      // Update local state
      setUsers((prev) => prev.filter((user) => user.uid !== userToDelete));

      toast({
        title: "Success",
        description: "User has been deleted.",
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const initiateReset = () => {
    setIsResetDialogOpen(true);
  };

  const executeReset = async () => {
    setIsResetting(true);
    try {
      // Using batch to efficiently handle multiple deletes
      const batch = writeBatch(db);

      // Get all quiz results
      const resultsSnapshot = await getDocs(collection(db, "quizResults"));

      // Add all result documents to batch delete
      resultsSnapshot.forEach((resultDoc) => {
        batch.delete(doc(db, "quizResults", resultDoc.id));
      });
      const usersSnapshot = await getDocs(collection(db, "users"));

      // Add all result documents to batch delete
      usersSnapshot.forEach((resultDoc) => {
        batch.delete(doc(db, "users", resultDoc.id));
      });

      // Execute the batch
      await batch.commit();

      toast({
        title: "Reset Complete",
        description: "All non-admin users and quiz results have been deleted.",
      });

      // Refresh the user list
      fetchUsers();
    } catch (err) {
      console.error("Error during reset:", err);
      toast({
        title: "Reset Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not complete the reset operation.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  if (isLoading && users.length === 0) {
    return <AdminPageLoadingSkeleton />;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button
          variant="destructive"
          onClick={initiateReset}
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset All Users & Results
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="bg-destructive/10 border-destructive mb-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts in your application. Delete users as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 && !isLoading ? (
            <p className="text-center text-muted-foreground py-6">
              No users found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">
                      {user.displayName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/10">
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(
                            user.lastLogin.seconds * 1000
                          ).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => initiateDeleteUser(user.uid)}
                        disabled={user.isAdmin || isDeleting}
                        title={
                          user.isAdmin
                            ? "Cannot delete admin user"
                            : "Delete user"
                        }
                        className={
                          user.isAdmin
                            ? "opacity-50 cursor-not-allowed"
                            : "text-destructive hover:text-destructive/80"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          &larr; Back to Admin Dashboard
        </Link>
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user will be permanently deleted
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteUser}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <UserX className="mr-2 h-5 w-5" /> Reset All Users and Quiz
              Results
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                This action will <strong>permanently delete</strong>:
              </p>
              <ul className="list-disc pl-5 mb-2">
                <li>All non-admin user accounts</li>
                <li>All quiz result records</li>
              </ul>
              <p className="font-semibold">
                This cannot be undone. Are you absolutely sure?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeReset}
              disabled={isResetting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isResetting ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Yes, Reset Everything"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
