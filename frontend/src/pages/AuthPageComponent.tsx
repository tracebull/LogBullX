import { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Spinner } from '../components/ui/spinner';
import { settingsApi, userApi } from '../entity/users';
import { AuthNavbarComponent } from '../features/users';
import { ThemeToggle } from '../features/users/ui/ThemeToggle';

const AdminPasswordComponent = lazy(() =>
  import('../features/users/ui/AdminPasswordComponent').then((m) => ({
    default: m.AdminPasswordComponent,
  })),
);
const SignInComponent = lazy(() =>
  import('../features/users/ui/SignInComponent').then((m) => ({
    default: m.SignInComponent,
  })),
);
const SignUpComponent = lazy(() =>
  import('../features/users/ui/SignUpComponent').then((m) => ({
    default: m.SignUpComponent,
  })),
);

export function AuthPageComponent() {
  const [searchParams] = useSearchParams();
  const isInviteMode = searchParams.get('mode') === 'invite';

  const [isAdminHasPassword, setIsAdminHasPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>(
    isInviteMode ? 'signUp' : 'signIn',
  );
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState(true);
  const [isLoading, setLoading] = useState(true);

  const canShowSignUp = isInviteMode || isRegistrationEnabled;

  const checkAdminPasswordStatus = () => {
    setLoading(true);

    userApi
      .isAdminHasPassword()
      .then((response) => {
        setIsAdminHasPassword(response.hasPassword);
        setLoading(false);
      })
      .catch((e) => {
        alert('Failed to check admin password status: ' + (e as Error).message);
      });
  };

  useEffect(() => {
    checkAdminPasswordStatus();

    settingsApi.getPublicSettings().then((settings) => {
      setIsRegistrationEnabled(settings.isAllowExternalRegistrations);
    });
  }, []);

  return (
    <div>
      <div className="fixed right-4 bottom-4 z-50">
        <ThemeToggle />
      </div>
      {isLoading ? (
        <div className="flex h-screen w-screen items-center justify-center">
                    <Spinner size="lg" />
        </div>
      ) : (
        <div>
          <div>
            <AuthNavbarComponent />

            <div className="mt-10 flex justify-center sm:mt-[10vh]">
              <Suspense
                fallback={
                  <div className="flex h-[300px] items-center justify-center">
          <Spinner size="lg" />
                  </div>
                }
              >
                {isAdminHasPassword ? (
                  authMode === 'signUp' && canShowSignUp ? (
                    <SignUpComponent onSwitchToSignIn={() => setAuthMode('signIn')} />
                  ) : (
                    <SignInComponent
                      onSwitchToSignUp={
                        canShowSignUp ? () => setAuthMode('signUp') : undefined
                      }
                    />
                  )
                ) : (
                  <AdminPasswordComponent onPasswordSet={checkAdminPasswordStatus} />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
