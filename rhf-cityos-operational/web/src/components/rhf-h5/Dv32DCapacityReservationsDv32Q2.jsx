// RHF DV32Q.2: link already-existing cases to provisional territory labels.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32Q.jsx';
import Dv32Q2CaseTerritory from './Dv32Q2CaseTerritory.jsx';
export * from './Dv32DCapacityReservationsDv32Q.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32Q2CaseTerritory {...props}/></>;
}
