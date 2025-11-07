"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { RequireAdmin } from "@/components/admin/RequireAdmin"

interface Loan {
  id: number
  amount: number
  status: 'active' | 'paid' | 'overdue' | 'defaulted'
  grantedAt: string
  dueDate: string
  paidAt?: string
  penaltyAmount: number
  user: {
    phone: string
    consecutivePayments: number
  }
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/loans/admin/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLoans(data.loans)
      } else {
        toast.error("Failed to fetch loans")
      }
    } catch (error) {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  const updatePenalties = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/loans/admin/update-penalties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Updated penalties for ${data.message.match(/\d+/)[0]} loans`)
        fetchLoans() // Refresh the list
      } else {
        toast.error("Failed to update penalties")
      }
    } catch (error) {
      toast.error("Network error")
    }
  }

  const markAsDefaulted = async (loanId: number) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/loans/admin/default/${loanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success("Loan marked as defaulted")
        fetchLoans()
      } else {
        toast.error("Failed to mark loan as defaulted")
      }
    } catch (error) {
      toast.error("Network error")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'paid':
        return <Badge className="bg-blue-500">Paid</Badge>
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>
      case 'defaulted':
        return <Badge className="bg-gray-500">Defaulted</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'defaulted':
        return <XCircle className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <RequireAdmin>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </RequireAdmin>
    )
  }

  return (
    <RequireAdmin>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Loan Management</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Monitor and manage user loans</p>
          </div>
          <Button onClick={updatePenalties} className="bg-orange-600 hover:bg-orange-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Update Penalties
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => l.status === 'active').length}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => l.status === 'overdue').length}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overdue Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => l.status === 'paid').length}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Paid Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-gray-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => l.status === 'defaulted').length}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Defaulted Loans</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loans Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Total Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Consecutive Payments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.user.phone}</TableCell>
                    <TableCell>Ksh {loan.amount}</TableCell>
                    <TableCell className={loan.penaltyAmount > 0 ? "text-red-600" : ""}>
                      Ksh {loan.penaltyAmount}
                    </TableCell>
                    <TableCell className="font-semibold">
                      Ksh {loan.amount + loan.penaltyAmount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(loan.status)}
                        {getStatusBadge(loan.status)}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>{loan.user.consecutivePayments}</TableCell>
                    <TableCell>
                      {loan.status === 'overdue' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => markAsDefaulted(loan.id)}
                        >
                          Mark Defaulted
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </RequireAdmin>
  )
}