import { toast } from 'sonner';

export const toastMessage = {
  error: (msg: string) => toast.error(msg),
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
};
