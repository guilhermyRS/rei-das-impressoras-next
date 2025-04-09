"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Printer } from "lucide-react"

const SuccessAnimation = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50"
    >
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.8, times: [0, 0.6, 1], ease: "easeOut" }}
          className="relative z-10"
        >
          <CheckCircle2 size={80} className="text-green-400" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl transform scale-150" />
        </motion.div>
      </div>

      <motion.h2
        className="text-xl font-bold mt-6 text-white"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Pagamento Confirmado!
      </motion.h2>

      <motion.div
        className="flex items-center space-x-2 text-sm text-gray-300 mt-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <Printer className="animate-pulse" size={16} />
        <span>Iniciando impressão...</span>
      </motion.div>
    </motion.div>
  )
}

export default SuccessAnimation
