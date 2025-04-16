// src/app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut // Import signOut
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'
import { Icons } from "@/components/icons";

// Define Admin Email
const ADMIN_EMAIL = "admin@editor.com";

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const createUserProfile = async (user: any, isGoogleSignIn = false) => {
    try {
        const userRef = doc(db, "users", user.uid);
        // Check if the logged-in user is the admin
        const isAdminUser = user.email === ADMIN_EMAIL;
        
        // SECURITY: Prevent non-admin Google account from logging into admin account via profile merge
        // Although unlikely with separate flows, this adds a safety layer.
        if (isAdminUser && isGoogleSignIn) {
             console.warn("Attempt to sign into admin account via Google blocked during profile creation.");
             await signOut(auth); // Sign out the user immediately
             toast({ title: "Admin Login Required", description: "Please log in using the admin email and password.", variant: "destructive" });
             throw new Error("Admin Google sign-in blocked"); // Throw to stop further processing
        }

        // Prepare data, ensuring isAdmin flag is set correctly
        const profileData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL,
            isAdmin: isAdminUser, // *** Add/Update isAdmin flag ***
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp(), 
        };

        // Use merge: true to update existing fields like lastLogin 
        // and crucially add isAdmin if it wasn't there, without overwriting createdAt.
        await setDoc(userRef, profileData, { merge: true }); 

        console.log(`User profile ${isAdminUser ? '(Admin)' : ''} updated/checked in Firestore`);
    } catch (error) {
        console.error("Error updating user profile:", error);
        // Re-throw specific errors if needed elsewhere, like the Google sign-in block
        if (error instanceof Error && error.message === "Admin Google sign-in blocked") {
            throw error; 
        }
        // Otherwise, don't block login for profile write errors, just log it.
    }
  }

  const handleLoginEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingEmail(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Pass false for isGoogleSignIn
      await createUserProfile(userCredential.user, false); 
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      })
      // Check if admin and redirect to /admin, otherwise / 
      if (userCredential.user.email === ADMIN_EMAIL) {
           router.push('/admin'); 
      } else {
           router.push('/'); 
      }
    } catch (error) {
      console.error("Email Login failed:", error)
      let description = "Invalid email or password.";
       if (error instanceof Error && 'code' in error) {
            switch((error as any).code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    description = "Invalid email or password. Please try again.";
                    break;
                 case 'auth/invalid-email':
                     description = "Please enter a valid email address.";
                     break;
            }
       }
      toast({
        title: "Login Failed",
        description: description,
        variant: "destructive",
      })
    } finally {
        setIsLoadingEmail(false)
    }
  }

 const handleLoginGoogle = async () => {
    setIsLoadingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        // Pass true for isGoogleSignIn - this will block if email matches ADMIN_EMAIL
        await createUserProfile(result.user, true); 
        toast({ title: "Signed in with Google", description: "Welcome!" });
        router.push('/'); // Regular users go to home after Google sign-in
    } catch (error) {
        if (error instanceof Error && error.message === "Admin Google sign-in blocked") {
           console.log("Admin sign-in via Google prevented."); // Toast already shown in createUserProfile
        } else if (error instanceof Error && 'code' in error && (error as any).code === 'auth/cancelled-popup-request') {
            console.log("Google Sign-in popup cancelled by user.");
        } else {
            console.error("Google Sign-in failed:", error);
            toast({
                title: "Google Sign-in Failed",
                description: error instanceof Error ? error.message : "Could not sign in with Google.",
                variant: "destructive",
            });
        }
    } finally {
        setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLoginEmail}>
          <CardContent className="grid gap-4">
             <Button 
                variant="outline" 
                type="button" 
                disabled={isLoadingEmail || isLoadingGoogle}
                onClick={handleLoginGoogle}
                title="Admin cannot sign in via Google"
             >
                {isLoadingGoogle ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                )}{ " "}
                 Sign In with Google
            </Button>

             <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoadingEmail || isLoadingGoogle}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoadingEmail || isLoadingGoogle}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoadingEmail || isLoadingGoogle}>
              {isLoadingEmail && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="underline hover:text-primary">
                    Sign up
                </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
