import { Card, fsrs, Grade, State } from 'ts-fsrs';
import { CardState, Flashcard } from './entity/flashcard.entity';

// TODO: FSRS Optimizer integration
const f = fsrs({
  learning_steps: ['1m', '10m', '60m'],
  relearning_steps: ['1m', '10m'],
  enable_fuzz: true,
  maximum_interval: 36500,
  request_retention: 0.92,
});

export function getNextReviewState(
  flashcard: Flashcard,
  lastReviewed: Date,
  now: Date,
  grade: Grade,
) {
  const state = ((): State => {
    switch (flashcard.state) {
      case CardState.NEW:
        return State.New;
      case CardState.REVIEW:
        return State.Review;
      case CardState.LEARNING:
        return State.Learning;
      case CardState.RELEARNING:
        return State.Relearning;
    }
  })();

  const card: Card = {
    due: flashcard.dueDate,
    stability: flashcard.stability,
    difficulty: flashcard.difficulty,
    lapses: flashcard.lapses,
    learning_steps: flashcard.learningSteps,
    last_review: lastReviewed,
    reps: flashcard.reps,
    state,

    // Calculated fields
    elapsed_days: 0,
    scheduled_days: 0,
  };

  return f.next(card, now, grade);
}
