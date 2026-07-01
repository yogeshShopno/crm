import "@/styles/globals.css";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor, RootState } from "@/store";
import type { AppProps } from "next/app";
import { Poppins } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import axios from "axios";
// import "@/mockAxiosAdapter"; // Disabled client-side mock, now using real Next.js API route to update mockData.json on disk
import { clearAuthToken } from "@/config";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
});

if (typeof window !== "undefined") {
  // Axios interceptors removed to allow mock data without auth tokens
}

function AuthGuard({ children, isLoginPage }: { children: React.ReactNode; isLoginPage: boolean }) {
  // Authentication removed as requested
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathName = usePathname();
  const isLoginPage = pathName === "/login";

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthGuard isLoginPage={isLoginPage}>
          <div className={poppins.className}>
            <div className="flex min-h-screen bg-white">
              {!isLoginPage && (
                <Sidebar
                  isOpen={isSidebarOpen}
                  toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                />
              )}
              <div
                className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
                  !isLoginPage ? (isSidebarOpen ? 'md:ml-64' : 'md:ml-20') : ''
                }`}
              >
                <main className="animate-in fade-in duration-300">
                  {/* Only show header for non-login pages */}
                  {!isLoginPage ? (
                    <Header toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
                  ) : null}
                  <div className={isLoginPage ? "p-0" : "p-4 md:p-6"}>
                    <Component {...pageProps} />
                  </div>
                </main>
              </div>
            </div>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </div>
        </AuthGuard>
      </PersistGate>
    </Provider>
  );
}