/**
 * data/ghpQuiz.js
 * GHP (Good Hauling Practices) Quiz questions and content
 */

export const GHP_CONTENT = [
  {
    id: "intro",
    type: "video",
    title: "Introduction to Good Hauling Practices",
    duration: 240, // seconds
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "safety",
    type: "video",
    title: "Safety First - Vehicle Maintenance",
    duration: 180,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "regulations",
    type: "video",
    title: "NMIS Regulations and Compliance",
    duration: 150,
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

export const GHP_QUIZ = {
  passingScore: 70,
  timeLimit: 600, // seconds
  questions: [
    {
      id: 1,
      question: "What does GHP stand for?",
      options: [
        { label: "Good Handling Practices", value: "a" },
        { label: "Good Hauling Practices", value: "b" },
        { label: "Great Heavy Products", value: "c" },
        { label: "Guided Highway Program", value: "d" },
      ],
      correctAnswer: "b",
      explanation: "GHP stands for Good Hauling Practices.",
    },
    {
      id: 2,
      question: "How often should vehicle maintenance be done?",
      options: [
        { label: "Monthly", value: "a" },
        { label: "Quarterly", value: "b" },
        { label: "Before each trip and regularly", value: "c" },
        { label: "Annually", value: "d" },
      ],
      correctAnswer: "c",
      explanation:
        "Vehicles should be maintained before each trip and regularly.",
    },
    {
      id: 3,
      question: "What is the maximum load capacity you should exceed?",
      options: [
        { label: "Never exceed the rated capacity", value: "a" },
        { label: "10% over rated capacity", value: "b" },
        { label: "20% over rated capacity", value: "c" },
        { label: "Load capacity doesn't matter", value: "d" },
      ],
      correctAnswer: "a",
      explanation: "Never exceed the rated load capacity of your vehicle.",
    },
    {
      id: 4,
      question: "What documents are required for MTV operation?",
      options: [
        { label: "Driver's license only", value: "a" },
        { label: "Vehicle registration only", value: "b" },
        { label: "OR/CR, Insurance, and GHP Certificate", value: "c" },
        { label: "No documents needed", value: "d" },
      ],
      correctAnswer: "c",
      explanation:
        "Required documents include OR/CR, Insurance, and GHP Certificate.",
    },
    {
      id: 5,
      question:
        "What should you do if your vehicle breaks down on the highway?",
      options: [
        { label: "Leave it and walk away", value: "a" },
        { label: "Set up warning signals and call for assistance", value: "b" },
        { label: "Continue driving despite the problem", value: "c" },
        { label: "Ignore it and report later", value: "d" },
      ],
      correctAnswer: "b",
      explanation:
        "Set up warning signals and call for professional assistance.",
    },
  ],
};

export function calculateScore(answers) {
  let correct = 0;
  GHP_QUIZ.questions.forEach((question) => {
    if (answers[question.id] === question.correctAnswer) {
      correct += 1;
    }
  });

  const total = GHP_QUIZ.questions.length;
  const score = (correct / total) * 100;
  const passed = score >= GHP_QUIZ.passingScore;

  return {
    correct,
    total,
    score: Math.round(score),
    passed,
  };
}
