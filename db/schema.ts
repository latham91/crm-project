import { pgTable, uuid, varchar, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "ADMIN"]);
export const membershipTypeEnum = pgEnum("membership_type", ["ACTIVE", "INACTIVE", "PENDING", "EXPIRED"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["ATTENDED", "NO_SHOW", "CANCELLED", "EXCUSED"]);

// Users table (for authentication)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: roleEnum("role").notNull().default("ADMIN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members table (CRM contacts)
export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  category: varchar("category", { length: 255 }),
  membershipType: membershipTypeEnum("membership_type").notNull().default("PENDING"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Groups table (networking groups)
export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leaderId: uuid("leader_id")
    .references(() => users.id)
    .notNull(),
  meetingFrequency: varchar("meeting_frequency", { length: 100 }),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Group Members junction table (many-to-many)
export const groupMembers = pgTable("group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  memberId: uuid("member_id")
    .references(() => members.id, { onDelete: "cascade" })
    .notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Meetings table
export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id, { onDelete: "cascade" })
    .notNull(),
  memberId: uuid("member_id")
    .references(() => members.id, { onDelete: "cascade" })
    .notNull(),
  status: attendanceStatusEnum("status").notNull().default("ATTENDED"),
  checkedInAt: timestamp("checked_in_at"),
});

// Member Notes table (activity log for members)
export const memberNotes = pgTable("member_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  memberId: uuid("member_id")
    .references(() => members.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations (optional but helpful for queries)
export const usersRelations = relations(users, ({ many }) => ({
  groups: many(groups),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  leader: one(users, {
    fields: [groups.leaderId],
    references: [users.id],
  }),
  groupMembers: many(groupMembers),
  meetings: many(meetings),
}));

export const membersRelations = relations(members, ({ many }) => ({
  groupMembers: many(groupMembers),
  attendance: many(attendance),
  notes: many(memberNotes),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  member: one(members, {
    fields: [groupMembers.memberId],
    references: [members.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  group: one(groups, {
    fields: [meetings.groupId],
    references: [groups.id],
  }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  meeting: one(meetings, {
    fields: [attendance.meetingId],
    references: [meetings.id],
  }),
  member: one(members, {
    fields: [attendance.memberId],
    references: [members.id],
  }),
}));

export const memberNotesRelations = relations(memberNotes, ({ one }) => ({
  member: one(members, {
    fields: [memberNotes.memberId],
    references: [members.id],
  }),
  user: one(users, {
    fields: [memberNotes.userId],
    references: [users.id],
  }),
}));
