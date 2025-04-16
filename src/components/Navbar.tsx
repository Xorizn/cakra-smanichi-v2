'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, LogIn } from 'lucide-react' // Import necessary icons
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { signOut } from 'firebase/auth'; // Import signOut
import { Button } from '@/components/ui/button'
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading } = useAuth(); // Use the auth context
  const router = useRouter();
  const { toast } = useToast();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    setIsOpen(false); // Close menu on action
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/'); // Redirect to home after logout
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const renderAuthSection = (isMobile = false) => {
    if (loading) {
      return <Skeleton className={`h-8 ${isMobile ? 'w-full' : 'w-20'}`} />;
    }

    if (user) {
      // Logged In state
      return (
        <div className={`flex ${isMobile ? 'flex-col w-full gap-2' : 'items-center gap-4'}`}>
          <span className={`text-sm ${isMobile ? 'px-3 pt-2 text-muted-foreground' : 'text-foreground'}`}>
            {user.email}
          </span>
          <Button
            variant={isMobile ? "ghost" : "secondary"}
            size="sm"
            onClick={handleLogout}
            className={`w-full ${!isMobile ? 'max-w-xs' : 'text-left justify-start'}`}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      );
    } else {
      // Logged Out state
      return (
        <Link href="/login" passHref legacyBehavior>
          <Button
            asChild
            variant={isMobile ? "ghost" : "outline"}
            size="sm"
            onClick={() => setIsOpen(false)} // Close menu on click
            className={`w-full ${!isMobile ? 'max-w-xs' : 'text-left justify-start'}`}
          >
            <a>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </a>
          </Button>
        </Link>
      );
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo/Brand Name */}
        <Link
          href="/"
          className="mr-6 flex items-center space-x-2"
          onClick={() => setIsOpen(false)}
        >
          {/* Replace with actual logo if available */}
          {/* <Mountain className="h-6 w-6" /> */}
          <img
            src="/logo.png"
            className="h-10 w-auto object-contain"
            alt="YRC Logo"
          />
        </Link>

        {/* Desktop Menu & Auth */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/cakra"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Cakra
          </Link>
          {/* You might add a link to a user dashboard/profile here if logged in */}
          {/* Example: {user && <Link href="/dashboard" ...>Dashboard</Link>} */}
          <div className="flex items-center">{renderAuthSection()}</div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open main menu</span>
            {isOpen ? (
              <X className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu (Dropdown) */}
      {isOpen && (
        <div className="md:hidden border-t border-border/40">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              href="/"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              href="/cakra"
              className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={toggleMenu}
            >
              Cakra
            </Link>
            {/* Add other mobile links if needed */}
            <div className="pt-2 border-t border-border/40 mt-2">
              {renderAuthSection(true)} {/* Render mobile auth section */}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
