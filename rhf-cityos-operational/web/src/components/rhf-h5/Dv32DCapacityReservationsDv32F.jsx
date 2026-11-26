// RHF DV32F: preserve DV32E+DV32D and append read-only three-desk panel.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32E.jsx';
import Dv32FThreeDesk from './Dv32FThreeDesk.jsx';
export * from './Dv32DCapacityReservationsDv32E.jsx';
export default function Dv32DCapacityReservations(props){
  return <><Previous {...props}/><Dv32FThreeDesk {...props}/></>;
}
