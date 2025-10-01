"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface QuestionProps {
  question: {
    // Use string for Firestore ID consistency
    id: string | number; // Allow number for potential legacy IDs from previous state
    text: string;
    options: string[];
    correctAnswer: string;
  };
  questionIndex: number;
  selectedAnswer?: string;
  onAnswerSelect: (questionIndex: number, answer: string) => void;
  isDisabled?: boolean; // Add isDisabled prop
}

const QuestionCard: React.FC<QuestionProps> = ({ 
  question, 
  questionIndex, 
  selectedAnswer, 
  onAnswerSelect, 
  isDisabled = false // Default to false
}) => {
  const [value, setValue] = useState(selectedAnswer);

  // Update internal state if the selectedAnswer prop changes
  useEffect(() => {
    setValue(selectedAnswer);
  }, [selectedAnswer]);

  const handleValueChange = (selectedValue: string) => {
    if (isDisabled) return; // Prevent changes if disabled
    setValue(selectedValue);
    onAnswerSelect(questionIndex, selectedValue);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0 mb-4">
        <p>
          Q{questionIndex + 1}: {question.text}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <RadioGroup
          value={value}
          onValueChange={handleValueChange}
          className="flex flex-col gap-3"
          disabled={isDisabled} // Disable the entire group if needed
        >
          {question.options.map((option) => (
            <Label
              key={option}
              htmlFor={`${question.id}-${option}`}
              className={cn(
                "flex items-center space-x-3 space-y-0 border rounded-md p-3 transition-colors",
                isDisabled
                  ? "cursor-not-allowed opacity-70 bg-muted/50"
                  : "cursor-pointer hover:bg-muted/50",
                value === option && !isDisabled && "border-primary bg-muted", // Style for selected item (only if not disabled)
                value === option &&
                  isDisabled &&
                  "border-primary bg-muted opacity-90", // Slightly different style for selected but disabled
                // Add styles to show correct/incorrect after submission (optional)
                isDisabled &&
                  option === question.correctAnswer &&
                  "cursor-not-allowed opacity-70 bg-muted/50",
                isDisabled &&
                  value === option &&
                  option !== question.correctAnswer &&
                  "cursor-not-allowed opacity-70 bg-muted/50"
              )}
            >
              <RadioGroupItem
                value={option}
                id={`${question.id}-${option}`}
                disabled={isDisabled} // Also disable individual items
              />
              <span>{option}</span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
