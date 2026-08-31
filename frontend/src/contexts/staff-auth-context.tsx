import React, { createContext, useContext, useState } from 'react';

type StaffUser = {
  id: string;
  name: string;
  username: string;
  role: string;
};

type StaffAuthContextType = {
  staffUser: StaffUser | null;
  staffToken: string | null;
  staffLogin: (token: string, user: StaffUser) => void;
  staffLogout: () => void;
};

const StaffAuthContext = createContext<StaffAuthContextType>({
  staffUser: null,
  staffToken: null,
  staffLogin: () => {},
  staffLogout: () => {},
});

export const useStaffAuth = () => useContext(StaffAuthContext);

export const StaffAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [staffToken, setStaffToken] = useState<string | null>(() => {
    return localStorage.getItem('clms_staff_token');
  });
  const [staffUser, setStaffUser] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('clms_staff_user');
    return saved ? JSON.parse(saved) : null;
  });

  const staffLogin = (newToken: string, newUser: StaffUser) => {
    setStaffToken(newToken);
    setStaffUser(newUser);
    localStorage.setItem('clms_staff_token', newToken);
    localStorage.setItem('clms_staff_user', JSON.stringify(newUser));
  };

  const staffLogout = () => {
    setStaffToken(null);
    setStaffUser(null);
    localStorage.removeItem('clms_staff_token');
    localStorage.removeItem('clms_staff_user');
    window.location.href = '/staff/login';
  };

  return (
    <StaffAuthContext.Provider value={{ staffUser, staffToken, staffLogin, staffLogout }}>
      {children}
    </StaffAuthContext.Provider>
  );
};
