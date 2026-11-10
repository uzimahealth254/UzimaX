import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/layout/PageHeader';
import { toast } from 'sonner';

type Row = { id: string; email: string; fullName: string; role: string; permissions: string[] | null };

export default function PermissionsPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/admin/permissions')).data as {
      catalog: string[];
      defaults: Record<string, string[]>;
      users: Row[];
    },
  });
  const [selected, setSelected] = useState<string>('');
  const user = query.data?.users.find((row) => row.id === selected);
  const [custom, setCustom] = useState<string[] | null>(null);

  const choose = (id: string) => {
    setSelected(id);
    const row = query.data?.users.find((item) => item.id === id);
    setCustom(row?.permissions ? [...row.permissions] : null);
  };

  const save = async (permissions: string[] | null) => {
    try {
      await api.put(`/admin/users/${selected}/permissions`, { permissions });
      toast.success(permissions ? 'Custom permissions saved' : 'Reverted to the role default');
      qc.invalidateQueries({ queryKey: ['permissions'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save permissions');
    }
  };

  const catalog = query.data?.catalog || [];
  const active = custom ?? (user ? query.data?.defaults[user.role] || [] : []);

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Permissions" subtitle="Leave a person on the role default, or save a list that replaces it. One organisation still cannot read another organisation's book." />
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <ul className="portal-section divide-y divide-[#0E1F1A]/8 max-h-[70dvh] overflow-y-auto">
          {(query.data?.users || []).map((row) => (
            <li key={row.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-[#F4FBE3]" onClick={() => choose(row.id)}>
                <strong>{row.fullName}</strong>
                <div className="text-xs text-[#5A6B7D]">{row.role}{row.permissions ? ' · custom' : ''}</div>
              </button>
            </li>
          ))}
        </ul>
        {user && (
          <div className="portal-section p-4">
            <p className="text-sm font-semibold">{user.fullName}</p>
            <p className="text-xs text-[#5A6B7D] mb-3">{custom ? 'Custom list' : 'Role default'}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {catalog.map((permission) => (
                <label key={permission} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active.includes(permission)}
                    onChange={(e) => {
                      const base = custom ?? [...(query.data?.defaults[user.role] || [])];
                      setCustom(e.target.checked ? [...base, permission] : base.filter((item) => item !== permission));
                    }}
                  />
                  {permission}
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-primary" onClick={() => save(custom ?? active)}>Save</button>
              <button type="button" className="btn-secondary" onClick={() => { setCustom(null); void save(null); }}>Use role default</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
