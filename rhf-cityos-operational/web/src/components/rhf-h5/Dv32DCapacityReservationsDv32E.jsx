// RHF DV32E read-only companion wrapper, preserves DV32D default and named exports.
import React from 'react';
import Dv32DOriginal from './Dv32DCapacityReservationsBase.jsx';
import Dv32ECapacityGovernance from './Dv32ECapacityGovernance.jsx';
export * from './Dv32DCapacityReservationsBase.jsx';
export default function Dv32DCapacityReservations(props) {
  return <><Dv32DOriginal {...props} /><Dv32ECapacityGovernance {...props}/></>;
}
