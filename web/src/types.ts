export type Kind = 'todo' | 'note';
export type Status = 'inbox' | 'doing' | 'done' | 'dropped';

export type ViewKey =
  | 'all'
  | 'inbox'
  | 'todo'
  | 'note'
  | 'today'
  | 'done'
  | 'archived'
  | 'trash';

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
  all: number;
  inbox: number;
  todo: number;
  note: number;
  today: number;
  done: number;
  archived: number;
  trash: number;
}

export interface TagCount {
  id: number;
  name: string;
  count: number;
}

export const VIEW_LABELS: Record<ViewKey, string> = {
  all: '全部',
  inbox: '收件箱',
  todo: '待办',
  note: '笔记',
  today: '今天到期',
  done: '已完成',
  archived: '已归档',
  trash: '回收站',
};
