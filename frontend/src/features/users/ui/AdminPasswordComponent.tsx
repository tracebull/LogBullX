import { Eye, EyeOff } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

import { userApi } from '../../../entity/users';
import { toastMessage } from '../../../shared/lib/toastMessage';

interface AdminPasswordComponentProps {
  onPasswordSet?: () => void;
}

export function AdminPasswordComponent({
  onPasswordSet,
}: AdminPasswordComponentProps): JSX.Element {
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [isLoading, setLoading] = useState(false);

  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);

  const [adminPasswordError, setAdminPasswordError] = useState('');

  const validateFields = (): boolean => {
    if (!password) {
      setPasswordError(true);
      return false;
    }

    if (password.length < 8) {
      setPasswordError(true);
      toastMessage.error('Password must be at least 8 characters long');
      return false;
    }
    setPasswordError(false);

    if (!confirmPassword) {
      setConfirmPasswordError(true);
      return false;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(true);
      return false;
    }
    setConfirmPasswordError(false);

    return true;
  };

  const onSetPassword = async () => {
    setAdminPasswordError('');

    if (validateFields()) {
      setLoading(true);

      try {
        await userApi.setAdminPassword({
          password,
        });

        // Automatically sign in as admin after setting password
        await userApi.signIn({
          email: 'admin',
          password,
        });

        // Notify parent component that password was set successfully
        onPasswordSet?.();
      } catch (e) {
        setAdminPasswordError((e as Error).message);
      }
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-[300px]">
      <div className="mb-5 text-center text-2xl font-bold">Sign up admin</div>

      <div className="text-muted-foreground mx-auto mb-4 max-w-[250px] text-center text-sm">
        Then you will be able to sign in with login &quot;admin&quot; and password you set
      </div>

      <div className="my-1 text-xs font-semibold">Password</div>
      <div className="relative">
        <Input
          placeholder="********"
          type={passwordVisible ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPasswordError(false);
            setPassword(e.currentTarget.value);
          }}
          className={passwordError ? 'border-destructive pr-9' : 'pr-9'}
        />
        <button
          type="button"
          onClick={() => setPasswordVisible(!passwordVisible)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
        >
          {passwordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>

      <div className="my-1 text-xs font-semibold">Confirm password</div>
      <div className="relative">
        <Input
          placeholder="********"
          type={confirmPasswordVisible ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPasswordError(false);
            setConfirmPassword(e.currentTarget.value);
          }}
          className={confirmPasswordError ? 'border-destructive pr-9' : 'pr-9'}
        />
        <button
          type="button"
          onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
        >
          {confirmPasswordVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>

      <div className="mt-3" />

      <Button
        disabled={isLoading}
        className="w-full"
        onClick={() => {
          onSetPassword();
        }}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Loading...
          </>
        ) : (
          'Set Password'
        )}
      </Button>

      {adminPasswordError && (
        <div className="text-destructive mt-3 flex justify-center text-center text-sm">
          {adminPasswordError}
        </div>
      )}
    </div>
  );
}
