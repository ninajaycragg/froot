'use client'

// The hushed body editor — segmented toggles + two sliders. Show-don't-describe:
// she nudges, the shape on screen answers. No tape measure required for the demo.
import type { ShapeProfile } from '../lib/fit-math'

export interface BodyControlsState {
  band: number
  bustDiff: number
  projection: ShapeProfile['projection']
  fullness: ShapeProfile['fullness']
  rootWidth: ShapeProfile['rootWidth']
}

const LABEL = 'text-[10px] uppercase tracking-[0.22em] text-[#8A7060]'

function Seg<T extends string>({
  value, options, onChange,
}: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            value === o.v
              ? 'bg-[#1A0808] text-[#F3E7D6]'
              : 'bg-[#1A0808]/[0.06] text-[#1A0808]/70 hover:bg-[#1A0808]/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function BodyControls({
  state, onChange,
}: { state: BodyControlsState; onChange: (s: BodyControlsState) => void }) {
  const set = (patch: Partial<BodyControlsState>) => onChange({ ...state, ...patch })
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className={LABEL}>ribcage · band</span>
          <span className="text-sm text-[#1A0808] tabular-nums">{state.band}&Prime;</span>
        </div>
        <input
          type="range" min={26} max={42} step={2} value={state.band}
          onChange={(e) => set({ band: +e.target.value })}
          className="w-full accent-[#C5352C]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className={LABEL}>fullness · bust − band</span>
          <span className="text-sm text-[#1A0808] tabular-nums">+{state.bustDiff.toFixed(1)}&Prime;</span>
        </div>
        <input
          type="range" min={0.5} max={10} step={0.5} value={state.bustDiff}
          onChange={(e) => set({ bustDiff: +e.target.value })}
          className="w-full accent-[#C5352C]"
        />
      </div>

      <div className="space-y-2">
        <span className={LABEL}>projection</span>
        <Seg
          value={state.projection}
          onChange={(v) => set({ projection: v })}
          options={[
            { v: 'shallow', label: 'shallow' },
            { v: 'moderate', label: 'moderate' },
            { v: 'projected', label: 'projected' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <span className={LABEL}>fullness profile</span>
        <Seg
          value={state.fullness}
          onChange={(v) => set({ fullness: v })}
          options={[
            { v: 'full-on-top', label: 'top' },
            { v: 'even', label: 'even' },
            { v: 'full-on-bottom', label: 'bottom' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <span className={LABEL}>root width</span>
        <Seg
          value={state.rootWidth}
          onChange={(v) => set({ rootWidth: v })}
          options={[
            { v: 'narrow', label: 'narrow' },
            { v: 'average', label: 'average' },
            { v: 'wide', label: 'wide' },
          ]}
        />
      </div>
    </div>
  )
}
