// app/accounting/manual-journals/components/account-combobox.tsx
'use client';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/app/lib/utils';

interface Account {
  account_code: string;
  account_name: string;
  account_type: string;
  category: string;
}

interface AccountComboboxProps {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AccountCombobox({ 
  accounts, 
  value, 
  onChange, 
  disabled = false 
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find(account => account.account_code === value);

  // Group accounts by type
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.account_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedAccount ? (
            `${selectedAccount.account_code} - ${selectedAccount.account_name}`
          ) : (
            "Pilih akun..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="right"
        sideOffset={5}
      >
        <Command>
          <CommandInput placeholder="Cari akun..." />
          <CommandList className="max-h-40 overflow-y-auto">
            <CommandEmpty>Akun tidak ditemukan.</CommandEmpty>
            {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <CommandGroup key={type}>
                <div className="text-sm font-bold text-gray-500 uppercase px-1   py-1.5 bg-gray-50">
                  {type}
                </div>
                {typeAccounts.map((account) => (
                  <CommandItem
                    key={account.account_code}
                    value={`${type} ${account.account_code} ${account.account_name}`}

                    onSelect={() => {
                      onChange(account.account_code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.account_code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {account.account_code} - {account.account_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}