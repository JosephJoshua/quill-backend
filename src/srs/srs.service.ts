import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CardState, Flashcard } from './entity/flashcard.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { State } from 'ts-fsrs';
import { getNextReviewState } from './fsrs.helper';

@Injectable()
export class SrsService {
  constructor(
    @InjectRepository(Flashcard)
    private flashcardRepository: Repository<Flashcard>,
  ) {}

  async create(userId: string, dto: CreateFlashcardDto) {
    const newFlashcard = this.flashcardRepository.create({
      ...dto,
      userId,
      dueDate: new Date(), // New cards are due immediately
      state: CardState.New,
    });

    return this.flashcardRepository.save(newFlashcard);
  }

  async update(userId: string, flashcardId: string, dto: UpdateFlashcardDto) {
    const flashcard = await this.flashcardRepository.findOneBy({
      id: flashcardId,
    });

    if (!flashcard) throw new NotFoundException('Flashcard not found.');
    if (flashcard.userId !== userId)
      throw new ForbiddenException('You do not own this flashcard.');

    Object.assign(flashcard, dto);
    return this.flashcardRepository.save(flashcard);
  }

  async remove(userId: string, flashcardId: string): Promise<void> {
    const result = await this.flashcardRepository.delete({
      id: flashcardId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Flashcard not found or you do not own it.');
    }
  }

  getReviewQueue(userId: string) {
    return this.flashcardRepository.find({
      where: { userId, dueDate: LessThanOrEqual(new Date()) },
      order: { dueDate: 'ASC' },
    });
  }

  async submitReview(userId: string, reviewDto: SubmitReviewDto) {
    const { flashcardId, rating } = reviewDto;
    const flashcard = await this.flashcardRepository.findOneBy({
      id: flashcardId,
      userId,
    });

    if (!flashcard)
      throw new NotFoundException('Flashcard not found for this user.');

    const now = new Date();
    const nextState = getNextReviewState(
      flashcard,
      flashcard.lastReviewedAt || now,
      now,
      rating,
    );

    flashcard.stability = nextState.card.stability;
    flashcard.difficulty = nextState.card.difficulty;
    flashcard.dueDate = nextState.card.due;
    flashcard.lapses = nextState.card.lapses;
    flashcard.learningSteps = nextState.card.learning_steps;
    flashcard.reps = nextState.card.reps;
    flashcard.lastReviewedAt = now;

    switch (nextState.card.state) {
      case State.New:
        flashcard.state = CardState.New;
        break;
      case State.Review:
        flashcard.state = CardState.Review;
        break;
      case State.Learning:
        flashcard.state = CardState.Learning;
        break;
      case State.Relearning:
        flashcard.state = CardState.Relearning;
        break;
    }

    await this.flashcardRepository.save(flashcard);

    return {
      message: 'Review submitted successfully.',
      nextDueDate: flashcard.dueDate,
    };
  }
}
