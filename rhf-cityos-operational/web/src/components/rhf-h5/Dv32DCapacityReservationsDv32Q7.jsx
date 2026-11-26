// RHF DV32Q.7 real reference catalog; preserves previous operational and simulated sections.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32Q6.jsx';
import Dv32Q7OperationalCatalog from './Dv32Q7OperationalCatalog.jsx';
export * from './Dv32DCapacityReservationsDv32Q6.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32Q7OperationalCatalog {...props}/></>;
}
