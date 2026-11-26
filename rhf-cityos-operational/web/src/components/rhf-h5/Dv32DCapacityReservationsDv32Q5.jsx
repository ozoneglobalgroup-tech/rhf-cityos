// DV32Q.5 synthetic-only pilot view; preserves every prior component.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32Q4.jsx';
import Dv32Q5SyntheticPilot from './Dv32Q5SyntheticPilot.jsx';
export * from './Dv32DCapacityReservationsDv32Q4.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32Q5SyntheticPilot {...props}/></>;
}
