import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const dates = sqliteTable('dates', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id),
  dateString: text('date_string').notNull(),
});

export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => events.id),
  name: text('name').notNull(),
});

export const availabilities = sqliteTable('availabilities', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id),
  dateId: text('date_id').notNull().references(() => dates.id),
  status: integer('status').notNull(), // 0: ×, 1: △, 2: 〇
});
