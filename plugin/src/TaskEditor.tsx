import { createContext, useContext, useRef, useState, type ComponentType } from 'react';

/** Text only. Todo owns identity, hierarchy, persistence and execution. */
export interface TodoTaskEditorProps {
  scope: string;
  taskId: string;
  content: string;
  readOnly: boolean;
  onChange(content: string): void;
}
export const TaskEditorContext = createContext<ComponentType<TodoTaskEditorProps> | undefined>(undefined);
export const useTaskEditor = () => useContext(TaskEditorContext);

/** Fence callbacks retained by an editor across record/account refreshes. */
export function TaskEditorBridge(props: TodoTaskEditorProps & { editor: ComponentType<TodoTaskEditorProps> }) {
  const { editor: Editor, ...input } = props;
  const latest = useRef(input);
  latest.current = input;
  const [error, setError] = useState('');
  return <div className="todo-task-editor">
    <Editor {...input} onChange={content => {
      const current = latest.current;
      if (current.readOnly || current.scope !== input.scope || current.taskId !== input.taskId
        || current.content !== input.content) {
        setError('This task changed. Reopen the passage before saving.'); return;
      }
      if (!content.trim()) { setError('Task text cannot be empty.'); return; }
      setError('');
      if (content !== current.content) current.onChange(content);
    }} />
    {error && <p role="alert">{error}</p>}
  </div>;
}
