// src/components/AdminLogin.tsx
"use client";

import { useState } from 'react';
import { useAdminAuth } from '@/context/AdminContext';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Icons } from "./icons"; // For spinner
import { Lock } from 'lucide-react';

// WARNING: Hardcoding credentials in frontend is insecure!
const ADMIN_CREDENTIALS: Record<string, string> = {
  smanichi: "ZQ0W3RM7TY",
  adminlogin: "9A1JX8KDQZ",
  yrclogin200: "BXN47C9QAZ",
  admin800: "L18YVZUKMP",
};

export function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { loginAdmin } = useAdminAuth();
    const { toast } = useToast();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Simulate check (replace with secure backend check in real app)
        setTimeout(() => {
            if (ADMIN_CREDENTIALS[username] && ADMIN_CREDENTIALS[username] === password) {
                console.log(`Admin login successful for ${username}`);
                loginAdmin(); // Update context state
                toast({ title: "Admin Login Successful" });
                // No redirect needed, layout will show content
            } else {
                console.log("Admin login failed");
                setError("Invalid admin username or password.");
                toast({ title: "Admin Login Failed", description: "Invalid credentials.", variant: "destructive" });
            }
            setIsLoading(false);
        }, 500); // Simulate network delay
    };

    return (
        <div className="flex items-center justify-center h-screen bg-muted/40">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl flex items-center justify-center gap-2">
                        <Lock /> Admin Access Required
                    </CardTitle>
                    <CardDescription>
                        Please enter admin credentials to proceed.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="admin-username">Admin Username</Label>
                            <Input
                                id="admin-username"
                                placeholder="e.g., admin"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-password">Password</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        {error && (
                             <p className="text-sm font-medium text-destructive text-center">{error}</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                           {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                           Login as Admin
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
