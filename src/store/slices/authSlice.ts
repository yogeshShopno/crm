import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  user: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  } | null;
  role: string | null;
  permissions: any | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  role: null,
  permissions: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        user: any;  
        role: string;
        permissions: any;
      }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.permissions = action.payload.permissions;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.role = null;
      state.permissions = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
