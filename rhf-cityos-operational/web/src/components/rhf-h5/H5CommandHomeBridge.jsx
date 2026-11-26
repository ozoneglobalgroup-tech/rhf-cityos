import A01ValueDiscoveryWorkspace from './A01ValueDiscoveryWorkspace.jsx';
import WastePilotLaunch from './WastePilotLaunch.jsx';
import React from 'react';
import H7DecisionWorkspace from './H7DecisionWorkspace.jsx';
import H8MyWork from './H8MyWork.jsx';
import DeputyPortfolioWorkspace from './DeputyPortfolioWorkspace.jsx';
import OrgReadinessWorkspace from './OrgReadinessWorkspace.jsx';
import './h5-mount.css';
import './h6-command-polish.css';
/** H8 adds a verified-authority inbox above H7, preserving every existing route and action. */
export default function H5CommandHomeBridge({cityName,city,cases,units,modules,navigate,api,access}){
  return <>
    <A01ValueDiscoveryWorkspace city={city} cityName={cityName} cases={cases} access={access} api={api} navigate={navigate}/>
    <H8MyWork city={city} api={api} navigate={navigate}/>
    <DeputyPortfolioWorkspace city={city} cityName={cityName} units={units} cases={cases} navigate={navigate}/>
    <WastePilotLaunch cityName={cityName} units={units} navigate={navigate}/>
    <OrgReadinessWorkspace city={city} cityName={cityName} units={units} cases={cases} navigate={navigate}/>
    <H7DecisionWorkspace city={city} cityName={cityName} cases={cases}
      units={units} modules={modules} navigate={navigate}/>
  </>;
}
