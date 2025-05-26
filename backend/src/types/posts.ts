export interface GeneratePostInput {
  topic: string;
  tone: string;
  userId: string;
}

export interface Post {
  id: string;
  topic: string;
  tone: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulePostInput {
  postId: string;
  userId: string;
  publishAt: Date;
}

export interface ScheduledPost extends SchedulePostInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
