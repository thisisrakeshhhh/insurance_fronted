import React from 'react'
import { motion } from 'framer-motion'
import { DatabaseInspector } from '@/components/inspector/DatabaseInspector'

export function Inspector() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden">
      <DatabaseInspector />
    </motion.div>
  )
}
