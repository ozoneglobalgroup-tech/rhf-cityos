"""DV32K: LangGraph deterministic multi-specialist council. No LLM, tools, DB or Temporal API."""
from __future__ import annotations
from typing import TypedDict,Any
import re
UUID=re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',re.I)
METRIC=re.compile(r'^[a-z][a-z0-9_]{0,70}$')
CAND=re.compile(r'^[a-z0-9:-]{3,110}$')
SOURCES={'service_cases','capacity_resources','capacity_allocations','org_units + service_cases'}
KINDS={'AGGREGATE','DIRECT_UNIT_AGGREGATE','SCOPED_AGGREGATE'}
PRIORITIES={'HIGH':0,'MEDIUM':1,'LOW':2}
class State(TypedDict,total=False):
    payload:dict[str,Any]
    assessed:list[dict[str,Any]]
    ordered:list[dict[str,Any]]
    guarded:list[dict[str,Any]]
    result:dict[str,Any]
def validate_payload(p):
    if not isinstance(p,dict) or set(p)!={'schema','desk','scope','candidates'} or p['schema']!='RHF-DV32K-GRAPH-INPUT-v1':
        raise ValueError('INVALID_GRAPH_ENVELOPE')
    desk=p['desk'];scope=p['scope'];items=p['candidates']
    if desk not in ('mayor','deputy','waste') or not isinstance(scope,dict):raise ValueError('INVALID_DESK')
    required={'tenantId','municipalityId'}|({'organizationId'} if desk=='waste' else set())
    if set(scope)!=required or any(not isinstance(scope[k],str) or not UUID.fullmatch(scope[k]) for k in required):raise ValueError('INVALID_SCOPE')
    if not isinstance(items,list) or len(items)>10:raise ValueError('CANDIDATE_LIMIT')
    seen=set()
    for c in items:
        if not isinstance(c,dict) or set(c)!={'id','priority','evidence'} or not isinstance(c['id'],str) or not CAND.fullmatch(c['id']) or c['id'] in seen or c['priority'] not in PRIORITIES:raise ValueError('INVALID_CANDIDATE')
        seen.add(c['id'])
        evidence=c['evidence']
        if not isinstance(evidence,list) or not 1<=len(evidence)<=8:raise ValueError('EVIDENCE_LIMIT')
        for e in evidence:
            if not isinstance(e,dict) or not {'source','kind','metric','count'}<=set(e) or set(e)-{'source','kind','metric','count','unitId'}:raise ValueError('INVALID_EVIDENCE_SHAPE')
            if e['source'] not in SOURCES or e['kind'] not in KINDS or not isinstance(e['metric'],str) or not METRIC.fullmatch(e['metric']):raise ValueError('UNTRUSTED_EVIDENCE')
            if type(e['count']) is not int or e['count']<0 or e['count']>2**53-1:raise ValueError('INVALID_COUNT')
            if 'unitId' in e and (not isinstance(e['unitId'],str) or not UUID.fullmatch(e['unitId'])):raise ValueError('INVALID_UNIT_ID')
    return p

def evidence_agent(state:State):
    p=state['payload']; rows=[]
    for c in p['candidates']:
        e=c['evidence']; kinds=sorted({x['kind'] for x in e})
        rows.append({'id':c['id'],'priority':c['priority'],'metrics':[{'metric':x['metric'],'count':x['count'],'source':x['source']} for x in e],
                     'evidenceKinds':kinds,'reviewCategory':'EVIDENCE_RECONCILIATION' if any('capacity_' in x['source'] for x in e) or c['id']=='data-quality-review' else 'AGGREGATE_REVIEW'})
    return {'assessed':rows}

def urgency_agent(state:State):
    # Preserve source priority; a count alone is not a validated impact or benefit forecast.
    ordered=sorted(state['assessed'],key=lambda c:(PRIORITIES[c['priority']],c['id']))
    return {'ordered':ordered}

def urban_value_guard_agent(state:State):
    guarded=[]
    for r in state['ordered']:
        guarded.append({'id':r['id'],'priority':r['priority'],'reviewCategory':r['reviewCategory'],
                        'sourceMetrics':r['metrics'],'evidenceKinds':r['evidenceKinds'],
                        'nextStep':'REQUEST_INDEPENDENT_HUMAN_EVIDENCE_REVIEW',
                        'verifiedUrbanValue':None,'estimatedUrbanValue':None,
                        'humanApprovalRequired':True,'executionAuthorization':False})
    return {'guarded':guarded}

def governance_agent(state:State):
    p=state['payload']
    return {'result':{'schema':'RHF-DV32K-LANGGRAPH-v1','desk':p['desk'],'scope':p['scope'],
       'engine':{'framework':'LangGraph','execution':'SYNCHRONOUS_READ_ONLY','agents':['evidence_agent','urgency_agent','urban_value_guard_agent','governance_agent'],'modelInferenceUsed':False},
       'recommendations':state['guarded'],
       'controls':{'humanApprovalRequired':True,'fieldDispatch':False,'payments':False,'reservations':False,
                   'temporalStarted':False,'modelInferenceUsed':False,'verifiedUrbanValue':False},
       'caveat':'Evidence aggregates are signals for independent review, not claims of realized urban value.'}}

def build_graph():
    from langgraph.graph import StateGraph,START,END
    graph=StateGraph(State)
    graph.add_node('evidence_agent',evidence_agent)
    graph.add_node('urgency_agent',urgency_agent)
    graph.add_node('urban_value_guard_agent',urban_value_guard_agent)
    graph.add_node('governance_agent',governance_agent)
    graph.add_edge(START,'evidence_agent')
    graph.add_edge('evidence_agent','urgency_agent')
    graph.add_edge('urgency_agent','urban_value_guard_agent')
    graph.add_edge('urban_value_guard_agent','governance_agent')
    graph.add_edge('governance_agent',END)
    return graph.compile()

def analyze(graph,payload):
    validate_payload(payload)
    return graph.invoke({'payload':payload},config={'recursion_limit':8})['result']
