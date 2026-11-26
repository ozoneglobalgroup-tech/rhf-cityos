// Strict GET-only HTTP boundary, independent of the existing authenticated role checks.
export function validateAgentRequest({method,resourceId,url}){
 if(method!=='GET'||resourceId)throw new TypeError('READ_ONLY_ENDPOINT');
 const desk=url.searchParams.get('desk');
 if(!['mayor','deputy','waste'].includes(desk))throw new TypeError('EXPLICIT_DESK_REQUIRED');
 for(const key of url.searchParams.keys())if(!['desk','orgId'].includes(key))throw new TypeError('UNKNOWN_QUERY_PARAMETER');
 if(url.searchParams.getAll('desk').length!==1||url.searchParams.getAll('orgId').length>1)throw new TypeError('DUPLICATE_QUERY_PARAMETER');
 if(desk!=='waste'&&url.searchParams.has('orgId'))throw new TypeError('ORGANIZATION_SCOPE_FORBIDDEN');
 return desk;
}
