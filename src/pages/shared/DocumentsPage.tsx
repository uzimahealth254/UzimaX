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

export default function DocumentsPage({ embedded = false }: { embedded?: boolean }) {
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
    <div className={embedded ? 'space-y-3' : 'portal-page animate-fade-in'}>
      {!embedded && (
        <PageHeader
          title="Documents"
          subtitle="Resolutions, certificates, and transaction PDFs"
        />
      )}

      <section className={embedded ? 'space-y-3' : 'portal-section'}>
        {!embedded && (
          <header className="portal-section__head">
            <div>
              <h2 className="portal-section__title">Library</h2>
              <p className="portal-section__desc">{docs.length} document{docs.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="field-input appearance-none !min-h-[34px] !py-1.5 text-xs w-full sm:w-48"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold disabled:opacity-50"
              >
                <Upload size={13} />
                {uploading ? '…' : 'Upload'}
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
          </header>
        )}
        {embedded && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="field-input appearance-none !min-h-[34px] !py-1.5 text-xs w-full sm:w-48"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-[#0E1F1A] text-white text-xs font-bold disabled:opacity-50"
            >
              <Upload size={13} />
              {uploading ? '…' : 'Upload'}
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
        )}
        <div className={embedded ? '' : '[&_.surface-card]:border-0 [&_.surface-card]:rounded-none'}>
          {isLoading ? (
            <p className="px-3 py-4 text-xs text-[#5A6B7D]">Loading…</p>
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
                      className="inline-flex items-center gap-1 text-[#0E1F1A] text-xs font-bold min-h-[32px]"
                    >
                      Open <ExternalLink size={11} />
                    </button>
                  ),
                },
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}
