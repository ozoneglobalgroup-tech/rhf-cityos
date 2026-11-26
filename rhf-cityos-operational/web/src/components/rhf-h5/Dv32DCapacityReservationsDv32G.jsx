// RHF DV32G: extend the existing DV32F native workspace without replacing it.
import React from 'react';
import Previous from './Dv32DCapacityReservationsDv32F.jsx';
import Dv32GOrgIAM from './Dv32GOrgIAM.jsx';
export * from './Dv32DCapacityReservationsDv32F.jsx';
export default function Dv32DCapacityReservations(props) {
 return <><Previous {...props}/><Dv32GOrgIAM {...props}/></>;
}
