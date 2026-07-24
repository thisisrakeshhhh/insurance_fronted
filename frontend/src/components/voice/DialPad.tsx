import React from 'react'
import { Delete } from 'lucide-react'

interface Props {
  phoneNumberInput: string
  setPhoneNumberInput: (value: string) => void
  hasSession: boolean
  currentStage: string
  sendTurn: (digit: string) => void
}

const keyDetails: Record<string, { label: string; desc: string }> = {
  '1': { label: 'Buy Policy', desc: 'Find plan' },
  '2': { label: 'Renewal', desc: 'Renew policy' },
  '3': { label: 'Claims', desc: 'Claims help' },
  '4': { label: 'Hospitals', desc: 'Find hospital' },
  '5': { label: 'Advisor', desc: 'Talk to advisor' },
  '6': { label: 'Add', desc: 'Add in this' },
  '7': { label: 'Add', desc: 'Add in this' },
  '8': { label: 'Add', desc: 'Add in this' },
  '9': { label: 'Complaint', desc: 'File complaint' },
}

export function DialPad({
  phoneNumberInput,
  setPhoneNumberInput,
  hasSession,
  currentStage,
  sendTurn,
}: Props) {
  const handleKeyPress = (digit: string) => {
    setPhoneNumberInput(phoneNumberInput + digit)
    if (hasSession) {
      sendTurn(digit)
    }
  }

  const handleBackspace = () => {
    if (phoneNumberInput.length > 0) {
      setPhoneNumberInput(phoneNumberInput.slice(0, -1))
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

  return (
    <div className="w-full border-t border-border p-4 bg-bg-card flex flex-col gap-3">
      {/* Phone Number Display */}
      <div className="relative flex items-center bg-bg-surface border border-border/80 rounded-xl px-3 py-1.5 focus-within:border-accent/80 transition-all duration-200">
        <input
          type="text"
          value={phoneNumberInput}
          onChange={(e) => setPhoneNumberInput(e.target.value)}
          placeholder=""
          className="w-full bg-transparent pr-8 text-center text-lg font-semibold font-mono text-text-primary focus:outline-none placeholder-text-muted"
        />
        {phoneNumberInput.length > 0 && (
          <button
            onClick={handleBackspace}
            className="absolute right-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          >
            <Delete size={15} />
          </button>
        )}
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => {
          const details = keyDetails[key]
          const showDetails = !!details

          return (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="w-full aspect-[4/3] rounded-xl bg-bg-surface hover:bg-accent/15 border border-border/60 text-text-primary hover:text-accent transition-all duration-150 cursor-pointer active:scale-95 flex flex-col items-center justify-center p-1"
            >
              <span className={`font-bold ${showDetails ? 'text-[11px] text-accent leading-none' : 'text-lg'}`}>{key}</span>
              {showDetails && (
                <>
                  <span className="text-[8px] font-bold leading-none text-text-primary mt-0.5 text-center truncate max-w-full">
                    {details.label}
                  </span>
                  <span className="text-[7px] leading-none text-text-muted mt-0.5 text-center truncate max-w-full">
                    {details.desc}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
