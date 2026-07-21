import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';

export type ProfileTab = { id: string; label: string; content: ReactNode };

const tabBtn = (active: boolean) =>
  `px-3 py-1.5 text-xs font-bold border-b-2 whitespace-nowrap shrink-0 min-h-[34px] transition-colors ${
    active ? 'border-[#0E1F1A] text-[#0E1F1A]' : 'border-transparent text-[#5A6B7D] hover:text-[#0E1F1A]'
  }`;

export default function ProfileHub({
  tabs,
  account,
}: {
  tabs: ProfileTab[];
  account: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const initial = params.get('tab') || tabs[0]?.id || 'account';
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    const fromUrl = params.get('tab');
    if (fromUrl && tabs.some((t) => t.id === fromUrl)) setTab(fromUrl);
  }, [params, tabs]);

  const active = useMemo(
    () => tabs.find((t) => t.id === tab) || tabs[0],
    [tabs, tab],
  );

  const select = (id: string) => {
    setTab(id);
    setParams(id === tabs[0]?.id ? {} : { tab: id });
  };

  return (
    <div className="portal-page animate-fade-in">
      <PageHeader title="Settings" subtitle="Account setup — separate from daily workflow" />

      <section className="portal-section">
        <header className="portal-section__head">
          <div>
            <h2 className="portal-section__title">{active?.label || 'Account'}</h2>
            <p className="portal-section__desc">Profile and organisation preferences</p>
          </div>
          <div className="flex gap-0 border-b border-[#0E1F1A]/10 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} type="button" className={tabBtn(tab === t.id)} onClick={() => select(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </header>
        <div className="portal-section__body--pad">
          {tab === 'account' || !active ? account : active.content}
        </div>
      </section>
    </div>
  );
}
