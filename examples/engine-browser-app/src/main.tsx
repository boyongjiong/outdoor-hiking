import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Root from './routes/root'
import ErrorPage from './pages/ErrorPage'
import BasicNode from './pages/core/BasicNode'

import GetStarted from './pages/engine/GetStarted'
import Recorder from './pages/engine/Recorder'

import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/core',
        children: [
          {
            path: '/core/basic-node',
            element: <BasicNode />,
          },
        ],
      },
      {
        path: '/engine',
        children: [
          {
            path: '/engine/get-started',
            element: <GetStarted />,
          },
          {
            path: '/engine/recorder',
            element: <Recorder />,
          },
        ],
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
