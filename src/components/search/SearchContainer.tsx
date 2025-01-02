import React from 'react';
import RegularSearch from './RegularSearch';
import ProSearch from './ProSearch';
import { useUserType } from '../../hooks/useUserType';

export default function SearchContainer() {
  const userType = useUserType();

  // Show Pro search only for pro users
  return userType === 'pro' ? <ProSearch /> : <RegularSearch />;
}