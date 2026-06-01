const AUTHORIZED_USER_ID_KEY = 'logbull_user_id';

export const accessTokenHelper = {
  saveUserId: (id: string) => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(AUTHORIZED_USER_ID_KEY, id);
  },

  getUserId: (): string | undefined => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    return localStorage.getItem(AUTHORIZED_USER_ID_KEY) || undefined;
  },

  clearUserId: () => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(AUTHORIZED_USER_ID_KEY);
  },

  isAuthenticated: (): boolean => {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return !!localStorage.getItem(AUTHORIZED_USER_ID_KEY);
  },
};
