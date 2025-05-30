import { useColorMode } from '@chakra-ui/react';
import { StoreProvider } from 'easy-peasy';
import { Settings } from 'luxon';
import { useCallback, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TrayLayout } from './components/TrayLayout/TrayLayout';
import { Logger } from './logger';
import { RootProvider } from './RootContext';
import { ChartThemeProvider } from './routes/ChartThemeProvider';
import { MainAppPage } from './routes/MainAppPage';
import { NotificationAppPage } from './routes/NotificationAppPage';
import { TrayAppPage } from './routes/TrayAppPage';
import { VerificationPage } from './routes/VerificationPage';
import { ElectronEventEmitter } from './services/ElectronEventEmitter';
import { mainStore } from './store/mainStore';
import { useGoogleAnalytics } from './useGoogleAnalytics';
import { AuthProvider } from './features/auth';

Settings.defaultLocale = 'en-GB';

export function MainRouter() {
    useGoogleAnalytics();
    const { setColorMode } = useColorMode();

    const changeActiveTheme = useCallback(
        (themeName) => {
            setColorMode(themeName);
        },
        [setColorMode],
    );

    useEffect(() => {
        ElectronEventEmitter.on('activeThemeChanged', changeActiveTheme);

        return () => {
            Logger.debug('Clearing eventEmitter');
            ElectronEventEmitter.off('activeThemeChanged', changeActiveTheme);
        };
    }, [changeActiveTheme]);

    return (
        <ChartThemeProvider>
            <RootProvider>
                <AuthProvider>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/verify-email" element={<VerificationPage />} />
                        
                        {/* Protected routes */}
                        <Route
                            path="/app/*"
                            element={
                                <ProtectedRoute>
                                    <StoreProvider store={mainStore}>
                                        <MainAppPage />
                                    </StoreProvider>
                                </ProtectedRoute>
                            }
                        />

                        {/* Tray App - No longer needs trayStore */}
                        <Route
                            path="/trayApp"
                            element={
                                <TrayLayout>
                                    <ErrorBoundary>
                                        <TrayAppPage />
                                    </ErrorBoundary>
                                </TrayLayout>
                            }
                        />

                        <Route path="/notificationApp" element={<NotificationAppPage />} />

                        {/* Redirect from root to /app */}
                        <Route path="/" element={<Navigate to="/app" replace />} />

                        {/* Fallback redirect to /app */}
                        <Route path="*" element={<Navigate to="/app" replace />} />
                    </Routes>
                </AuthProvider>
            </RootProvider>
        </ChartThemeProvider>
    );
}
