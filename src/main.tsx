import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AnalyticsProvider } from './analytics';
import './styles.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AnalyticsProvider><App /></AnalyticsProvider></React.StrictMode>);
