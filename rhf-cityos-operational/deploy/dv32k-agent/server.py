"""Internal-only, authenticated LangGraph endpoint. No host port exposed in Compose."""
import os,json,hmac
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from engine import build_graph,analyze
SECRET=os.environ.get('DV32K_BRIDGE_SECRET','')
if len(SECRET)!=64 or any(c not in '0123456789abcdef' for c in SECRET):
    raise SystemExit('DV32K_SECRET_INVALID')
GRAPH=build_graph()   # Fail startup if real LangGraph is absent or incompatible.
class Handler(BaseHTTPRequestHandler):
    def respond(self,status,obj):
        data=json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode('utf8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)))
        self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if self.path!='/healthz':return self.respond(404,{'error':'NOT_FOUND'})
        return self.respond(200,{'status':'ok','service':'DV32K_LANGGRAPH','framework':'LangGraph','nonExecuting':True})
    def do_POST(self):
        if self.path!='/analyze':return self.respond(404,{'error':'NOT_FOUND'})
        incoming=self.headers.get('X-RHF-DV32K-Bridge','')
        if not hmac.compare_digest(incoming,SECRET):return self.respond(401,{'error':'UNAUTHORIZED'})
        if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json':return self.respond(415,{'error':'JSON_REQUIRED'})
        try:n=int(self.headers.get('Content-Length',''))
        except ValueError:return self.respond(411,{'error':'CONTENT_LENGTH_REQUIRED'})
        if n<=0 or n>16384:return self.respond(413,{'error':'INPUT_SIZE_LIMIT'})
        try:
            raw=self.rfile.read(n)
            p=json.loads(raw)
            result=analyze(GRAPH,p)
        except (ValueError,TypeError,UnicodeDecodeError):return self.respond(422,{'error':'INVALID_BOUNDED_EVIDENCE'})
        except Exception:
            # Do not leak internal stack trace, tokens, tenant data or input content.
            self.log_error('DV32K_GRAPH_FAILURE')
            return self.respond(503,{'error':'ANALYSIS_UNAVAILABLE'})
        return self.respond(200,result)
    def do_PUT(self):return self.respond(405,{'error':'READ_ONLY_GRAPH'})
    def do_PATCH(self):return self.respond(405,{'error':'READ_ONLY_GRAPH'})
    def do_DELETE(self):return self.respond(405,{'error':'READ_ONLY_GRAPH'})
    def log_message(self,fmt,*args):pass
if __name__=='__main__':
    ThreadingHTTPServer(('0.0.0.0',3225),Handler).serve_forever(poll_interval=0.25)
