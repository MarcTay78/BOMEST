import { useRef } from 'react';

interface Props {
  photoUrl: string | null;
  height?: number;
  editable: boolean;
  onUpload: (file: File) => void;
}

export function PhotoUpload({ photoUrl, height = 300, editable, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="photo-slot" style={{ height }}>
        {photoUrl ? <img src={photoUrl} alt="Product" /> : <span>Drop product photo</span>}
      </div>
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <button type="button" className="btn btn-secondary btn-block" onClick={() => inputRef.current?.click()}>
            {photoUrl ? 'Replace photo' : 'Upload photo'}
          </button>
        </>
      )}
    </div>
  );
}
