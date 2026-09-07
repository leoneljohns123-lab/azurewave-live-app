
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

        switch (displayVariant) {
          case 'success':
            iconComponent = (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 flex-shrink-0">
                <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-white" />
              </div>
            );
            break;
          case 'destructive':
            iconComponent = (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 flex-shrink-0">
                <FontAwesomeIcon icon={faTimes} className="h-4 w-4 text-white" />
              </div>
            );
            break;
          case 'warning':
            iconComponent = (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 flex-shrink-0">
                <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 text-white" />
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
