// src/app/quiz/page.tsx
import QuizDisplay from '@/components/QuizDisplay'; // Import the component

// This is the page component for the /quiz route
export default function QuizPage() {
  // Render the QuizDisplay component. 
  // QuizDisplay itself will handle reading the search params (like 'type')
  // because it's marked with 'use client' and uses useSearchParams.
  return <QuizDisplay />;
}
