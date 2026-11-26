// DV32UX43: presentation states only. Backend authorization is the sole source of permissions.
export function focusViewMode({hasRoute,authorized,checking,evaluated,failed}){
 if(!hasRoute)return 'INTRO';
 if(checking===true)return 'VERIFYING';
 if(authorized===true)return 'WORKBENCH';
 if(!evaluated&&!failed)return 'VERIFYING';
 return 'RESTRICTED';
}
