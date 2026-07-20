import { formatCurrency } from '@/lib/utils';
import { priceReceivable, computeTenorDays } from '@/lib/pricing';
import { Wallet, FileCheck, CalendarClock } from 'lucide-react';
import { useMemo } from 'react';

interface OfferCalculatorProps {
  faceValue: number;
  supplierName?: string;
  buyerName?: string;
  issueDate?: string;
  dueDate?: string;
  discountRate: string;
  onDiscountChange: (rate: string) => void;
  band?: { discountMin: number; discountMax: number; maxTenorDays: number };
}

/** SPV purchase engine v1 — tenor-based discount (not loan interest UI) */
export default function OfferCalculator({
  faceValue,
  supplierName,
  buyerName,
  issueDate,
  dueDate,
  discountRate,
  onDiscountChange,
  band,
}: OfferCalculatorProps) {
  const tenorDays = issueDate && dueDate ? computeTenorDays(issueDate, dueDate) : 90;

  const priced = useMemo(
    () => priceReceivable({ faceValue, tenorDays, band }),
    [faceValue, tenorDays, band],
  );

  const rate = parseFloat(discountRate) || priced.recommendedDiscount;
  const offerPrice = Math.round(faceValue * (1 - rate / 100));
  const margin = faceValue - offerPrice;
  const marginPct = offerPrice > 0 ? (margin / offerPrice) * 100 : 0;

  const applyRecommended = () => onDiscountChange(String(priced.recommendedDiscount));

  return (
    <div className="space-y-4">
      <div className="p-4 bg-brand-blue-light/60 rounded-xl border border-primary/10">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
          <Wallet size={16} />
          Purchase engine — tenor discount
        </h4>

        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3 p-2.5 rounded-lg bg-card/80 border">
          <CalendarClock size={14} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p>{priced.explanation}</p>
            <button type="button" onClick={applyRecommended} className="text-primary font-medium mt-1 hover:underline">
              Apply recommended {priced.recommendedDiscount}%
            </button>
            {!priced.withinBand && band && (
              <p className="text-amber-700 mt-1">Outside programme band ({band.discountMin}%–{band.discountMax}%, max {band.maxTenorDays}d)</p>
            )}
          </div>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Negotiated discount rate (%)</label>
        <input
          type="number"
          step="0.01"
          min={0}
          max={25}
          value={discountRate}
          onChange={e => onDiscountChange(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 mb-3 font-mono"
        />

        <div className="p-3 bg-card rounded-lg border space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenor</span>
            <span className="font-mono font-medium">{tenorDays} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Face value</span>
            <span className="font-mono font-medium">{formatCurrency(faceValue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net pay to supplier</span>
            <span className="font-mono font-medium text-accent">{formatCurrency(offerPrice)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="text-muted-foreground">SPV margin</span>
            <span className="font-mono font-semibold text-accent">
              {formatCurrency(margin)} ({marginPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-brand-green-light/50 rounded-xl border border-accent/20">
        <h4 className="text-sm font-semibold text-accent flex items-center gap-2 mb-2">
          <FileCheck size={16} />
          Assignment summary
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {supplierName || 'Supplier'} · {buyerName || 'Buyer'} — accepting this offer triggers buyer
          assignment consent, then SPV true-sale trail and escrow legs.
        </p>
      </div>
    </div>
  );
}
