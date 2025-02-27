import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Login from '../guest/Login'

const RouterGuest = () => {
  return (
    <Routes>
      <Route path='/' element={<Login />} />
    </Routes>
  )
}

export default RouterGuest