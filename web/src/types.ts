export type Kind = 'note' | 'todo';
export type Status = 'inbox' | 'doing' | 'done' | 'dropped';

export type ViewKey = 'notes' | 'done';

export interface Entry {
  id: number;
  kind: Kind;
  title: string;
  body: string;
  status: Status;
  priority: number;
  due_at: string | null;
  remind_at: string | null;
  pinned: boolean;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface Stats {
  notes: number;
  done: number;
}

export const VIEW_LABELS: Record<ViewKey, string> = {
  notes: '全部笔记',
  done: '已完成笔记',
};
