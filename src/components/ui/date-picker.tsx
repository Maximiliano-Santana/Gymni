"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const date = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined

  function handleSelect(day: Date | undefined) {
    onChange?.(day ? format(day, "yyyy-MM-dd") : "")
    setOpen(false)
  }

  const trigger = (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={() => setOpen(true)}
      className={cn(
        "w-full justify-start text-left font-normal h-9",
        !date && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="mr-2 size-4 shrink-0" />
      {date ? format(date, "d MMM yyyy", { locale: es }) : placeholder}
    </Button>
  )

  const calendar = (
    <Calendar
      mode="single"
      selected={date}
      onSelect={handleSelect}
      locale={es}
      defaultMonth={date}
    />
  )

  if (isMobile) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            className="w-auto max-w-[calc(100%-2rem)] p-0 justify-items-center"
          >
            <DialogTitle className="sr-only">Seleccionar fecha</DialogTitle>
            {calendar}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        {calendar}
      </PopoverContent>
    </Popover>
  )
}
