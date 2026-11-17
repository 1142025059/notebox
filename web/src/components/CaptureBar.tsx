import { useRef, useState } from 'react';
import type { Kind } from '../types';
import { IconPlus } from './icons';

interface Props {
  onSubmit: (input: { kind: Kind; text: string }) => Promise<void>;
}

export default function CaptureBar({ onSubmit }: Props) {
  const [kind, setKind] = useState<Kind>('todo');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;

    setBusy(true);
    try {
      await onSubmit({ kind, text: value });
      setText('');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="capture">
      <div className="capture-kind" role="group" aria-label="记录类型">
        <button
          type="button"
          className={`kind-pill ${kind === 'todo' ? 'is-on' : ''}`}
          onClick={() => setKind('todo')}
        >
          待办
        </button>
        <button
          type="button"
          className={`kind-pill ${kind === 'note' ? 'is-on' : ''}`}
          onClick={() => setKind('note')}
        >
          笔记
        </button>
      </div>

      <input
        id="capture-input"
        ref={inputRef}
        value={text}
        placeholder={kind === 'todo' ? '记一件待办，回车存进收件箱' : '记一条笔记，回车保存'}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void submit();
          }
        }}
      />

      <button
        type="button"
        className="capture-submit"
        onClick={() => void submit()}
        disabled={busy || !text.trim()}
        aria-label="保存"
      >
        <IconPlus />
      </button>
    </div>
  );
}
