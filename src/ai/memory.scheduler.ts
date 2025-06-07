import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { LONG_TERM_MEMORY_UPDATE_QUEUE } from '../queue/queue.module';
import { User } from '../user/entity/user.entity';
import { Dialogue } from '../tutor/entity/dialogue.entity';
import { LongTermMemoryUpdateJobData } from './long-term-memory-update.processor';

@Injectable()
export class MemoryScheduler {
  private readonly logger = new Logger(MemoryScheduler.name);
  private readonly LTM_DIALOGUE_THRESHOLD = 30;

  constructor(
    @InjectQueue(LONG_TERM_MEMORY_UPDATE_QUEUE)
    private longTermMemoryUpdateQueue: Queue<LongTermMemoryUpdateJobData>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Dialogue)
    private dialogueRepository: Repository<Dialogue>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleScheduledMemoryUpdates() {
    this.logger.log('Starting scheduled check for long-term memory updates...');

    const users = await this.userRepository.find();
    for (const user of users) {
      const lastUpdate = user.longTermMemoryLastUpdatedAt;
      const newTurnsCount = await this.dialogueRepository.count({
        where: {
          conversation: { userId: user.id },
          timestamp: lastUpdate ? MoreThan(lastUpdate) : undefined,
        },
        relations: ['conversation'],
      });

      if (newTurnsCount === 0) continue;

      if (newTurnsCount >= this.LTM_DIALOGUE_THRESHOLD) {
        this.logger.log(
          `User ${user.id} has ${newTurnsCount} new turns, queuing LTM update.`,
        );

        await this.longTermMemoryUpdateQueue.add('update-long-term-memory', {
          userId: user.id,
        });
      }
    }

    this.logger.log('Scheduled memory update check finished.');
  }
}
