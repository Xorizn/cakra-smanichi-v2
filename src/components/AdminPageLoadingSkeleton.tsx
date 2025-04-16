// src/components/AdminPageLoadingSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AdminPageLoadingSkeleton() {
    return (
        <div className="container mx-auto py-8">
            {/* Skeleton for Page Title */}
            <Skeleton className="h-9 w-1/3 mb-6" /> 
            
            {/* Skeleton for Content Area (e.g., cards or table) */}
            <Card>
                <CardHeader>
                    {/* Skeleton for Card Title or Actions */}
                    <Skeleton className="h-6 w-1/4 mb-4" /> 
                </CardHeader>
                <CardContent>
                    {/* Skeleton for multiple items/rows */}
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
