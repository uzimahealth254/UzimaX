import { useQuery } from '@tanstack/react-query';
import { api, getAccessToken } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, ExternalLink } from 'lucide-react';

const DOC_TYPES = [
  { value: 'board_resolution', label: 'Board resolution' },
  { value: 'approval_certificate', label: 'Approval certificate' },
  { value: 'specimen_signature', label: 'Specimen signature' },
  { value: 'supporting', label: 'Supporting document' },
  { value: 'purchase_note', label: 'Purchase note' },
  { value: 'assignment_letter', label: 'Assignment letter' },
];

type Doc = { id: string; docType: string; fileUrl: string; uploadedAt: string };

export default function DocumentsPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('board_resolution');
  const [uploading, setUploading] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get('/documents')).data.data as Doc[],
  });

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('docType', docType);
      const base = (import.meta.env.VITE_API_URL || 'http://localhost:8787') + '/api/v1';
      const res = await fetch(`${base}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openDoc = async (d: Doc) => {
    const url = d.fileUrl.startsWith('http')
      ? d.fileUrl
      : `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}${d.fileUrl}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getAccessToken()}` } });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Documents"
        subtitle="Board resolutions, certificates, and generated transaction PDFs"
      />

      <div className="border rounded-2xl p-4 sm:p-5 space-y-4">
        <p className="text-sm font-medium">Upload</p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
          <div className="flex-1 min-w-0 sm:min-w-[200px]">
            <label className="text-xs text-muted-foreground">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="block w-full border rounded-lg px-3 py-2.5 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 w-full sm:w-auto"
          >
            <Upload size={16} />
            {uploading ? 'Uploading…' : 'Choose file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground p-4">Loading…</p>
      ) : (
        <DataTable
          data={docs}
          emptyMessage="No documents yet"
          getRowKey={(d) => d.id}
          columns={[
            {
              key: 'type',
              header: 'Type',
              primary: true,
              render: (d) => <span className="capitalize">{d.docType.replace(/_/g, ' ')}</span>,
            },
            {
              key: 'when',
              header: 'Uploaded',
              render: (d) => <span className="font-mono text-xs">{formatDate(d.uploadedAt)}</span>,
            },
            {
              key: 'file',
              header: 'File',
              render: (d) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void openDoc(d); }}
                  className="inline-flex items-center gap-1 text-primary text-xs font-medium min-h-[40px]"
                >
                  Open <ExternalLink size={12} />
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
