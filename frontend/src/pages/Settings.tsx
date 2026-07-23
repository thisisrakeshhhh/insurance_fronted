import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '@/store'
import { Settings as SettingsIcon, Save } from 'lucide-react'
import { toast } from 'sonner'

export function Settings() {
  const settings = useSettingsStore()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const handleSave = () => toast.success('Settings saved')

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
      <label className="text-sm text-text-muted min-w-[180px]">{label}</label>
      <div className="flex-1 max-w-xs">{children}</div>
    </div>
  )

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-bg-surface border border-border text-text-primary text-sm outline-none focus:border-accent/60 transition-colors'
  const selectCls = 'w-full px-3 py-2 rounded-lg bg-bg-surface border border-border text-text-primary text-sm outline-none focus:border-accent/60 transition-colors'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 p-6 overflow-y-auto h-full max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon size={18} className="text-accent" />
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm transition-colors">
          <Save size={14} />
          Save
        </button>
      </div>

      <div className="bg-bg-card border border-border rounded-xl px-5 py-2">
        <Row label="Worker URL">
          <input className={inputCls} value={settings.workerUrl} onChange={(e) => settings.setWorkerUrl(e.target.value)} placeholder="https://your-worker.workers.dev" />
        </Row>
        <Row label="Dev Phone Number">
          <input className={inputCls} value={settings.devPhone} onChange={(e) => settings.setDevPhone(e.target.value)} placeholder="+919999999999" />
        </Row>
        <Row label="Gemini Model">
          <input className={inputCls} value={settings.geminiModel} onChange={(e) => settings.setGeminiModel(e.target.value)} />
        </Row>
        <Row label="Speech Language">
          <select className={selectCls} value={settings.speechLang} onChange={(e) => settings.setSpeechLang(e.target.value)}>
            <option value="en-IN">English (India)</option>
            <option value="en-US">English (US)</option>
            <option value="hi-IN">Hindi</option>
            <option value="kn-IN">Kannada</option>
          </select>
        </Row>
        <Row label="TTS Voice">
          <select className={selectCls} value={settings.ttsVoice} onChange={(e) => settings.setTtsVoice(e.target.value)}>
            <option value="">Default</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
        </Row>
        <Row label={`TTS Rate (${settings.ttsRate.toFixed(1)})`}>
          <input type="range" min="0.5" max="2" step="0.1" value={settings.ttsRate} onChange={(e) => settings.setTtsRate(Number(e.target.value))} className="w-full accent-accent" />
        </Row>
        <Row label={`TTS Pitch (${settings.ttsPitch.toFixed(1)})`}>
          <input type="range" min="0.5" max="2" step="0.1" value={settings.ttsPitch} onChange={(e) => settings.setTtsPitch(Number(e.target.value))} className="w-full accent-accent" />
        </Row>
        <Row label="Auto Speak Responses">
          <button onClick={() => settings.setAutoSpeak(!settings.autoSpeak)} className={`relative w-10 h-6 rounded-full transition-colors ${settings.autoSpeak ? 'bg-accent' : 'bg-bg-surface border border-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoSpeak ? 'left-5' : 'left-1'}`} />
          </button>
        </Row>
        <Row label="Continuous Listening">
          <button onClick={() => settings.setContinuousListening(!settings.continuousListening)} className={`relative w-10 h-6 rounded-full transition-colors ${settings.continuousListening ? 'bg-accent' : 'bg-bg-surface border border-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.continuousListening ? 'left-5' : 'left-1'}`} />
          </button>
        </Row>
        <Row label="Dark Mode">
          <button onClick={() => settings.setDarkMode(!settings.darkMode)} className={`relative w-10 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-accent' : 'bg-bg-surface border border-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.darkMode ? 'left-5' : 'left-1'}`} />
          </button>
        </Row>
      </div>
    </motion.div>
  )
}
