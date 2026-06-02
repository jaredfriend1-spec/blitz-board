// ── HCP PERCENT SELECTOR COMPONENT ──────────────────────────────────
// Reusable component for selecting handicap percentage (0-100% in 5% increments)
// Displays current selection and includes quick buttons + slider

export function HcpPercentSelector({ 
  value, 
  onChange 
}: { 
  value: number
  onChange: (val: number) => void 
}) {
  const quickButtons = [100, 90, 80, 75, 50]
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-zinc-400 tracking-widest">
          HANDICAP %
        </label>
        <span className="text-sm font-black text-emerald-400">
        <span className={`text-sm font-black ${value < 100 ? 'text-amber-400' : 'text-zinc-500'}`}>
          {value < 100 ? `${value}% of HCP` : 'Full Handicap'}
        </span>
        </span>
      </div>

      {/* Quick Buttons */}
      <div className="grid grid-cols-5 gap-2">
        {quickButtons.map(pct => (
          <button
            key={pct}
            onClick={() => onChange(pct)}
            className={`py-2 rounded-xl font-black text-xs transition-all ${
              value === pct
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* Slider for fine-tuning (5% increments: 0, 5, 10, ..., 100) */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 font-black">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}

// ── NET SKINS TOGGLE ───────────────────────────────────────────────

export function NetSkinsToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between bg-zinc-800 px-4 py-3 rounded-xl">
      <span className="text-xs font-black text-zinc-400 tracking-widest">
        NET SKINS
      </span>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
          enabled ? 'bg-emerald-500' : 'bg-zinc-700'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : ''
          }`}
        />
      </button>
    </div>
  )
}

// ── SKINS SPLIT SELECTOR ───────────────────────────────────────────

export function SkinsSplitSelector({
  gross,
  net,
  onChange,
  disabled = false,
}: {
  gross: number
  net: number
  onChange: (gross: number, net: number) => void
  disabled?: boolean
}) {
  const presets = [
    { gross: 100, net: 0, label: 'Gross Only' },
    { gross: 70, net: 30, label: '70/30' },
    { gross: 60, net: 40, label: '60/40' },
    { gross: 50, net: 50, label: '50/50' },
  ]

  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-zinc-400 tracking-widest block">
        SKINS SPLIT
      </label>
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.gross, preset.net)}
            disabled={disabled}
            className={`py-2.5 rounded-xl font-black text-xs transition-all ${
              gross === preset.gross && net === preset.net
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <div>{preset.label}</div>
            <div className="text-[9px] opacity-75 mt-0.5">
              {preset.gross}% / {preset.net}%
            </div>
          </button>
        ))}
      </div>
      <div className="text-[9px] text-zinc-600 font-black">
        Gross: {gross}% | Net: {net}%
      </div>
    </div>
  )
}