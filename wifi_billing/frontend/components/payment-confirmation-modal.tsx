"use client"

import { useState } from "react"
import { X, Phone, Package, CreditCard, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface PaymentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  paymentData: {
    phone: string
    amount: number
    package: string
    price: string
    speed: string
    isRepay?: boolean
  }
  isProcessing?: boolean
}

export function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  paymentData,
  isProcessing = false
}: PaymentConfirmationModalProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'stk-sent'>('confirm')

  const handleConfirm = () => {
    setStep('processing')
    onConfirm()
    // Simulate STK push being sent
    setTimeout(() => {
      setStep('stk-sent')
    }, 2000)
  }

  const handleClose = () => {
    if (step !== 'processing') {
      setStep('confirm')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {step === 'confirm' && <CreditCard className="w-5 h-5 mr-2 text-blue-600" />}
            {step === 'processing' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2" />}
            {step === 'stk-sent' && <CheckCircle className="w-5 h-5 mr-2 text-green-600" />}
            {step === 'confirm' && 'Confirm Payment'}
            {step === 'processing' && 'Processing Payment...'}
            {step === 'stk-sent' && 'STK Push Sent!'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'confirm' && (
            <>
              {/* Payment Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-600" />
                    <span className="text-sm font-medium">Phone Number</span>
                  </div>
                  <span className="font-mono text-sm">{paymentData.phone}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center">
                    <Package className="w-4 h-4 mr-2 text-slate-600" />
                    <span className="text-sm font-medium">Package</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{paymentData.package}</div>
                    <div className="text-xs text-slate-500">{paymentData.speed}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Amount</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {paymentData.price}
                  </Badge>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  What happens next?
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• You'll receive an M-Pesa STK push on your phone</li>
                  <li>• Enter your M-Pesa PIN to complete the payment</li>
                  <li>• Your internet access will be activated immediately</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  Confirm Payment
                </Button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Sending STK Push...</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please wait while we contact M-Pesa
              </p>
            </div>
          )}

          {step === 'stk-sent' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">STK Push Sent!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Check your phone for the M-Pesa payment prompt
              </p>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-xs text-green-700 dark:text-green-300">
                  Enter your M-Pesa PIN when prompted to complete the payment
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="mt-4 w-full"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}