'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Navigasi ke dashboard saat form di-submit
    router.push('/dashboard')
  }

  const handleTestAccount = (role: string) => {
    console.log(`Login as ${role}`)
    // Auto isi form atau langsung navigasi
    router.push('/dashboard')
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Finance Inc account
                </p>
              </div>
              
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                />
              </Field>
              
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input id="password" type="password" />
              </Field>
              
              <Field>
                <Button type="submit" className="w-full">Login</Button>
              </Field>
              
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with Tester Account
              </FieldSeparator>
              
              <Field className="grid grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('staff')}
                >
                  Staff
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('finance')}
                >
                  Finance
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('admin')}
                >
                  Admin
                </Button>
              </Field>

              {/* Link alternative */}
              <div className="text-center mt-4">
                <Link 
                  href="/salesorder" 
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Skip login & go directly to Dashboard
                </Link>
              </div>
            </FieldGroup>
          </form>
          
          <div className="bg-muted relative hidden md:block">
            <img
              src="/abc.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      
      <FieldDescription className="px-6 text-center">
        Powered by <a href="#">DRBTH</a>{" "}
      </FieldDescription>
    </div>
  )
}