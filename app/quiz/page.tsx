import type { Metadata } from 'next'
import QuizFlow from '@/components/froot/QuizFlow'

export const metadata: Metadata = {
  title: "What's Your Froot? \u2014 3 questions, unhinged accuracy",
  description: '8 chest shapes. 3 questions. Find yours in 10 seconds.',
  openGraph: {
    title: "What's Your Froot?",
    description: '8 chest shapes. 3 questions. Find yours in 10 seconds.',
    url: 'https://froot.fit/quiz',
  },
}

export default function QuizPage() {
  return <QuizFlow />
}
