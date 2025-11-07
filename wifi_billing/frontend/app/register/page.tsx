"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"
import Link from "next/link"
import { Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return false
    }

    if (!formData.email.trim()) {
      toast.error("Email is required")
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address")
      return false
    }

    if (!/^(07|01)\d{8}$/.test(formData.phone)) {
      toast.error("Please enter a valid phone number (07XXXXXXXX or 01XXXXXXXX)")
      return false
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long")
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return false
    }

    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Registration successful!", {
          description: "Please log in with your credentials"
        })

        // Redirect to login page
        router.push('/login')
      } else {
        toast.error("Registration failed", {
          description: data.error || "Please try again"
        })
      }
    } catch (error) {
      toast.error("Registration failed", {
        description: "Network error. Please try again."
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
          <div className="max-w-md mx-auto">
            <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 backdrop-blur">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  Create Account
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400">
                  Join us to access WiFi services and loan features
                </p>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10"
                      placeholder="0712 345 678"
                      maxLength={10}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10 pr-10"
                        placeholder="Create a password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10 pr-10"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-600 dark:text-slate-400">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}