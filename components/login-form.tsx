'use client'

import { cn } from "@/app/lib/utils"
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
import { useState } from 'react'

// Test account credentials
const TEST_ACCOUNTS = {
  admin: { email: 'admin@company.com', password: 'password123' },
  finance: { email: 'budi.finance@company.com', password: 'password123' },
  staff: { email: 'ahmad.sales@company.com', password: 'password123' }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Save token to localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        alert(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestAccount = async (role: 'admin' | 'finance' | 'staff') => {
    setIsLoading(true)
    
    const testAccount = TEST_ACCOUNTS[role]
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testAccount)
      })

      const data = await response.json()

      if (data.success) {
        // Save token to localStorage
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Show success message
        alert(`Successfully logged in as ${data.user.name} (${data.user.roles[0]?.role_name})`)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        alert(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </Field>
              
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </Field>
              
              <Field>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </Field>
              
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with Tester Account
              </FieldSeparator>
              
              <Field className="grid grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('staff')}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : 'Staff'}
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('finance')}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : 'Finance'}
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => handleTestAccount('admin')}
                  disabled={isLoading}
                >
                  {isLoading ? '...' : 'Admin'}
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