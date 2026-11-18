import type { Kind, ViewKey } from './types';

/**
 * 三个模块共用同一套「列表 + 详情 + 完成」逻辑，差异全部收敛在这里。
 * 新增模块时只需要加一条配置（外加后端 kind 白名单）。
 */
export interface ModuleDef {
  kind: Kind;
  /** hash 路由路径 */
  path: string;
  name: string;
  tagline: string;
  /** 单条记录的称呼：笔记 / 任务 / 知识 */
  itemLabel: string;
  newLabel: string;
  doneAction: string;
  undoAction: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  searchPlaceholder: string;
  emptyNotes: string;
  emptyDone: string;
  listTitle: Record<ViewKey, string>;
  counters: Record<ViewKey, string>;
  unit: string;
}

export const MODULES: ModuleDef[] = [
  {
    kind: 'note',
    path: '/notes',
    name: '笔记',
    tagline: '随手记下的备忘、碎片想法和临时信息',
    itemLabel: '笔记',
    newLabel: '新建笔记',
    doneAction: '标记完成',
    undoAction: '取消完成',
    titlePlaceholder: '标题',
    bodyPlaceholder: '写点什么…',
    searchPlaceholder: '搜索笔记（Ctrl+K）',
    emptyNotes: '还没有笔记。点左上角「新建笔记」开始记录。',
    emptyDone: '还没有已完成的笔记。',
    listTitle: { notes: '全部笔记', done: '已完成笔记' },
    counters: { notes: '未完成', done: '已完成' },
    unit: '条',
  },
  {
    kind: 'todo',
    path: '/tasks',
    name: '任务',
    tagline: '正在推进的事，做完就打个勾',
    itemLabel: '任务',
    newLabel: '新建任务',
    doneAction: '标记完成',
    undoAction: '取消完成',
    titlePlaceholder: '任务名',
    bodyPlaceholder: '补充说明…',
    searchPlaceholder: '搜索任务（Ctrl+K）',
    emptyNotes: '没有进行中的任务。点左上角「新建任务」开始。',
    emptyDone: '还没有已完成的任务。',
    listTitle: { notes: '全部任务', done: '已完成任务' },
    counters: { notes: '进行中', done: '已完成' },
    unit: '个',
   },
  {
    kind: 'knowledge',
    path: '/knowledge',
    name: '知识',
    tagline: '问题与答案的沉淀，方便以后回查',
    itemLabel: '知识',
    newLabel: '新建知识',
    doneAction: '标记掌握',
    undoAction: '取消掌握',
    titlePlaceholder: '问题',
    bodyPlaceholder: '答案…',
    searchPlaceholder: '搜索知识（Ctrl+K）',
    emptyNotes: '还没有知识条目。点左上角「新建知识」开始。',
    emptyDone: '还没有已掌握的知识。',
    listTitle: { notes: '全部知识', done: '已掌握' },
    counters: { notes: '未掌握', done: '已掌握' },
    unit: '条',
  },
];

export const HOME_PATH = '/';

export function findModule(path: string): ModuleDef | undefined {
  return MODULES.find((module) => module.path === path);
}

export function navigate(path: string) {
  if (window.location.hash === `#${path}`) return;
  window.location.hash = path;
}
