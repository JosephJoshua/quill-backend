import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CardState, Flashcard } from './entity/flashcard.entity';
import { Brackets, LessThanOrEqual, Repository } from 'typeorm';
import { CreateFlashcardDto } from './dto/create-flashcard.dto';
import { UpdateFlashcardDto } from './dto/update-flashcard.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { State } from 'ts-fsrs';
import { getNextReviewState } from './fsrs.helper';
import { FlashcardListQueryDto } from './dto/flashcard-list-query.dto';
import { PaginatedResponse } from 'src/util/paginated-response.interface';
import { FlashcardDto } from './dto/flashcard.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class SrsService {
  constructor(
    @InjectRepository(Flashcard)
    private flashcardRepository: Repository<Flashcard>,
  ) {}

  async findAll(
    userId: string,
    query: FlashcardListQueryDto,
  ): Promise<PaginatedResponse<FlashcardDto>> {
    const { page, limit, q, language } = query;
    const qb = this.flashcardRepository.createQueryBuilder('flashcard');
    qb.where('flashcard.userId = :userId', { userId });

    if (language) {
      qb.andWhere('flashcard.language = :language', { language });
    }

    if (q) {
      // Searches for the query string 'q' in either the front or back text
      qb.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('flashcard.frontText ILIKE :q', { q: `%${q}%` })
            .orWhere('flashcard.backText ILIKE :q', { q: `%${q}%` });
        }),
      );
    }

    qb.orderBy('flashcard.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const dtoData = data.map<FlashcardDto>((flashcard) => {
      return {
        ...flashcard,
        state: flashcard.state,
        language: flashcard.language,
      };
    });

    return {
      data: dtoData,
      meta: { total, page, limit, lastPage: Math.ceil(total / limit) },
    };
  }

  async create(userId: string, dto: CreateFlashcardDto) {
    const newFlashcard = this.flashcardRepository.create({
      ...dto,
      userId,
      dueDate: new Date(), // New cards are due immediately
      state: CardState.NEW,
      learningSteps: 0,
      reps: 0,
      lapses: 0,
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
        flashcard.state = CardState.NEW;
        break;
      case State.Review:
        flashcard.state = CardState.REVIEW;
        break;
      case State.Learning:
        flashcard.state = CardState.LEARNING;
        break;
      case State.Relearning:
        flashcard.state = CardState.RELEARNING;
        break;
    }

    await this.flashcardRepository.save(flashcard);

    return {
      message: 'Review submitted successfully.',
      nextDueDate: flashcard.dueDate,
    };
  }
}
