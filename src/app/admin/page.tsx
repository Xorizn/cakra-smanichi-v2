// src/app/admin/page.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Edit, Users, ListChecks } from 'lucide-react'; // Added ListChecks

// This component assumes it's rendered by the AdminLayout when logged in
function AdminDashboard() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <p className="mb-6 text-muted-foreground">Select a section to manage.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Quiz Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Management</CardTitle>
            <CardDescription>Manage quiz types and questions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
             <Link href="/admin/quizzes" passHref legacyBehavior>
                <Button variant="outline" className="w-full justify-start">
                   <Edit className="mr-2 h-4 w-4" /> Manage Quizzes/Questions
               </Button>
            </Link>
          </CardContent>
        </Card>

         {/* Results Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>View and manage user quiz submissions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
             <Link href="/admin/results" passHref legacyBehavior>
                <Button variant="outline" className="w-full justify-start">
                   <ListChecks className="mr-2 h-4 w-4" /> Manage Results
               </Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Export the component directly, layout handles auth
export default AdminDashboard;
