export type Kind = 'note' | 'todo' | 'knowledge';
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

/** 单个模块的两个计数：未完成、已完成。 */
export interface ModuleStats {
  notes: number;
  done: number;
}

export type StatsMap = Record<Kind, ModuleStats>;
