/**
 * Static MCQ set for local UI testing — same shape as `/api/study/generate-quiz` output.
 * No Gemini calls; not for production content.
 */
export const DEMO_STUDY_QUIZ = {
  title: "Demo practice (static)",
  questions: [
    {
      question:
        "In a controlled experiment, what is the primary purpose of a control group?",
      options: [
        "To guarantee the hypothesis is correct",
        "To provide a baseline for comparison with the experimental group",
        "To eliminate the need for random assignment",
        "To increase the sample size without extra measurements",
      ],
      correctIndex: 1,
      explanation:
        "A control group is held under standard conditions (or without the treatment) so researchers can compare outcomes to the experimental group and isolate the effect of the variable being tested.",
      skillTag: "experimental_logic",
      topicLabel: "Scientific method",
    },
    {
      question:
        "A graph shows a linear increase in product concentration over time for an enzyme-catalyzed reaction. What does the initial slope of the curve best represent?",
      options: [
        "The total amount of substrate in the vessel",
        "The rate of reaction while substrate is abundant",
        "The point at which the enzyme has denatured",
        "Equilibrium between forward and reverse reactions only",
      ],
      correctIndex: 1,
      explanation:
        "Early in the reaction, substrate is typically plentiful; the slope of product vs. time reflects how fast product is being formed — i.e., the reaction rate under those conditions.",
      skillTag: "data_inference",
      topicLabel: "Rates & graphs",
    },
    {
      question:
        "Why can a scientific model be revised or replaced even if it was widely accepted?",
      options: [
        "Because older scientists retire from the field",
        "Because new evidence or better explanations can improve how well the model fits observations",
        "Because peer review always overturns previous work",
        "Because laws of nature change over decades",
      ],
      correctIndex: 1,
      explanation:
        "Science updates models when data, methods, or theories provide a more accurate or useful description — revision is a strength of the process, not a failure.",
      skillTag: "models_limits",
      topicLabel: "Nature of science",
    },
  ],
};
