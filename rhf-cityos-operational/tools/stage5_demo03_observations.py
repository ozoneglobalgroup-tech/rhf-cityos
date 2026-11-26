#!/usr/bin/env python3
"""RHF ACOS Stage 5 DEMO-03: interactive synthetic observation acceptance via existing API.

No direct SQL writes. No stored credentials/cookies. Scope is pinned to the named
Shiraz demo municipality, one known case and one known digital twin. Every
business write requires an explicit interactive confirmation. Nothing verifies
real-world safety, causality or public value.
"""
from __future__ import annotations

import argparse
import getpass
import http.cookiejar
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

DEMO_CITY = 'شهرداری شیراز — دمو آزمایشی'
CASE_ID = '8ea9e486-a379-4557-8ce9-a81f0d503203'
TWIN_ID = '09c84b93-c9fa-430d-9266-95715ee867ec'
METRIC = 'demo03_synthetic_branch_count'
METRIC_LABEL = 'شمار شاخه‌های خطرآفرین - داده کاملاً مصنوعی'
SOURCE = 'SYNTHETIC_DEMO | Stage5 DEMO-03 | no site visit, no live sensor, no safety certification'
SAMPLES = [
    dict(phase='BASELINE_SIMULATED', observedAt='2026-10-29T10:00:00Z', value=5),
    dict(phase='FOLLOWUP_SIMULATED', observedAt='2026-10-30T10:00:00Z', value=2),
]
WRITE_ROLES = {'MUNICIPAL_ADMIN', 'DEPUTY', 'DIRECTOR', 'OPERATOR'}
REVIEW_ROLES = {'MUNICIPAL_ADMIN', 'DEPUTY'}

class DemoError(Exception):
    pass


def prompt(message: str) -> str:
    try:
        return input(message).strip()
    except (EOFError, KeyboardInterrupt):
        raise DemoError('Operator cancelled; no additional write requested') from None


def rows(obj):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict) and isinstance(obj.get('rows'), list):
        return obj['rows']
    raise DemoError('Unexpected list response shape from API')


def validate_base(base: str) -> str:
    u = urllib.parse.urlsplit(base)
    if u.scheme != 'http' or u.hostname not in ('127.0.0.1', 'localhost', '::1') or u.username or u.password or u.path not in ('', '/') or u.query or u.fragment:
        raise DemoError('For safety, --base must be a plain loopback HTTP origin, e.g. http://127.0.0.1:3210')
    return base.rstrip('/')


@dataclass
class API:
    base: str
    def __post_init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def request(self, method: str, path: str, payload=None):
        if not path.startswith('/api/v1/') and path != '/healthz':
            raise DemoError('Unexpected API path')
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8') if payload is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
        try:
            with self.client.open(req, timeout=12) as response:
                raw = response.read(500_000)
                return json.loads(raw.decode('utf-8')) if raw else {}
        except urllib.error.HTTPError as e:
            try:
                body = json.loads(e.read(2000).decode('utf-8'))
                detail = str(body.get('error', 'Request rejected'))[:250]
            except (ValueError, UnicodeDecodeError, AttributeError):
                detail = 'Request rejected'
            raise DemoError(f'HTTP {e.code}: {detail}') from None
        except (urllib.error.URLError, TimeoutError) as e:
            raise DemoError(f'Local API unavailable: {type(e).__name__}; check port and container') from None
        except (UnicodeDecodeError, ValueError) as e:
            raise DemoError(f'Invalid JSON response from API: {type(e).__name__}') from None

    def login(self, username: str):
        password = getpass.getpass(f'Password for {username} (hidden): ')
        if not password:
            raise DemoError('Empty password')
        try:
            result = self.request('POST', '/api/v1/auth/login', {'username': username, 'password': password})
        finally:
            password = None
        if not isinstance(result, dict) or result.get('ok') is not True:
            raise DemoError('Login response was not successful')
        me = self.request('GET', '/api/v1/auth/me')
        user = me.get('user') if isinstance(me, dict) else None
        if not isinstance(user, dict) or not user.get('id'):
            raise DemoError('Cannot resolve authenticated actor')
        print('AUTH=PASS; actor=', user.get('username', '<unknown>'), '; password/cookie not printed')
        return user


def scope(api: API):
    cities = rows(api.request('GET', '/api/v1/municipalities'))
    matches = [c for c in cities if c.get('name') == DEMO_CITY]
    if len(matches) != 1:
        raise DemoError('Exact Shiraz synthetic demo municipality not uniquely visible to actor; refusing')
    city_id = matches[0]['id']
    base_path = f'/api/v1/cities/{city_id}'
    access = api.request('GET', base_path + '/access')
    role = access.get('role') if isinstance(access, dict) else None
    twins = rows(api.request('GET', base_path + '/digital-twins'))
    matches = [t for t in twins if t.get('id') == TWIN_ID and t.get('case_id') == CASE_ID
               and t.get('twin_type') == 'GREEN_SPACE'
               and ('آزمایشی' in str(t.get('name', '')))]
    if len(matches) != 1:
        raise DemoError('Known DEMO-03 GREEN_SPACE twin not returned with expected case/type/demo name; refusing')
    print('CITY=SHIRAZ_SYNTHETIC_DEMO; ROLE=', role)
    print('TWIN_ID=', TWIN_ID, '; CASE_ID=', CASE_ID)
    return base_path, role


def observations(api: API, base_path: str):
    query = urllib.parse.urlencode({'twinId': TWIN_ID})
    found = rows(api.request('GET', base_path + '/twin-observations?' + query))
    return [o for o in found if o.get('twin_id') == TWIN_ID]


def sample_matches(obs, sample):
    return (obs.get('metric_code') == METRIC
            and obs.get('observed_at', '').startswith(sample['observedAt'][:19])
            and float(obs.get('measured_value', -1)) == sample['value']
            and str(obs.get('source_reference', '')).startswith('SYNTHETIC_DEMO'))


def preflight(api, base_path):
    all_rows = observations(api, base_path)
    relevant = [o for o in all_rows if o.get('metric_code') == METRIC]
    print('OBSERVATIONS_VISIBLE=', len(all_rows))
    print('DEMO03_METRIC_OBSERVATIONS=', len(relevant))
    for o in relevant:
        print('OBS:', o.get('id'), 'observed_at=', o.get('observed_at'),
              'value=', o.get('measured_value'), 'review=', o.get('review_status'),
              'synthetic_tag=', 'SYNTHETIC_DEMO' in str(o.get('source_reference', '')))
    print('NO_BUSINESS_WRITES_IN_PREFLIGHT=YES')


def submit(api, base_path, role):
    if role not in WRITE_ROLES:
        raise DemoError('Role not authorized to submit observations')
    existing = observations(api, base_path)
    matching_metric = [o for o in existing if o.get('metric_code') == METRIC]
    if len(matching_metric) > 2:
        raise DemoError('Unexpected multiple existing records for the demo metric; refusing writes')
    for old in matching_metric:
        if not any(sample_matches(old, sample) for sample in SAMPLES):
            raise DemoError('An existing demo metric observation differs from fixed synthetic fixture; refusing writes')
    missing = [s for s in SAMPLES if not any(sample_matches(o, s) for o in matching_metric)]
    if not missing:
        print('BOTH_SYNTHETIC_FIXTURES_ALREADY_PRESENT=YES; no insert performed')
        return
    print('ABOUT_TO_SUBMIT_SYNTHETIC_RECORDS=', len(missing))
    print('Not an inspection, action, resource allocation, safety assertion or real-world outcome.')
    for sample in missing:
        print(sample['phase'], sample['observedAt'], 'synthetic value=', sample['value'], 'unit=branches')
    if prompt('Type exactly SUBMIT SYNTHETIC DEMO03 to create these records: ') != 'SUBMIT SYNTHETIC DEMO03':
        raise DemoError('Submission cancelled before creating any additional observation')
    for sample in missing:
        payload = {'twinId': TWIN_ID, 'metricCode': METRIC, 'metricLabel': METRIC_LABEL,
                   'unit': 'شاخه - مصنوعی', 'value': sample['value'], 'observedAt': sample['observedAt'],
                   'sourceReference': SOURCE,
                   'note': f"SYNTHETIC_DEMO | {sample['phase']} | Computer-generated acceptance fixture, not field evidence. No verified action between timestamps."}
        result = api.request('POST', base_path + '/twin-observations', payload)
        o = result.get('observation', {}) if isinstance(result, dict) else {}
        if not isinstance(o, dict) or o.get('review_status') != 'SUBMITTED':
            raise DemoError('POST returned unexpected status; inspect GET before retrying')
        print('SUBMITTED=', o.get('id'), 'status=SUBMITTED')
    print('NEXT=Run review mode as a separate qualified human account; do not claim impact')


def review(api, base_path, role, user):
    if role not in REVIEW_ROLES:
        raise DemoError('Reviewer must have MUNICIPAL_ADMIN or DEPUTY role')
    existing = observations(api, base_path)
    found = [o for o in existing if o.get('metric_code') == METRIC
             and str(o.get('source_reference', '')).startswith('SYNTHETIC_DEMO')]
    if len(found) != 2 or not all(any(sample_matches(o, s) for o in found) for s in SAMPLES):
        raise DemoError('Both exact synthetic test fixtures must be present before review; refusing')
    for o in sorted(found, key=lambda x: x.get('observed_at', '')):
        print('\nREVIEW ID=', o.get('id'))
        print('UTC=', o.get('observed_at'), '; synthetic value=', o.get('measured_value'),
              '; unit=', o.get('unit'), '; review_status=', o.get('review_status'))
        print('REFERENCE=', o.get('source_reference'))
        print('NOTE=', o.get('note'))
        if o.get('created_by') == user['id']:
            raise DemoError('Reviewer is the same actor as creator; independent review prohibited')
        if o.get('review_status') != 'SUBMITTED':
            print('ALREADY_REVIEWED=YES; skipping')
            continue
        decision = prompt('Decision: ACCEPT, REJECT, or SKIP: ').upper()
        if decision == 'SKIP':
            continue
        if decision not in ('ACCEPT', 'REJECT'):
            raise DemoError('Unknown decision; no review write performed')
        note = prompt('Review evidence/limitations in one line (25-1000 characters, no secrets): ')
        if not 25 <= len(note.strip()) <= 1000:
            raise DemoError('Review note must be 25-1000 characters; no review written')
        print('Warning: ACCEPT means review of declared synthetic fixture only; NOT verified public value.')
        expected = f'{decision} DEMO03 {str(o["id"])[:8]}'
        if prompt(f'Type exactly {expected} to record this decision: ') != expected:
            raise DemoError('Decision cancelled; no additional review written')
        result = api.request('PATCH', base_path + '/twin-observations/' + str(o['id']),
                             {'decision': decision, 'note': note})
        new_o = result.get('observation', {}) if isinstance(result, dict) else {}
        if new_o.get('review_status') != ('ACCEPTED' if decision == 'ACCEPT' else 'REJECTED'):
            raise DemoError('Unexpected review response; check GET before retrying')
        print('REVIEW_RECORDED=', o['id'], '; status=', new_o['review_status'])
    print('NEXT=Run original read-only Stage 5 Evidence Gate')


def main():
    ap = argparse.ArgumentParser(description='DEMO-03 synthetic observations via official RHF City OS API')
    ap.add_argument('action', choices=['preflight', 'submit', 'review'])
    ap.add_argument('--base', default='http://127.0.0.1:3210', help='Loopback operational API origin')
    ap.add_argument('--username', help='Existing authorized user account; prompts if omitted')
    args = ap.parse_args()
    api = API(validate_base(args.base))
    health = api.request('GET', '/healthz')
    print('LOCAL_HEALTH=', health.get('status') if isinstance(health, dict) else '<unknown>')
    username = args.username or prompt('Existing authorized username: ')
    if not username:
        raise DemoError('No username entered')
    user = api.login(username)
    base_path, role = scope(api)
    if args.action == 'preflight':
        preflight(api, base_path)
    elif args.action == 'submit':
        submit(api, base_path, role)
    else:
        review(api, base_path, role, user)
    print('REAL_PUBLIC_VALUE_VERIFIED=NO')
    print('FLEET_LIVE_VERIFIED=NO')


if __name__ == '__main__':
    try:
        main()
    except DemoError as e:
        print('STAGE5_DEMO03_STOPPED=', str(e), file=sys.stderr)
        sys.exit(2)
