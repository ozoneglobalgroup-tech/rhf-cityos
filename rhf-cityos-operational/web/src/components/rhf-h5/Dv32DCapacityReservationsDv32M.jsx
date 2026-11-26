// DV32M: read-only Temporal observation on top of L governed readiness.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32L.jsx';
import Dv32MTemporalObservability from './Dv32MTemporalObservability.jsx';
export * from './Dv32DCapacityReservationsDv32L.jsx';
export default function Dv32DCapacityReservations(props){
 return <><Previous {...props}/><Dv32MTemporalObservability {...props}/></>;
}
