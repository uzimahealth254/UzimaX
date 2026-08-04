import { useRef, useState } from 'react';
import { getAccessToken } from '@/lib/apiClient';
import { getApiBaseUrl } from '@/lib/apiBase';
import { toast } from 'sonner';
import { Paperclip, X } from 'lucide-react';

interface DocMeta {
  id?: string;
  name: string;
  size: number;
  url?: string;
  fileUrl?: string;
  docType?: string;
  category?: string;
}

interface Props {
  onChange?: (docs: DocMeta[]) => void;
  defaultDocType?: string;
}

/** Uploads to Uzima /documents/upload and returns metadata */
export default function DocumentAttach({ onChange, defaultDocType = 'supporting' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('docType', defaultDocType);
      const base = `${getApiBaseUrl()}/api/v1`;
      const res = await fetch(`${base}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const next = [...docs, {
        id: data.id,
        name: file.name,
        size: file.size,
        url: data.fileUrl,
        fileUrl: data.fileUrl,
        docType: data.docType || defaultDocType,
      }];
      setDocs(next);
      onChange?.(next);
      toast.success('Document uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 text-sm text-primary"
      >
        <Paperclip size={14} /> {busy ? 'Uploading…' : 'Attach invoice / proposal'}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <ul className="space-y-1">
        {docs.map((d, i) => (
          <li key={`${d.name}-${i}`} className="text-xs flex items-center gap-2 text-muted-foreground">
            {d.name}
            <button
              type="button"
              onClick={() => {
                const next = docs.filter((_, j) => j !== i);
                setDocs(next);
                onChange?.(next);
              }}
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
