import { useEffect, useRef, useState } from 'react';
import type { Entry } from '../types';
import { IconClose, IconTrash } from './icons';

interface Props {
  entry: Entry | null;
  onClose: () => void;
  onCreate: (payload: { title: string; body: string }) => Promise<Entry>;
  onPatch: (id: number, patch: Record<string, unknown>) => Promise<Entry>;
  onDelete: (id: number) => Promise<void>;
}

interface Draft {
  title: string;
  body: string;
}

const toDraft = (entry: Entry | null): Draft => ({
  title: entry?.title ?? '',
  body: entry?.body ?? '',
});

export default function EntryDetail({ entry, onClose, onCreate, onPatch, onDelete }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry));
  const [local, setLocal] = useState<Entry | null>(entry);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // 用 ref 保持最新的草稿与实体，避免 debounce 回调读到旧闭包。
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const localRef = useRef(local);
  localRef.current = local;

  const commitRef = useRef<() => Promise<void>>(async () => {});
  commitRef.current = async () => {
    const title = draftRef.current.title.trim();
    const body = draftRef.current.body;
    if (!title && !body.trim()) return;

    setSaving(true);
    try {
      const current = localRef.current;
      if (!current) {
        // 新建模式：首次有内容时才真正落库，避免产生空笔记。
        const created = await onCreate({ title, body });
        localRef.current = created;
        setLocal(created);
      } else {
        const updated = await onPatch(current.id, { title, body });
        localRef.current = updated;
        setLocal(updated);
      }
      setDirty(false);
      setJustSaved(true);
    } catch {
      // 失败提示由 App 统一展示，不清空用户输入。
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void commitRef.current();
    }, 800);
    return () => clearTimeout(timer);
  }, [draft, dirty]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const update = (key: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setJustSaved(false);
  };

  const isDone = local?.status === 'done';
  const hint = saving ? '保存中…' : dirty ? '未保存' : justSaved ? '已保存' : '';

  const toggleDone = async () => {
    if (!local) return;
    try {
      const updated = await onPatch(local.id, { status: isDone ? 'inbox' : 'done' });
      localRef.current = updated;
      setLocal(updated);
    } catch {
      // App 已提示
    }
  };

  const remove = async () => {
    if (!local) return;
    if (!window.confirm('删除后无法恢复，确定删除这条笔记？')) return;
    try {
      await onDelete(local.id);
    } catch {
      // App 已提示
    }
  };

  return (
    <div className="detail is-open" role="dialog" aria-label="笔记详情">
      <div className="detail-head">
        <span className="detail-mode">{local ? '编辑笔记' : '新建笔记'}</span>
        <span className="save-hint">{hint}</span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            void commitRef.current().then(onClose);
          }}
          aria-label="关闭"
        >
          <IconClose />
        </button>
      </div>

      <div className="detail-body">
        <input
          className="title-input"
          value={draft.title}
          placeholder="标题"
          autoFocus={!local}
          onChange={(event) => update('title', event.target.value)}
        />
        <textarea
          className="body-input"
          value={draft.body}
          placeholder="写点什么…"
          onChange={(event) => update('body', event.target.value)}
        />
      </div>

      <div className="detail-foot">
        {local && (
          <button
            type="button"
            className={`btn ${isDone ? '' : 'primary'}`}
            onClick={() => void toggleDone()}
          >
            {isDone ? '取消完成' : '标记完成'}
          </button>
        )}

        {local ? (
          <button type="button" className="btn danger" onClick={() => void remove()}>
            <IconTrash />
            删除
          </button>
        ) : (
          <span className="save-hint">输入标题或正文后自动保存</span>
        )}
      </div>
    </div>
  );
}
