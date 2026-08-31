import React, { createContext, useContext, useState } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  bagNumber: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('clms_student_token');
  });
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('clms_student_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('clms_student_token', newToken);
    localStorage.setItem('clms_student_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('clms_student_token');
    localStorage.removeItem('clms_student_user');
    // Reload to clear state if necessary, or just rely on state
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
