// RHF DV32UX3: role-bound three-workspace gateway; all legacy operational views retained.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32Q7.jsx';
import Dv32UX3Gateway from './Dv32UX3Gateway.jsx';
export * from './Dv32DCapacityReservationsDv32Q7.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Dv32UX3Gateway {...props}/><Previous {...props}/></>;
}
