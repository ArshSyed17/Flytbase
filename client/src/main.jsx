import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { StoreProvider } from './lib/store.jsx';
import Layout from './components/Layout.jsx';
import Overview from './pages/Overview.jsx';
import Questions from './pages/Questions.jsx';
import Accounts, { AccountDetail } from './pages/Accounts.jsx';
import PowerMap from './pages/PowerMap.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Evidence from './pages/Evidence.jsx';
import Planner from './pages/Planner.jsx';
import Events from './pages/Events.jsx';
import Notes from './pages/Notes.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="questions" element={<Questions />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/:id" element={<AccountDetail />} />
            <Route path="power" element={<PowerMap />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="planner" element={<Planner />} />
            <Route path="events" element={<Events />} />
            <Route path="notes" element={<Notes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  </React.StrictMode>
);
