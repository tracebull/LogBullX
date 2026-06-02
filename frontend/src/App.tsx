import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

import { Toaster } from './components/ui/sonner';
import { userApi } from './entity/users';
import { AuthPageComponent } from './pages/AuthPageComponent';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { ThemeProvider } from './shared/hooks/useTheme';
import { MainScreenComponent } from './widgets/main';

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
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route
          path="/"
          element={!isAuthorized ? <AuthPageComponent /> : <MainScreenComponent />}
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
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
