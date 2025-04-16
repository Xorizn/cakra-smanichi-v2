// src/app/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    createUserWithEmailAndPassword, 
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
import { Icons } from "@/components/icons"

// Define Admin Email
const ADMIN_EMAIL = "admin@editor.com";

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const createUserProfile = async (user: any) => {
    try {
        const userRef = doc(db, "users", user.uid);
        // Check if the signing up user is the admin based on email
        const isAdminUser = user.email === ADMIN_EMAIL;
        
        const profileData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || email.split('@')[0], // Use email part if signing up with email
            isAdmin: isAdminUser, // *** Add the isAdmin flag ***
            photoURL: user.photoURL, // Include photoURL from Google
            createdAt: serverTimestamp(),
            // Initialize lastLogin during creation
            lastLogin: serverTimestamp()
        };

        // Use merge:true just in case (e.g., re-running signup) but main goal is creation here
        await setDoc(userRef, profileData, { merge: true }); 
        console.log(`User profile ${isAdminUser ? '(Admin)' : ''} created/updated in Firestore`);
    } catch (error) {
        console.error("Error creating/updating user profile:", error);
        // Non-critical for signup flow, just log it
    }
  }

  const handleSignupEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
        toast({ title: "Missing Fields", description: "Please enter email and password.", variant: "destructive" })
        return
    }
    // Prevent non-admin from trying to sign up with the admin email
    // (Password check is implicit via createUserWithEmailAndPassword)
    if (email === ADMIN_EMAIL) {
         toast({ title: "Signup Error", description: "Admin account cannot be created here. Please log in.", variant: "destructive" });
         return;
    }

    setIsLoadingEmail(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfile(userCredential.user);
      toast({
        title: "Signup Successful",
        description: "Welcome! You are now logged in.",
      })
      router.push('/') // Redirect regular users to home
    } catch (error) {
      console.error("Email Signup failed:", error)
      let description = "An unexpected error occurred.";
      if (error instanceof Error && 'code' in error) {
         switch ((error as any).code) {
            case 'auth/email-already-in-use':
                description = "This email is already registered. Please log in.";
                break;
            case 'auth/weak-password':
                description = "Password should be at least 6 characters.";
                break;
            case 'auth/invalid-email':
                description = "Please enter a valid email address.";
                break;
            default:
                description = error.message;
         }
      } else if (error instanceof Error) {
        description = error.message;
      }
       toast({
        title: "Signup Failed",
        description: description,
        variant: "destructive",
      })
    } finally {
      setIsLoadingEmail(false)
    }
  }

   const handleSignupGoogle = async () => {
    setIsLoadingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        // SECURITY: Prevent Google sign-in if the email matches the ADMIN_EMAIL
        if (result.user.email === ADMIN_EMAIL) {
            await signOut(auth); // Sign out the user immediately
            toast({ title: "Admin Login Required", description: "Admin account requires email/password login.", variant: "destructive" });
            setIsLoadingGoogle(false);
            return; // Stop processing
        }
        // For regular users, create profile
        await createUserProfile(result.user);
        toast({ title: "Signed in with Google", description: "Welcome!" });
        router.push('/');
    } catch (error) {
        if (error instanceof Error && 'code' in error && (error as any).code === 'auth/cancelled-popup-request') {
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
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create an account to start taking quizzes.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignupEmail}>
          <CardContent className="grid gap-4">
             <Button 
                variant="outline" 
                type="button" 
                disabled={isLoadingEmail || isLoadingGoogle}
                onClick={handleSignupGoogle}
                title="Admin account cannot be created/accessed via Google Sign-Up"
             >
                {isLoadingGoogle ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                )}{ " "}
                 Sign Up with Google
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
                placeholder="********"
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
              Create Account
            </Button>
             <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline hover:text-primary">
                    Login
                </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
