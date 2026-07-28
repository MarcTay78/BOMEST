import { useEffect, useState, type FormEvent } from 'react';
import { useIsAdmin } from '../auth/AuthContext';
import { DeleteBlockedError, dataStore } from '../data';
import type { ListKind, ListOption } from '../lib/types';
import { EditIcon, TrashIcon, WarningIcon } from './icons';

interface Props {
  kind: ListKind;
  label: string;
}

export function OptionListManager({ kind, label }: Props) {
  const isAdmin = useIsAdmin();
  const [options, setOptions] = useState<ListOption[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = () => dataStore.listOptions(kind).then(setOptions);
  useEffect(() => {
    reload();
  }, [kind]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await dataStore.addOption(kind, trimmed);
      setNewName('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add.');
    }
  };

  const startEdit = (option: ListOption) => {
    setEditingId(option.id);
    setEditValue(option.name);
  };

  const commitEdit = async (id: string) => {
    setEditingId(null);
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await dataStore.renameOption(kind, id, trimmed);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await dataStore.deleteOption(kind, id);
      await reload();
    } catch (err) {
      if (err instanceof DeleteBlockedError) setError(`Can't delete — used in ${err.usedByCount} place(s).`);
      else setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  };

  return (
    <div className="card elev-sm" style={{ padding: 18, gap: 12 }}>
      <div className="card-title">{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.length === 0 && <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>No entries yet.</p>}
        {options.map((option) => (
          <div key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {editingId === option.id ? (
              <input
                className="input"
                style={{ minHeight: 30, flex: 1 }}
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(option.id)}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit(option.id)}
              />
            ) : (
              <span style={{ flex: 1, fontSize: 14 }}>{option.name}</span>
            )}
            {isAdmin && editingId !== option.id && (
              <>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Rename ${option.name}`} onClick={() => startEdit(option)}>
                  <EditIcon />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Delete ${option.name}`} onClick={() => handleDelete(option.id)}>
                  <TrashIcon />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {isAdmin && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <input className="input" style={{ minHeight: 32 }} placeholder="Add new…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className="btn btn-secondary">Add</button>
        </form>
      )}
      {error && (
        <div className="callout" style={{ fontSize: 12 }}>
          <WarningIcon size={13} />
          {error}
        </div>
      )}
    </div>
  );
}
