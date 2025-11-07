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
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store token
        localStorage.setItem('userToken', data.token)
        localStorage.setItem('userData', JSON.stringify(data.user))

        toast.success("Login successful!", {
          description: `Welcome back, ${data.user.name}!`
        })

        // Redirect to home page
        router.push('/')
      } else {
        toast.error("Login failed", {
          description: data.error || "Invalid credentials"
        })
      }
    } catch (error) {
      toast.error("Login failed", {
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome Back
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400">
                  Sign in to your account
                </p>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10"
                      placeholder="your@email.com"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10 pr-10"
                        placeholder="Enter your password"
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-600 dark:text-slate-400">
                    Don't have an account?{" "}
                    <Link
                      href="/register"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      Sign up here
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