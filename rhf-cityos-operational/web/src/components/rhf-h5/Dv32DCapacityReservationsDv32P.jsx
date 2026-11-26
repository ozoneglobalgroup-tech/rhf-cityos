// RHF DV32P.1: bounded pilot gap audit; native operational workspace only.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32O.jsx';
import Dv32PPilotReadiness from './Dv32PPilotReadiness.jsx';
export * from './Dv32DCapacityReservationsDv32O.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32PPilotReadiness {...props}/></>;
}
