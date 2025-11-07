"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Clock, AlertTriangle, Phone, Package, Zap, Shield, Users, Globe, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PaymentSuccessModal } from "@/components/payment-success-modal"
import { PaymentConfirmationModal } from "@/components/payment-confirmation-modal"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"
import { apiClient, type PaymentRequest } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import TrustIndicators from "@/components/TrustIndicators"
import PackageCard from "@/components/PackageCard"
import StatusDisplay from "@/components/StatusDisplay"
import DeviceInfoPanel from "@/components/DeviceInfoPanel"
import InfoPanel from "@/components/InfoPanel"

// --- Constants ---
const packages: {
  label: string;
  value: number;
  price: string;
  speed: string;
  color: "blue" | "purple" | "green" | "yellow";
  popular: boolean;
}[] = [
  { label: "24 Hours", value: 30, price: "Ksh 30", speed: "5 Mbps", color: "blue", popular: true },
  { label: "12 Hours", value: 20, price: "Ksh 20", speed: "4 Mbps", color: "purple", popular: false },
  { label: "4 Hours", value: 15, price: "Ksh 15", speed: "3 Mbps", color: "green", popular: false },
  { label: "1 Hour", value: 10, price: "Ksh 10", speed: "2 Mbps", color: "yellow", popular: false },
]

// --- Main Component ---
export default function UserPortal() {
  const { title } = useDynamicTitle("Get Connected Instantly")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(30)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [macAddress, setMacAddress] = useState("Loading...");
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [confirmationData, setConfirmationData] = useState<any>(null)
  const [loanEligibility, setLoanEligibility] = useState<any>(null)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [showPackageButtons, setShowPackageButtons] = useState(false)
  const [showRepayModal, setShowRepayModal] = useState(false)
  const [repayData, setRepayData] = useState<any>(null)

  useEffect(() => {
    fetchDeviceInfo()

    // Check if user is logged in
    const userToken = localStorage.getItem('userToken')
    const userDataStr = localStorage.getItem('userData')

    if (userToken && userDataStr) {
      try {
        const userDataParsed = JSON.parse(userDataStr)
        setIsUserLoggedIn(true)
        setUserData(userDataParsed)
        setPhone(userDataParsed.phone || "")
        // If user is logged in and has a package selected, show buttons
        if (amount > 0) {
          setShowPackageButtons(true)
        }
        // Call checkLoanEligibility directly with token to avoid state timing issues
        checkLoanEligibilityWithToken(userToken)
      } catch (error) {
        console.error("Error parsing user data:", error)
        setIsUserLoggedIn(false)
      }
    } else {
      setIsUserLoggedIn(false)
    }
  }, [])

  const fetchDeviceInfo = async () => {
    try {
      toast.info("Fetching device information...", { duration: 2000 })

      const response = await apiClient.getDeviceInfo()

      if (response.success && response.data) {
        setMacAddress(response.data.macAddress)
        toast.success("Device information loaded", { duration: 2000 })
      } else {
        throw new Error(response.error || "Failed to fetch device info")
      }
    } catch (error) {
      console.error("Error fetching device info:", error)
      setMacAddress("UNAVAILABLE")
      toast.error("Could not retrieve device information", {
        description: "Please refresh the page and try again",
      })
    }
  }

  const checkLoanEligibilityWithToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          // Special case: mathewkioko2006@gmail.com always shows loan features
          const isSpecialUser = data.user.email === 'mathewkioko2006@gmail.com'

          // Check loan eligibility based on user data
          const eligibilityData = {
            eligible: isSpecialUser ? true : data.user.loanEligible,
            consecutivePayments: data.user.consecutivePayments,
            hasActiveLoan: data.user.loans && data.user.loans.length > 0,
            activeLoan: data.user.loans && data.user.loans.length > 0 ? data.user.loans[0] : null,
            isSpecialUser: isSpecialUser
          }
          setLoanEligibility(eligibilityData)
        }
      }
    } catch (error) {
      console.error("Error checking loan eligibility:", error)
    }
  }

  const checkLoanEligibility = async () => {
    if (!isUserLoggedIn) {
      return
    }

    const token = localStorage.getItem('userToken')
    if (!token) {
      return
    }

    await checkLoanEligibilityWithToken(token)
  }

  const handlePaymentClick = () => {
    // Validation
    if (!/^(07|01)\d{8}$/.test(phone)) {
      toast.error("Invalid phone number", {
        description: "Please enter a valid 10-digit phone number starting with 07 or 01",
      })
      return
    }

    if (!amount) {
      toast.error("No package selected", {
        description: "Please select a package before proceeding",
      })
      return
    }

    const selectedPackage = packages.find((p) => p.value === amount)
    if (!selectedPackage) {
      toast.error("Invalid package selected")
      return
    }

    // Show confirmation modal
    const confirmData = {
      phone: phone.startsWith('0') ? `+254${phone.substring(1)}` : phone,
      amount,
      package: selectedPackage.label,
      price: selectedPackage.price,
      speed: selectedPackage.speed,
    }
    setConfirmationData(confirmData)
    setShowConfirmationModal(true)
  }

  const handlePaymentConfirm = async () => {
    if (!confirmationData) return

    setIsLoading(true)
    setStatus("pending")

    if (confirmationData.isBorrow) {
      // Handle loan request
      toast.loading("Processing loan request...", {
        description: `${confirmationData.price} loan for ${confirmationData.package}`,
        id: "loan-loading",
      })

      try {
        const token = localStorage.getItem('userToken')
        if (!token) {
          throw new Error("Please log in to request a loan")
        }

        const response = await fetch('/api/loans/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: confirmationData.amount })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          toast.dismiss("loan-loading")
          toast.success("Loan approved!", {
            description: `Ksh ${confirmationData.amount} loan granted. Pay within 5 days.`,
            duration: 5000,
          })

          // Create a payment record for the loan (no M-Pesa payment needed)
          const successPaymentData = {
            transactionId: `LOAN_${Date.now()}`,
            amount: confirmationData.amount,
            package: confirmationData.package,
            phone: confirmationData.phone,
            mpesaRef: "LOAN_GRANTED",
            expiresAt: new Date(Date.now() + confirmationData.amount * 60 * 60 * 1000), // Hours based on amount
            speed: confirmationData.speed,
          }

          setPaymentData(successPaymentData)
          setStatus("completed")

          // Refresh loan eligibility
          checkLoanEligibilityWithToken(token)

          setTimeout(() => {
            setShowSuccessModal(true)
          }, 1000)
        } else {
          throw new Error(data.error || "Loan request failed")
        }
      } catch (error) {
        setStatus("failed")
        toast.dismiss("loan-loading")
        const errMsg = error instanceof Error ? error.message : String(error)
        toast.error("Loan error", {
          description: errMsg || "An unexpected error occurred. Please try again.",
          duration: 4000,
        })
      } finally {
        setIsLoading(false)
        setShowConfirmationModal(false)
      }
    } else {
      // Handle regular payment
      toast.loading("Initiating M-Pesa payment...", {
        description: `${confirmationData.price} for ${confirmationData.package}`,
        id: "payment-loading",
      })

      try {
        const paymentPayload: PaymentRequest = {
          phone: confirmationData.phone,
          amount: confirmationData.amount,
          package: confirmationData.package,
          macAddress,
          speed: confirmationData.speed,
        }

        console.log("Payment payload:", paymentPayload)

        const response = await apiClient.initiatePayment(paymentPayload)

        if (response.success && response.data) {
          const { transactionId: txnId, mpesaRef, status: paymentStatus, expiresAt } = response.data

          setTransactionId(txnId)
          setStatus(paymentStatus)

          if (paymentStatus === "completed") {
            const successPaymentData = {
              transactionId: txnId,
              amount: confirmationData.amount,
              package: confirmationData.package,
              phone: confirmationData.phone,
              mpesaRef,
              expiresAt,
              speed: confirmationData.speed,
            }

            setPaymentData(successPaymentData)

            toast.dismiss("payment-loading")
            toast.success("Payment successful!", {
              description: "You are now connected to the internet",
              duration: 4000,
            })

            setTimeout(() => {
              setShowSuccessModal(true)
            }, 1000)
          } else if (paymentStatus === "pending") {
            // Poll for payment status
            pollPaymentStatus(txnId)
          }
        } else {
          throw new Error(response.error || "Payment initiation failed")
        }
      } catch (error) {
        setStatus("failed")
        toast.dismiss("payment-loading")
        const errMsg = error instanceof Error ? error.message : String(error)
        toast.error("Payment error", {
          description: errMsg || "An unexpected error occurred. Please try again.",
          duration: 4000,
        })
      } finally {
        setIsLoading(false)
        setShowConfirmationModal(false)
      }
    }
  }

  const pollPaymentStatus = async (txnId: string) => {
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    const minAttemptsBeforeFail = 6 // At least 1 minute (6 * 10 seconds) before showing any failure
    let attempts = 0

    const poll = async () => {
      try {
        const response = await apiClient.checkPaymentStatus(txnId)

        if (response.success && response.data) {
          const { status: paymentStatus, mpesaRef, expiresAt } = response.data

          if (paymentStatus === "completed") {
            const selectedPackage = packages.find((p) => p.value === amount)
            if (!selectedPackage) {
              console.error("Selected package not found")
              return
            }
            const successPaymentData = {
              transactionId: txnId,
              amount,
              package: selectedPackage!.label,
              phone: `+254${phone.substring(1)}`,
              mpesaRef,
              expiresAt,
              speed: selectedPackage!.speed,
            }

            setPaymentData(successPaymentData)
            setStatus("completed")

            toast.dismiss("payment-loading")
            toast.success("Payment successful!", {
              description: "You are now connected to the internet",
              duration: 4000,
            })

            setTimeout(() => {
              setShowSuccessModal(true)
            }, 1000)
            return
          }
          // For any status other than "completed" (including "failed"), continue polling
          // until we reach the minimum time threshold
        }

        attempts++
        if (attempts < maxAttempts) {
          // Only show timeout error after full 5 minutes
          if (attempts >= maxAttempts) {
            setStatus("failed")
            toast.dismiss("payment-loading")
            toast.error("Payment timeout", {
              description: "Payment is taking longer than expected. Please contact support.",
              duration: 4000,
            })
            return
          }
          setTimeout(poll, 10000) // Poll every 10 seconds
        } else {
          setStatus("failed")
          toast.dismiss("payment-loading")
          toast.error("Payment timeout", {
            description: "Payment is taking longer than expected. Please contact support.",
            duration: 4000,
          })
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error("Error polling payment status:", errMsg)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        } else {
          setStatus("failed")
          toast.dismiss("payment-loading")
          toast.error("Payment timeout", {
            description: "Payment is taking longer than expected. Please contact support.",
            duration: 4000,
          })
        }
      }
    }

    poll()
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPhone(value)

    // Real-time validation feedback
    if (value && !/^(07|01)\d{0,8}$/.test(value)) {
      toast.error("Invalid format", {
        description: "Phone number should start with 07 or 01",
        duration: 2000,
      })
    }
  }

  const handlePackageSelect = (value: number) => {
    setAmount(value)
    setShowPackageButtons(true)
  }

  const handlePay = (pkg: any) => {
    setAmount(pkg.value)
    handlePaymentClick()
  }

  const handleBorrow = async (pkg: any) => {
    if (!isUserLoggedIn) {
      toast.error("Please log in to borrow")
      return
    }

    if (!loanEligibility?.eligible) {
      toast.error("Not eligible for borrowing", {
        description: "You need to make more payments to become eligible"
      })
      return
    }

    if (loanEligibility?.hasActiveLoan) {
      toast.error("You have an active loan", {
        description: "Please repay your current loan before borrowing again"
      })
      return
    }

    // Show confirmation for borrowing
    const confirmData = {
      phone: phone.startsWith('0') ? `+254${phone.substring(1)}` : phone,
      amount: pkg.value,
      package: pkg.label,
      price: pkg.price,
      speed: pkg.speed,
      isBorrow: true
    }
    setConfirmationData(confirmData)
    setShowConfirmationModal(true)
  }

  const handleRepay = () => {
    if (!isUserLoggedIn) {
      toast.error("Please log in to repay")
      return
    }

    if (!loanEligibility?.hasActiveLoan) {
      toast.error("No active loan to repay")
      return
    }

    const activeLoan = loanEligibility.activeLoan
    const totalDue = activeLoan.amount + activeLoan.penaltyAmount

    // Show repay modal
    const repayInfo = {
      loanId: activeLoan.id,
      amount: activeLoan.amount,
      penaltyAmount: activeLoan.penaltyAmount,
      totalDue: totalDue,
      dueDate: activeLoan.dueDate,
      status: activeLoan.status
    }
    setRepayData(repayInfo)
    setShowRepayModal(true)
  }

  const handleRepayConfirm = async () => {
    if (!repayData) return

    setIsLoading(true)
    toast.loading("Initiating loan repayment...", {
      description: `Ksh ${repayData.totalDue} repayment`,
      id: "repay-loading",
    })

    try {
      const token = localStorage.getItem('userToken')
      if (!token) {
        throw new Error("Please log in to repay")
      }

      const response = await fetch(`/api/loans/repay/${repayData.loanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.dismiss("repay-loading")
        toast.success("Repayment initiated!", {
          description: data.message,
          duration: 5000,
        })

        // Refresh loan eligibility
        checkLoanEligibilityWithToken(token)

        setTimeout(() => {
          setShowRepayModal(false)
        }, 1000)
      } else {
        throw new Error(data.error || "Repayment failed")
      }
    } catch (error) {
      setStatus("failed")
      toast.dismiss("repay-loading")
      const errMsg = error instanceof Error ? error.message : String(error)
      toast.error("Repayment error", {
        description: errMsg || "An unexpected error occurred. Please try again.",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
                Get Connected
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Instantly
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                Choose your internet package and pay securely with M-Pesa. Fast, reliable, and affordable internet
                access.
              </p>

              {/* Loan Status and Repay Button */}
              {isUserLoggedIn && loanEligibility && (
                <div className="mb-8 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10 backdrop-blur max-w-md mx-auto">
                  {loanEligibility.hasActiveLoan ? (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Active Loan</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Amount: Ksh {loanEligibility.activeLoan.amount} +
                        Penalty: Ksh {loanEligibility.activeLoan.penaltyAmount} =
                        Total: Ksh {loanEligibility.activeLoan.amount + loanEligibility.activeLoan.penaltyAmount}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                        Due: {new Date(loanEligibility.activeLoan.dueDate).toLocaleDateString()}
                      </p>
                      <Button
                        onClick={handleRepay}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                      >
                        Repay Loan
                      </Button>
                    </div>
                  ) : loanEligibility.eligible ? (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Loan Eligible</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {loanEligibility.consecutivePayments}/14 consecutive payments
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="w-5 h-5 text-slate-500 mr-2" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Building Eligibility</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {loanEligibility.consecutivePayments || 0}/14 consecutive payments needed
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <TrustIndicators />

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Payment Form */}
              <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Quick Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      M-Pesa Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400"
                      maxLength={10}
                    />
                  </div>

                  {/* Package Selection */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 dark:text-slate-300 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      Select Package
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {packages.map((pkg) => {
                        const isSelected = amount === pkg.value
                        const showButtons = showPackageButtons && isSelected
                        const canBorrow = loanEligibility?.eligible && !loanEligibility?.hasActiveLoan


                        return (
                          <PackageCard
                            key={pkg.value}
                            pkg={pkg}
                            isSelected={isSelected}
                            onSelect={handlePackageSelect}
                            onPay={handlePay}
                            onBorrow={handleBorrow}
                            showButtons={showButtons}
                            isUserLoggedIn={isUserLoggedIn}
                            canBorrow={canBorrow}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Payment Button */}
                  <Button
                    onClick={handlePaymentClick}
                    disabled={isLoading || !phone || phone.length !== 10}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Pay with M-Pesa - {packages.find((p) => p.value === amount)?.price}
                      </>
                    )}
                  </Button>

                  <StatusDisplay status={status} />
                </CardContent>
              </Card>


              {/* Info Panel */}
              <div className="space-y-6">
                <InfoPanel />
                <DeviceInfoPanel macAddress={macAddress} status={status} />
              </div>
            </div>
          </div>
        </main>
        <Footer />
        {/* Success Modal */}
        {paymentData && (
          <PaymentSuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            paymentData={paymentData}
          />
        )}

        {/* Payment Confirmation Modal */}
        {confirmationData && (
          <PaymentConfirmationModal
            isOpen={showConfirmationModal}
            onClose={() => setShowConfirmationModal(false)}
            onConfirm={handlePaymentConfirm}
            paymentData={confirmationData}
            isProcessing={isLoading}
          />
        )}

        {/* Loan Repayment Modal */}
        {repayData && (
          <PaymentConfirmationModal
            isOpen={showRepayModal}
            onClose={() => setShowRepayModal(false)}
            onConfirm={handleRepayConfirm}
            paymentData={{
              phone: phone.startsWith('0') ? `+254${phone.substring(1)}` : phone,
              amount: repayData.totalDue,
              package: `Loan Repayment (ID: ${repayData.loanId})`,
              price: `Ksh ${repayData.totalDue}`,
              speed: "N/A"
            }}
            isProcessing={isLoading}
          />
        )}
      </div>
    </>
  )
}
