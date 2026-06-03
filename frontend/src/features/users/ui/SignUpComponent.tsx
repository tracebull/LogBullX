import { Eye, EyeOff } from 'lucide-react';
import { type JSX, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

import { IS_CLOUD } from '../../../constants';
import { userApi } from '../../../entity/users';
import { StringUtils } from '../../../shared/lib';
import { FormValidator } from '../../../shared/lib/FormValidator';
import { toastMessage } from '../../../shared/lib/toastMessage';
import { OauthComponent } from './OauthComponent';

interface SignUpComponentProps {
  onSwitchToSignIn?: () => void;
}

export function SignUpComponent({ onSwitchToSignIn }: SignUpComponentProps): JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [isLoading, setLoading] = useState(false);

  const [nameError, setNameError] = useState(false);
  const [isEmailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);

  const [signUpError, setSignUpError] = useState('');

  const validateFieldsForSignUp = (): boolean => {
    if (!name || name.trim() === '') {
      setNameError(true);
      toastMessage.error('Name is required');
      return false;
    }
    setNameError(false);

    if (!email) {
      setEmailError(true);
      return false;
    }

    if (!FormValidator.isValidEmail(email)) {
      setEmailError(true);
      return false;
    }

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

  const onSignUp = async () => {
    setSignUpError('');

    if (validateFieldsForSignUp()) {
      setLoading(true);

      try {
        await userApi.signUp({
          email,
          password,
          name,
        });
        await userApi.signIn({ email, password });
      } catch (e) {
        setSignUpError(StringUtils.capitalizeFirstLetter((e as Error).message));
      }
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-[300px]">
      <div className="mb-5 text-center text-2xl font-bold">Sign up</div>

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

      <div className="my-1 text-xs font-semibold">Your name</div>
      <Input
        placeholder="John Doe"
        value={name}
        onChange={(e) => {
          setNameError(false);
          setName(e.currentTarget.value);
        }}
        className={nameError ? 'border-destructive' : undefined}
      />

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
          onSignUp();
        }}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Loading...
          </>
        ) : (
          'Sign up'
        )}
      </Button>

      {signUpError && (
        <div className="text-destructive mt-3 flex justify-center text-center text-sm">
          {signUpError}
        </div>
      )}

      {onSwitchToSignIn && (
        <div className="text-muted-foreground mt-4 text-center text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="text-primary hover:text-primary/80 cursor-pointer font-medium"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
