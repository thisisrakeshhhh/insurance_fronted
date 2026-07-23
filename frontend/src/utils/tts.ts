export function speak(
  text: string,
  opts: { voice?: string; rate?: number; pitch?: number; lang?: string } = {},
  onEnd?: () => void
): void {
  if (!window.speechSynthesis) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = opts.rate ?? 1
  utter.pitch = opts.pitch ?? 1
  utter.lang = opts.lang ?? 'en-IN'
  if (opts.voice) {
    const voices = window.speechSynthesis.getVoices()
    const match = voices.find((v) => v.name === opts.voice)
    if (match) utter.voice = match
  }
  utter.onend = () => onEnd?.()
  utter.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utter)
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}

export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? []
}
