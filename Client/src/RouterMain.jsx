import React from 'react';
import { Routes, Route } from 'react-router-dom';
import User from './user/User';
import Studio from './studio/Studio';
import Login from './guest/RouterGuest';

const RouterMain = () => {
  return (
    <Routes>
      <Route path='/*' element={<User />} />
      <Route path='/studio/*' element={<Studio />} />
      <Route path='/login/*' element={<Login />} />
    </Routes>
  );
};

export default RouterMain;
