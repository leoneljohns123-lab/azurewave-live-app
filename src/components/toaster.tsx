
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faExclamationTriangle, faTimes } from "@fortawesome/free-solid-svg-icons"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        
        let iconComponent = null;

        // Treat 'default' and undefined as 'success' for icon purposes
        const displayVariant = !variant || variant === 'default' ? 'success' : variant;

        const iconContainerClasses = "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0";
        const iconClasses = "h-4 w-4 text-white";

        switch (displayVariant) {
          case 'success':
            iconComponent = (
              <div className={cn(iconContainerClasses, "bg-green-500")}>
                <FontAwesomeIcon icon={faCheck} className={iconClasses} />
              </div>
            );
            break;
          case 'destructive':
            iconComponent = (
              <div className={cn(iconContainerClasses, "bg-red-500")}>
                <FontAwesomeIcon icon={faTimes} className={iconClasses} />
              </div>
            );
            break;
          case 'warning':
            iconComponent = (
              <div className={cn(iconContainerClasses, "bg-yellow-500")}>
                <FontAwesomeIcon icon={faExclamationTriangle} className={iconClasses} />
              </div>
            );
            break;
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            {iconComponent}
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (<ToastDescription>{description}</ToastDescription>)}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
