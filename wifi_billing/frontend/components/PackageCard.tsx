import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, CreditCard, HandCoins } from "lucide-react"

interface Package {
  label: string
  value: number
  price: string
  speed: string
  color: 'blue' | 'purple' | 'green' | 'yellow'
  popular: boolean
}

const colorClasses = {
  blue: "border-blue-500 bg-blue-500/10 shadow-blue-500/20",
  purple: "border-purple-500 bg-purple-500/10 shadow-purple-500/20",
  green: "border-green-500 bg-green-500/10 shadow-green-500/20",
  yellow: "border-yellow-500 bg-yellow-500/10 shadow-yellow-500/20",
}

const PackageCard = ({
  pkg,
  isSelected,
  onSelect,
  onPay,
  onBorrow,
  showButtons = false,
  isUserLoggedIn = false,
  canBorrow = false
}: {
  pkg: Package;
  isSelected: boolean;
  onSelect: (value: number) => void;
  onPay: (pkg: Package) => void;
  onBorrow: (pkg: Package) => void;
  showButtons?: boolean;
  isUserLoggedIn?: boolean;
  canBorrow?: boolean;
}) => {

  return (
    <Card
      className={`relative transition-all duration-300 hover:scale-105 ${
        isSelected
          ? `${colorClasses[pkg.color]} shadow-lg`
          : "border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/70"
      } ${!showButtons ? 'cursor-pointer' : ''}`}
      onClick={() => !showButtons && onSelect(pkg.value)}
    >
      {pkg.popular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{pkg.price}</div>
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">{pkg.label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{pkg.speed}</div>

        {showButtons && (
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                console.log("Pay button clicked for", pkg.label);
                onPay(pkg);
              }}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              Pay
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
              onClick={(e) => {
                e.stopPropagation();
                console.log("Borrow button clicked for", pkg.label, { isUserLoggedIn, canBorrow });
                onBorrow(pkg);
              }}
              disabled={!isUserLoggedIn || !canBorrow}
            >
              <HandCoins className="w-3 h-3 mr-1" />
              Borrow
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default PackageCard
