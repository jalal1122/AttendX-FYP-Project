import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add more slices here as needed
    // class: classReducer,
    // session: sessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
