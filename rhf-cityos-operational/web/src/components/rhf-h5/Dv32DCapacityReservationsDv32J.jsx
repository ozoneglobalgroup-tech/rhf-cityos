// RHF DV32J: Temporal planning handoff; no field dispatch, payment or verified value.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32I.jsx';
import Dv32JTemporalHandoff from './Dv32JTemporalHandoff.jsx';
export * from './Dv32DCapacityReservationsDv32I.jsx';
export default function Dv32DCapacityReservations(props) {
 return <><Previous {...props}/><Dv32JTemporalHandoff {...props}/></>;
}
