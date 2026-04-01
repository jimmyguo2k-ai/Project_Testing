import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import StoryPage from './pages/StoryPage';
import SessionsPage from './pages/SessionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sessions" replace />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/story/:id" element={<StoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
