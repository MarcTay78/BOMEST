import { useEffect, useState } from 'react';
import { dataStore } from '../data';
import type { ListKind } from '../lib/types';

interface Props {
  kind: ListKind;
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  id?: string;
}

/** Dropdown sourced from a maintained pick-list (see Lists page / OptionListManager). */
export function OptionSelect({ kind, value, onChange, style, id }: Props) {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    dataStore.listOptions(kind).then((options) => setNames(options.map((o) => o.name)));
  }, [kind]);

  // A stored value that's since been removed from the list still shows, so nothing silently blanks out.
  const allNames = value && !names.includes(value) ? [value, ...names] : names;

  return (
    <select id={id} className="input" style={style} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {allNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
