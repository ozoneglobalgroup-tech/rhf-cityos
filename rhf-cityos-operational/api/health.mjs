const port=process.env.PORT||3210;
try { const r=await fetch(`http://127.0.0.1:${port}/healthz`,{signal:AbortSignal.timeout(2000)});if(!r.ok)process.exit(1); }catch{process.exit(1)}
