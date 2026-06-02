import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route } from 'react-router';
import { Routes } from 'react-router';

import { Toaster } from './components/ui/sonner';
import { userApi } from './entity/users';
import { AuthPageComponent } from './pages/AuthPageComponent';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { ThemeProvider, useTheme } from './shared/hooks/useTheme';
import { MainScreenComponent } from './widgets/main';

function AntdConfigWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#009966',
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}

function AppContent() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const isAuthorized = userApi.isAuthorized();
    setIsAuthorized(isAuthorized);

    userApi.addAuthListener(() => {
      setIsAuthorized(userApi.isAuthorized());
    });
  }, []);

  return (
    <AntdConfigWrapper>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route
            path="/"
            element={!isAuthorized ? <AuthPageComponent /> : <MainScreenComponent />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AntdConfigWrapper>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
