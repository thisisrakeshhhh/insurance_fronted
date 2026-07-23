const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    : undefined

export function isRecognitionSupported(): boolean {
  return !!SpeechRecognitionClass
}

export function createRecognition(lang = 'en-IN'): SpeechRecognition | null {
  if (!SpeechRecognitionClass) return null
  const r = new SpeechRecognitionClass()
  r.lang = lang
  r.continuous = false
  r.interimResults = true
  r.maxAlternatives = 1
  return r
}
