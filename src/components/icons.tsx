// src/components/icons.tsx
import {
  LucideProps,
  Loader2, // Spinner icon
} from "lucide-react"

// Google Icon (Simple SVG)
const Google = (props: LucideProps) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 1.98-4.71 1.98-3.87 0-7-3.13-7-7s3.13-7 7-7c1.73 0 3.26.58 4.47 1.7l2.46-2.46C18.19 1.84 15.62 1 12.48 1 7.18 1 3.16 4.94 3.16 10.25s4.02 9.25 9.32 9.25c2.82 0 5.15-.94 6.9-2.76 1.79-1.84 2.3-4.35 2.3-6.51 0-.65-.06-1.28-.17-1.9H12.48z" fill="currentColor"/>
  </svg>
)

export const Icons = {
  spinner: Loader2,
  google: Google,
}
