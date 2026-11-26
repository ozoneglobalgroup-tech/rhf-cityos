// DV32O: current-identity access validation, read-only, on top of the N evidence dossier.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32N.jsx';
import Dv32OAccessMatrix from './Dv32OAccessMatrix.jsx';
export * from './Dv32DCapacityReservationsDv32N.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32OAccessMatrix {...props}/></>;
}
