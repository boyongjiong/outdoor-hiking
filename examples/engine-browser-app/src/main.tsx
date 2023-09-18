import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Root from './routes/root'
import ErrorPage from './pages/ErrorPage'

// 页面组件
import BasicNode from './pages/core/BasicNode'
import RectNode from './pages/core/RectNode'

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
          {
            path: '/core/rect-node',
            element: <RectNode />,
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
