import { Eye, EyeOff } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

import { IS_CLOUD } from '../../../constants';
import { userApi } from '../../../entity/users';
import { StringUtils } from '../../../shared/lib';
import { FormValidator } from '../../../shared/lib/FormValidator';
import { OauthComponent } from './OauthComponent';

interface SignInComponentProps {
  onSwitchToSignUp?: () => void;
}

export function SignInComponent({ onSwitchToSignUp }: SignInComponentProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [isLoading, setLoading] = useState(false);

  const [isEmailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const [signInError, setSignInError] = useState('');

  const validateFieldsForSignIn = (): boolean => {
    if (!email) {
      setEmailError(true);
      return false;
    }

    if (!FormValidator.isValidEmail(email) && email !== 'admin') {
      setEmailError(true);
      return false;
    }

    if (!password) {
      setPasswordError(true);
      return false;
    }
    setPasswordError(false);

    return true;
  };

  const onSignIn = async () => {
    setSignInError('');

    if (validateFieldsForSignIn()) {
      setLoading(true);

      try {
        await userApi.signIn({
          email,
          password,
        });
      } catch (e) {
        setSignInError(StringUtils.capitalizeFirstLetter((e as Error).message));
      }

      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[300px]">
      <div className="mb-5 text-center text-2xl font-bold">Sign in</div>

      <OauthComponent />

      {IS_CLOUD && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background text-muted-foreground px-2">or continue</span>
          </div>
        </div>
      )}

      <div className="my-1 text-xs font-semibold">Your email</div>
      <Input
        placeholder="your@email.com"
        value={email}
        onChange={(e) => {
          setEmailError(false);
          setEmail(e.currentTarget.value.trim().toLowerCase());
        }}
        className={isEmailError ? 'border-destructive' : undefined}
        type="email"
      />

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

      <div className="mt-3" />

      <Button
        disabled={isLoading}
        className="w-full"
        onClick={() => {
          onSignIn();
        }}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Loading...
          </>
        ) : (
          'Sign in'
        )}
      </Button>

      {signInError && (
        <div className="text-destructive mt-3 flex justify-center text-center text-sm">
          {signInError}
        </div>
      )}

      {onSwitchToSignUp && (
        <div className="text-muted-foreground mt-4 text-center text-sm">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary hover:text-primary/80 cursor-pointer font-medium"
          >
            Sign up
          </button>
        </div>
      )}
    </div>
  );
}
