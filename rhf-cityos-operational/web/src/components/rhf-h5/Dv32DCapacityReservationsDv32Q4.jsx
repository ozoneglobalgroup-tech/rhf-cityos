// DV32Q.4 read-only worklist; integrated into existing app.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32Q3.jsx';
import Dv32Q4MappingWorklist from './Dv32Q4MappingWorklist.jsx';
export * from './Dv32DCapacityReservationsDv32Q3.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32Q4MappingWorklist {...props}/></>;
}
