// src/app/App.tsx
import { RouterProvider } from 'react-router-dom';
import UpdatePrompt from '../features/pwa/UpdatePrompt';
import { router } from './router';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <UpdatePrompt />
    </>
  );
}