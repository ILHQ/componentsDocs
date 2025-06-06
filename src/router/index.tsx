import { createBrowserRouter, Navigate } from 'react-router-dom';
import Home from '@/pages/home';

const router = (createBrowserRouter as any)([
  {
    path: '/',
    element: <Navigate to="home" replace />,
  },
  {
    path: '/home',
    element: <Home />,
  },
]);

export default router;
